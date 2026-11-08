#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');
const localVercel = path.join(scriptDir, 'node_modules', '.bin', process.platform === 'win32' ? 'vercel.cmd' : 'vercel');
const localRender = path.join(scriptDir, '.tools', 'bin', process.platform === 'win32' ? 'render.exe' : 'render');
const vercelProjectFile = path.join(frontend, '.vercel', 'project.json');
let agentMode = false;

class NeedsInputError extends Error {
  constructor(readonly code: string, message: string, readonly details: Record<string, unknown> = {}) {
    super(message);
  }
}

function agentEvent(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
}

function run(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function exists(file: string) {
  try { await access(file); return true; } catch { return false; }
}

function isRenderNetworkError(detail: string) {
  return /api\.render\.com|lookup .*:53|no such host|connection refused|ENOTFOUND/i.test(detail);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function resolveRender(): Promise<string | undefined> {
  if (await exists(localRender)) return localRender;
  const paths = (process.env.PATH ?? '').split(path.delimiter);
  for (const dir of paths) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'render.exe' : 'render');
    if (await exists(candidate)) return candidate;
  }
}

async function targetRenderServiceName() {
  const override = process.env.RENDER_SERVICE_NAME?.trim();
  if (override) return override;
  const yaml = await readFile(path.join(backend, 'render.yaml'), 'utf8');
  const match = yaml.match(/^\s*-\s*type:\s*web\s*\r?\n\s+name:\s*([^#\r\n]+)/m);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || 'orbit-backend';
}

async function capture(command: string, args: string[], cwd: string, stdinText?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: [stdinText === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'], env: process.env, shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    if (stdinText !== undefined) child.stdin.end(stdinText);
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function curlConfigValue(value: string) {
  if (/[\r\n]/.test(value)) throw new Error('RENDER_API_KEY possui caracteres inválidos.');
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function renderApiRequest(endpoint: string, method = 'GET', body?: unknown) {
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) throw new NeedsInputError('render_api_key_missing', 'Defina RENDER_API_KEY para usar a conexão HTTP direta com o Render.');
  const url = `https://api.render.com/v1/${endpoint.replace(/^\//, '')}`;
  const config = [
    `url = "${curlConfigValue(url)}"`,
    `request = "${method}"`,
    'silent',
    'show-error',
    'fail-with-body',
    'header = "Accept: application/json"',
    `header = "Authorization: Bearer ${curlConfigValue(apiKey)}"`,
    ...(body === undefined ? [] : ['header = "Content-Type: application/json"']),
  ].join('\n') + '\n';
  const args = ['--config', '-', '--connect-timeout', '10'];
  if (method === 'GET') args.push('--retry', '2', '--retry-connrefused');
  if (body !== undefined) args.push('--data-binary', JSON.stringify(body));
  const result = await capture('curl', args, root, config);
  if (result.code !== 0) {
    const detail = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join(' | ') || `código ${result.code}`;
    if (/\b401\b|unauthorized|invalid api key/i.test(detail)) throw new NeedsInputError('render_auth_required', 'A chave Render foi rejeitada. Configure RENDER_API_KEY com uma chave válida.');
    if (/\b403\b|insufficient_token_scope/i.test(detail)) throw new NeedsInputError('render_permission_denied', 'A chave Render não tem permissão para listar ou publicar neste serviço.');
    const githubRepositoryId = detail.match(/api\.github\.com\/repositories\/(\d+)/i)?.[1];
    if (githubRepositoryId) {
      throw new NeedsInputError(
        'render_github_repository_unavailable',
        `O serviço está listado no Render, mas o Render não consegue acessar o repositório GitHub (ID ${githubRepositoryId}). Confira se o repositório ainda existe e reconecte a integração GitHub do serviço no Render.`,
        { repositoryId: githubRepositoryId },
      );
    }
    if (/\b404\b/.test(detail)) {
      const safeDetail = detail.replaceAll(apiKey, '[redacted]').slice(0, 500);
      throw new Error(`Render API respondeu HTTP 404 em ${method} /v1/${endpoint}: ${safeDetail}`);
    }
    throw new Error(`Render API HTTP request falhou: ${detail}`);
  }
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error('Render API retornou JSON inválido.');
  }
}

async function listRenderServices() {
  const services: unknown[] = [];
  const seenCursors = new Set<string>();
  let cursor = '';
  for (let page = 0; page < 100; page += 1) {
    const endpoint = `services?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const result = await renderApiRequest(endpoint);
    if (!Array.isArray(result)) throw new Error('Render API não retornou uma lista de serviços.');
    services.push(...result);
    const last = result.at(-1);
    const nextCursor = last && typeof last === 'object' && 'cursor' in last && typeof last.cursor === 'string' ? last.cursor : '';
    if (!nextCursor || seenCursors.has(nextCursor)) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    if (agentMode) agentEvent({ type: 'resource_lookup', status: 'page_loaded', provider: 'render', page: page + 1, service_count: services.length });
  }
  return services;
}

function progressBar(completed: number, total: number) {
  const width = 20;
  const filled = total ? Math.round((completed / total) * width) : width;
  const percent = total ? Math.floor((completed / total) * 100) : 100;
  const bar = `${chalk.cyan('█'.repeat(filled))}${chalk.gray('░'.repeat(width - filled))}`;
  return `${bar} ${chalk.bold(String(percent).padStart(3))}% ${chalk.gray(`(${completed}/${total} etapas)`)}`;
}

class Progress {
  private completed = 0;

  constructor(private readonly labels: string[], private readonly agent = false) {}

  private status(label: string, activity?: string) {
    const line = `${progressBar(this.completed, this.labels.length)}  ${chalk.white(label)}`;
    return activity ? `${line}\n${chalk.gray(`  ↳ ${activity}`)}` : line;
  }

  async run(label: string, command: string, args: string[], cwd: string) {
    const stepIndex = this.completed + 1;
    if (this.agent) agentEvent({ type: 'step', status: 'started', name: label, index: stepIndex, total: this.labels.length });
    else p.log.step(chalk.bold(label));
    const spin = this.agent ? undefined : ora({ text: this.status(label), color: 'cyan' }).start();
    let output = '';

    const result = await new Promise<{ code: number; output: string }>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: process.env,
        shell: process.platform === 'win32',
        stdio: ['inherit', 'pipe', 'pipe'],
      });
      const collect = (stream: 'stdout' | 'stderr', chunk: Buffer) => {
        const text = chunk.toString();
        output = `${output}${text}`.slice(-256_000);
        const lines = text.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/).filter(Boolean);
        const activity = lines.at(-1);
        if (this.agent) {
          for (const line of lines) agentEvent({ type: 'log', step: label, stream, message: line });
        } else if (activity && spin) {
          const width = Math.max(24, (process.stdout.columns ?? 80) - 8);
          spin.text = this.status(label, activity.slice(0, width));
        }
      };
      child.stdout.on('data', (chunk: Buffer) => collect('stdout', chunk));
      child.stderr.on('data', (chunk: Buffer) => collect('stderr', chunk));
      child.once('error', reject);
      child.once('close', (code) => resolve({ code: code ?? 1, output }));
    }).catch((error: unknown) => {
      if (spin) spin.fail(`${label} não iniciou`);
      else agentEvent({ type: 'step', status: 'failed', name: label, index: stepIndex, total: this.labels.length });
      throw error;
    });

    if (result.code !== 0) {
      if (spin) {
        spin.fail(`${label} falhou`);
        if (result.output) process.stderr.write(result.output);
      } else {
        agentEvent({ type: 'step', status: 'failed', name: label, index: stepIndex, total: this.labels.length });
      }
      throw new Error(`${label} terminou com código ${result.code}`);
    }

    this.completed += 1;
    if (spin) spin.succeed(`${progressBar(this.completed, this.labels.length)}  ${label}`);
    else agentEvent({ type: 'step', status: 'completed', name: label, completed: this.completed, total: this.labels.length, percent: Math.floor((this.completed / this.labels.length) * 100) });
  }

  async runLive(label: string, command: string, args: string[], cwd: string) {
    if (this.agent) {
      const stepIndex = this.completed + 1;
      agentEvent({ type: 'step', status: 'started', name: label, index: stepIndex, total: this.labels.length });
      let stderr = '';
      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env, shell: process.platform === 'win32' });
        const forward = (stream: 'stdout' | 'stderr', chunk: Buffer) => {
          const lines = chunk.toString().replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/).filter(Boolean);
          if (stream === 'stderr') stderr += `${lines.join('\n')}\n`;
          for (const line of lines) agentEvent({ type: 'log', step: label, stream, message: line });
        };
        child.stdout.on('data', (chunk: Buffer) => forward('stdout', chunk));
        child.stderr.on('data', (chunk: Buffer) => forward('stderr', chunk));
        child.once('error', reject);
        child.once('close', (status) => resolve(status ?? 1));
      });
      if (code !== 0) {
        agentEvent({ type: 'step', status: 'failed', name: label, index: stepIndex, total: this.labels.length });
        if (isRenderNetworkError(stderr)) {
          throw new Error('O Render CLI não conseguiu acessar api.render.com por falha de DNS/rede. Verifique a conectividade e tente novamente.');
        }
        throw new Error(`${label} terminou com código ${code}`);
      }
      this.completed += 1;
      agentEvent({ type: 'step', status: 'completed', name: label, completed: this.completed, total: this.labels.length, percent: Math.floor((this.completed / this.labels.length) * 100) });
      return;
    }

    p.log.step(chalk.bold(label));
    p.log.info(this.status(label));
    let stderr = '';
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn(command, args, { cwd, stdio: ['inherit', 'inherit', 'pipe'], env: process.env, shell: process.platform === 'win32' });
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
        stderr += chunk;
        process.stderr.write(chunk);
      });
      child.once('error', reject);
      child.once('close', (status) => resolve(status ?? 1));
    });
    if (code !== 0) {
      if (isRenderNetworkError(stderr)) {
        throw new Error('O Render CLI não conseguiu acessar api.render.com por falha de DNS/rede. Verifique a conectividade e a resolução DNS do dispositivo antes de tentar novamente.');
      }
      throw new Error(`${label} terminou com código ${code}`);
    }
    this.completed += 1;
    p.log.success(this.status(label));
  }

  async runRenderApiDeploy(serviceId: string) {
    const label = 'Publicar backend no Render';
    const stepIndex = this.completed + 1;
    if (this.agent) agentEvent({ type: 'step', status: 'started', name: label, index: stepIndex, total: this.labels.length });
    else p.log.step(chalk.bold(label));
    const spinner = this.agent ? undefined : ora({ text: this.status(label, 'Enviando solicitação ao Render…'), color: 'cyan' }).start();

    try {
      const created = await renderApiRequest(`services/${encodeURIComponent(serviceId)}/deploys`, 'POST', { clearCache: 'do_not_clear' });
      const wrapped = created && typeof created === 'object' && 'deploy' in created ? created.deploy : created;
      if (!wrapped || typeof wrapped !== 'object' || !('id' in wrapped) || typeof wrapped.id !== 'string') {
        throw new Error('O Render aceitou a solicitação, mas não retornou o ID do deploy.');
      }
      const deployId = wrapped.id;
      const createdStatus = 'status' in wrapped && typeof wrapped.status === 'string' ? wrapped.status : 'created';
      if (this.agent) agentEvent({ type: 'deploy', provider: 'render', status: createdStatus, serviceId, deployId });
      else if (spinner) spinner.text = this.status(label, `Deploy ${deployId} iniciado (${createdStatus})`);

      const successStatuses = new Set(['live', 'succeeded', 'successful']);
      const failureStatuses = new Set(['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'cancelled', 'deactivated']);
      let lastStatus = createdStatus;
      const deadline = Date.now() + 120 * 60 * 1000;
      while (!successStatuses.has(lastStatus)) {
        if (failureStatuses.has(lastStatus)) throw new Error(`O deploy Render terminou no estado ${lastStatus}.`);
        if (Date.now() >= deadline) throw new Error('Tempo limite aguardando a conclusão do deploy Render (120 minutos).');
        await wait(5000);
        const current = await renderApiRequest(`services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deployId)}`);
        const deploy = current && typeof current === 'object' && 'deploy' in current ? current.deploy : current;
        if (!deploy || typeof deploy !== 'object' || !('status' in deploy) || typeof deploy.status !== 'string') {
          throw new Error('O Render retornou um estado de deploy desconhecido.');
        }
        if (deploy.status !== lastStatus) {
          lastStatus = deploy.status;
          if (this.agent) agentEvent({ type: 'deploy', provider: 'render', status: lastStatus, serviceId, deployId });
          else if (spinner) spinner.text = this.status(label, `Deploy ${deployId}: ${lastStatus}`);
        }
      }
      this.completed += 1;
      if (spinner) spinner.succeed(`${progressBar(this.completed, this.labels.length)}  ${label}`);
      else agentEvent({ type: 'step', status: 'completed', name: label, completed: this.completed, total: this.labels.length, deployId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!(error instanceof NeedsInputError && error.code === 'render_github_repository_unavailable') && /HTTP 404 em POST \/v1\/services\/[^/\s]+\/deploys:/.test(message)) {
        const render = await resolveRender();
        if (render) {
          if (this.agent) agentEvent({ type: 'fallback', provider: 'render', from: 'rest_api', to: 'render_cli', reason: 'http_404' });
          else spinner?.fail('A API respondeu 404; tentando pelo Render CLI');
          try {
            await this.runLive(label, render, ['deploys', 'create', serviceId, '--wait', '--confirm'], root);
            return;
          } catch (fallbackError) {
            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            if (this.agent) agentEvent({ type: 'step', status: 'failed', name: label, index: stepIndex, total: this.labels.length });
            else p.log.error(`Fallback pelo Render CLI também falhou: ${fallbackMessage}`);
            throw new Error(`${message}\nFallback pelo Render CLI também falhou: ${fallbackMessage}`);
          }
        }
      }
      if (spinner) spinner.fail(`${label} falhou`);
      else agentEvent({ type: 'step', status: 'failed', name: label, index: stepIndex, total: this.labels.length });
      throw error;
    }
  }
}

function centered(text: string, width: number) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return `${' '.repeat(padding)}${text}`;
}

function showBanner() {
  const width = process.stdout.columns ?? 80;
  const art = figlet.textSync('ORBIT', { font: 'ANSI Shadow', horizontalLayout: 'fitted' });
  for (const line of art.split(/\r?\n/)) {
    if (line.trim()) console.log(`${' '.repeat(Math.max(0, Math.floor((width - line.length) / 2)))}${gradient(['#38bdf8', '#818cf8', '#e879f9'])(line)}`);
  }
  console.log(chalk.gray(centered('DEPLOY CENTER  /  RENDER + VERCEL', width)));
  console.log('');
}

async function readVercelProject(createFromEnvironment = false) {
  try {
    const config = JSON.parse(await readFile(vercelProjectFile, 'utf8')) as { projectId?: string; projectName?: string; orgId?: string };
    if (config.projectId) return config;
  } catch {
    // O link local pode não existir; nesse caso o Vercel CLI oferece a seleção do projeto.
  }
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const orgId = process.env.VERCEL_ORG_ID?.trim();
  if (projectId && orgId) {
    const config = { projectId, orgId };
    if (createFromEnvironment) {
      await mkdir(path.dirname(vercelProjectFile), { recursive: true });
      await writeFile(vercelProjectFile, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    }
    return config;
  }
  return undefined;
}

async function lookupRenderServiceId(render: string): Promise<string | undefined> {
  const configuredId = process.env.RENDER_SERVICE_ID?.trim();
  if (configuredId && !/^srv-[a-zA-Z0-9_-]+$/.test(configuredId)) throw new Error('RENDER_SERVICE_ID precisa estar no formato srv-…');

  if (agentMode) agentEvent({ type: 'resource_lookup', status: 'started', provider: 'render', target: 'backend/render.yaml' });
  const search = agentMode ? undefined : ora({ text: 'Buscando serviços no workspace Render autenticado…', color: 'cyan' }).start();
  let rows: unknown;
  if (process.env.RENDER_API_KEY) {
    try {
      if (search) search.text = 'Consultando serviços pela API do Render…';
      rows = await listRenderServices();
    } catch (error) {
      if (search) search.fail('A consulta à API do Render falhou');
      else agentEvent({ type: 'resource_lookup', status: 'failed', provider: 'render', reason: isRenderNetworkError(String(error)) ? 'network_error' : 'api_error' });
      throw error;
    }
  } else {
    let listing: Awaited<ReturnType<typeof capture>> | undefined;
    let launchError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        listing = await capture(render, ['services', '--output', 'json', '--confirm'], root);
        launchError = undefined;
        if (listing.code === 0 || !isRenderNetworkError(`${listing.stderr}\n${listing.stdout}`) || attempt === 3) break;
        if (search) search.text = `Falha de rede; nova tentativa ${attempt + 1}/3…`;
        else agentEvent({ type: 'resource_lookup', status: 'retrying', provider: 'render', attempt: attempt + 1, total: 3, reason: 'network_error' });
      } catch (error) {
        launchError = error;
        break;
      }
      await wait(attempt * 1000);
    }
    if (!listing) {
      if (search) search.fail('Não foi possível consultar o Render CLI');
      else agentEvent({ type: 'resource_lookup', status: 'failed', provider: 'render', reason: 'cli_unavailable' });
      throw launchError instanceof Error ? launchError : new Error('Não foi possível iniciar o Render CLI.');
    }
    if (listing.code !== 0) {
      const detail = `${listing.stderr}\n${listing.stdout}`;
      if (isRenderNetworkError(detail)) {
        if (search) search.fail('A consulta ao Render falhou por DNS/rede');
        else agentEvent({ type: 'resource_lookup', status: 'failed', provider: 'render', reason: 'network_error' });
        throw new Error('Não foi possível consultar o Render por uma falha de DNS/rede. Verifique a conexão e a resolução de api.render.com e tente novamente. A busca do ID foi interrompida antes dos builds.');
      }
      if (search) search.fail('Não foi possível listar os serviços Render');
      else agentEvent({ type: 'resource_lookup', status: 'failed', provider: 'render', reason: 'authentication_or_api_error' });
      throw new NeedsInputError('render_auth_required', `Não foi possível listar os serviços do Render. Configure RENDER_API_KEY ou autentique com render login. ${listing.stderr.trim()}`);
    }
    try {
      rows = JSON.parse(listing.stdout);
    } catch {
      if (search) search.fail('O Render CLI não retornou JSON válido');
      else agentEvent({ type: 'resource_lookup', status: 'failed', provider: 'render', reason: 'invalid_json' });
      throw new Error('O Render CLI não retornou JSON válido ao listar os serviços.');
    }
  }
  const services = Array.isArray(rows)
    ? rows.map((row) => (row && typeof row === 'object' && 'service' in row ? row.service : row))
        .filter((service): service is { id: string; name: string; type?: string } => !!service && typeof service === 'object' && 'id' in service && typeof service.id === 'string' && 'name' in service && typeof service.name === 'string')
    : [];
  const targetName = await targetRenderServiceName();
  const matches = services.filter((service) => service.name.toLowerCase() === targetName.toLowerCase() && service.type === 'web_service');
  const webServices = services.filter((service) => service.type === 'web_service');
  if (search) search.succeed(`Busca concluída: ${services.length} serviço(s) no workspace.`);
  else agentEvent({ type: 'resource_lookup', status: 'completed', provider: 'render', service_count: services.length });

  if (configuredId) {
    if (process.env.RENDER_API_KEY && !services.some((service) => service.id === configuredId)) {
      throw new NeedsInputError('render_service_id_unavailable', 'RENDER_SERVICE_ID não aparece entre os serviços acessíveis pela RENDER_API_KEY. Confira o ID, a chave e o workspace.');
    }
    if (agentMode) agentEvent({ type: 'resource', provider: 'render', source: 'RENDER_SERVICE_ID', id: configuredId });
    else p.log.info('Usando o ID definido em RENDER_SERVICE_ID.');
    return configuredId;
  }

  if (matches.length === 1) {
    if (agentMode) agentEvent({ type: 'resource', provider: 'render', source: 'workspace_lookup', name: matches[0].name, id: matches[0].id });
    else p.log.success(`Serviço Render encontrado automaticamente: ${matches[0].name} (${matches[0].id}).`);
    return matches[0].id;
  }
  if (matches.length > 1) {
    if (agentMode) throw new NeedsInputError('render_service_id_ambiguous', `Mais de um serviço chamado ${targetName} foi encontrado no workspace. Defina RENDER_SERVICE_ID.`, { candidates: matches.map(({ name, id }) => ({ name, id })) });
    const selected = await p.select({
      message: `Encontrei mais de um serviço chamado ${targetName}. Qual usar?`,
      options: matches.map((service) => ({ value: service.id, label: service.name, hint: service.id })),
    });
    return p.isCancel(selected) ? undefined : selected;
  }

  if (webServices.length === 1) {
    if (agentMode) agentEvent({ type: 'resource', provider: 'render', source: 'single_web_service_fallback', name: webServices[0].name, id: webServices[0].id });
    else p.log.success(`Usando o único serviço web acessível: ${webServices[0].name} (${webServices[0].id}).`);
    return webServices[0].id;
  }
  if (webServices.length > 1) {
    if (agentMode) throw new NeedsInputError('render_service_id_ambiguous', `Não encontrei ${targetName}, mas há vários serviços web. Defina RENDER_SERVICE_ID ou RENDER_SERVICE_NAME.`, { candidates: webServices.map(({ name, id }) => ({ name, id })) });
    const selected = await p.select({
      message: `Não encontrei ${targetName}. Selecione o serviço web do backend:`,
      options: webServices.map((service) => ({ value: service.id, label: service.name, hint: service.id })),
    });
    return p.isCancel(selected) ? undefined : selected;
  }

  if (agentMode) throw new NeedsInputError('render_service_id_missing', `Não encontrei o serviço ${targetName}. Defina RENDER_SERVICE_ID ou RENDER_SERVICE_NAME.`, { serviceName: targetName });
  p.log.warn(`Nenhum serviço chamado ${targetName} foi encontrado no workspace Render ativo.`);
  const value = await p.text({
    message: 'Informe o ID do serviço Render (srv-…)',
    placeholder: 'srv-…',
    defaultValue: '',
    validate(input) {
      if (!/^srv-[a-zA-Z0-9_-]+$/.test(input.trim())) return 'Informe um ID Render no formato srv-…';
      if (process.env.RENDER_API_KEY && !services.some((service) => service.id === input.trim())) return 'Esse ID não aparece nos serviços acessíveis pela RENDER_API_KEY.';
    },
  });
  return p.isCancel(value) ? undefined : value.trim();
}

async function prepareRender() {
  let render = await resolveRender();
  let shouldInstall = false;
  if (!render && process.env.RENDER_API_KEY) return { render: 'render-api', shouldInstall };
  if (!render) {
    const install = await p.confirm({ message: 'Render CLI não encontrado. Baixar o binário oficial para scripts/.tools/bin?' });
    if (p.isCancel(install) || !install) return;
    shouldInstall = true;
    render = localRender;
  }
  return { render, shouldInstall };
}

type AgentTarget = 'backend' | 'frontend' | 'all';

interface AgentOptions {
  target: AgentTarget;
  yes: boolean;
  dryRun: boolean;
}

function printHelp(json = false) {
  const usage = 'bash scripts/deploy.sh --agent (--backend|--frontend|--all) (--yes|--dry-run)';
  if (json) agentEvent({ type: 'help', usage, env: ['RENDER_API_KEY ou render login', 'RENDER_SERVICE_ID (opcional; detectado automaticamente)', 'VERCEL_TOKEN ou vercel login', 'VERCEL_PROJECT_ID + VERCEL_ORG_ID se frontend/.vercel/project.json não existir'] });
  else console.log(`${usage}\n\n--agent       modo sem prompts com eventos JSONL\n--backend     deploy do backend\n--frontend    deploy do frontend\n--all         deploy dos dois projetos\n--yes         autoriza builds e publicação em produção\n--dry-run     valida alvos e exibe plano sem build/deploy\n--help        exibe esta ajuda`);
}

function parseAgentOptions(argv: string[]): AgentOptions {
  const targetFlags = argv.filter((arg) => ['--backend', '--frontend', '--all'].includes(arg));
  if (targetFlags.length !== 1) throw new NeedsInputError('target_required', 'Escolha exatamente um alvo: --backend, --frontend ou --all.');
  const unknown = argv.filter((arg) => !['--agent', '--backend', '--frontend', '--all', '--yes', '--dry-run'].includes(arg));
  if (unknown.length) throw new NeedsInputError('unknown_argument', `Argumento(s) não reconhecido(s): ${unknown.join(', ')}`);
  if (argv.includes('--yes') === argv.includes('--dry-run')) {
    throw new NeedsInputError('mode_required', 'Use --yes para executar ou --dry-run para validar sem publicar.');
  }
  const target = targetFlags[0] === '--all' ? 'all' : targetFlags[0].slice(2) as 'backend' | 'frontend';
  return { target, yes: argv.includes('--yes'), dryRun: argv.includes('--dry-run') };
}

async function mainAgent(options: AgentOptions) {
  agentMode = true;
  const targets = options.target === 'all' ? ['backend', 'frontend'] : [options.target];
  agentEvent({ type: 'run', status: 'started', mode: options.dryRun ? 'dry-run' : 'deploy', targets });

  let render: string | undefined;
  let serviceId: string | undefined;
  let vercelProject: Awaited<ReturnType<typeof readVercelProject>>;

  if (targets.includes('backend')) {
    render = await resolveRender();
    if (!render && !process.env.RENDER_API_KEY) {
      if (options.dryRun) throw new NeedsInputError('render_cli_missing', 'Render CLI ausente. Instale-o com npm run install-render em scripts/.');
      render = localRender;
      const installer = new Progress(['Instalar Render CLI'], true);
      await installer.run('Instalar Render CLI oficial', 'sh', [path.join(scriptDir, 'install-render.sh')], root);
    }
    serviceId = await lookupRenderServiceId(render ?? 'render-api');
    if (!serviceId) throw new NeedsInputError('render_service_id_missing', 'Nenhum ID de serviço Render foi selecionado.');
  }

  if (targets.includes('frontend')) {
    if (!await exists(localVercel)) throw new NeedsInputError('vercel_cli_missing', 'Vercel CLI local ausente. Execute npm ci em scripts/.');
    vercelProject = await readVercelProject(!options.dryRun);
    if (!vercelProject) {
      throw new NeedsInputError('vercel_project_unlinked', 'Vincule o frontend com `vercel link` ou defina VERCEL_PROJECT_ID e VERCEL_ORG_ID.', { required: ['VERCEL_PROJECT_ID', 'VERCEL_ORG_ID'] });
    }
    agentEvent({ type: 'resource', provider: 'vercel', source: process.env.VERCEL_PROJECT_ID ? 'environment' : 'frontend/.vercel/project.json', projectName: vercelProject.projectName, projectId: vercelProject.projectId });
  }

  const plan = [
    ...(targets.includes('backend') ? ['Instalar dependências do backend', 'Compilar backend', 'Publicar backend no Render'] : []),
    ...(targets.includes('frontend') ? ['Instalar dependências do frontend', 'Compilar frontend', 'Publicar frontend na Vercel'] : []),
  ];
  if (options.dryRun) {
    agentEvent({ type: 'plan', status: 'validated', targets, renderServiceId: serviceId, vercelProjectId: vercelProject?.projectId, steps: plan });
    agentEvent({ type: 'run', status: 'succeeded', mode: 'dry-run' });
    return;
  }

  const progress = new Progress(plan, true);
  if (targets.includes('backend') && render && serviceId) {
    await progress.run('Instalar dependências do backend', 'bun', ['install', '--frozen-lockfile'], backend);
    await progress.run('Compilar backend', 'bun', ['run', 'build'], backend);
    if (process.env.RENDER_API_KEY) await progress.runRenderApiDeploy(serviceId);
    else await progress.runLive('Publicar backend no Render', render, ['deploys', 'create', serviceId, '--wait', '--confirm'], root);
  }
  if (targets.includes('frontend')) {
    await progress.run('Instalar dependências do frontend', 'npm', ['ci'], frontend);
    await progress.run('Compilar frontend', 'npm', ['run', 'build'], frontend);
    await progress.runLive('Publicar frontend na Vercel', localVercel, ['deploy', '--prod', '--yes'], frontend);
  }
  agentEvent({ type: 'run', status: 'succeeded', targets });
}

async function mainInteractive() {
  showBanner();
  p.intro(chalk.cyan('Deploy interativo • etapas e progresso em tempo real'));

  const action = await p.select({
    message: 'O que você deseja fazer?',
    options: [
      { value: 'both', label: 'Deploy completo', hint: 'Backend no Render + frontend na Vercel' },
      { value: 'frontend', label: 'Frontend', hint: 'Build + deploy de produção na Vercel' },
      { value: 'backend', label: 'Backend', hint: 'Build + deploy do serviço no Render' },
      { value: 'tools', label: 'Verificar CLIs', hint: 'Versões locais do Render e Vercel' },
      { value: 'exit', label: 'Sair' },
    ],
  });
  if (p.isCancel(action) || action === 'exit') return p.outro('Até a próxima.');

  try {
    if (action === 'tools') {
      const render = await resolveRender();
      if (render) {
        p.log.info('Render CLI:');
        await run(render, ['--version'], root);
      } else {
        p.log.warn('Render CLI ausente. Use scripts/install-render.sh.');
      }
      if (await exists(localVercel)) {
        p.log.info('Vercel CLI:');
        await run(localVercel, ['--version'], frontend);
      } else {
        p.log.warn('Vercel CLI ausente. Execute npm ci em scripts/.');
      }
      return p.outro('Verificação concluída.');
    }

    let deployBackend = action === 'backend' || action === 'both';
    const deployFrontend = action === 'frontend' || action === 'both';
    let render: string | undefined;
    let shouldInstallRender = false;
    let serviceId = '';

    if (deployBackend) {
      const setup = await prepareRender();
      if (!setup) deployBackend = false;
      else {
        render = setup.render;
        shouldInstallRender = setup.shouldInstall;
        if (shouldInstallRender) {
          p.log.warn('O serviço será identificado após a instalação do Render CLI.');
        } else {
          const selectedId = await lookupRenderServiceId(render);
          if (selectedId === undefined) deployBackend = false;
          else serviceId = selectedId;
        }
        if (deployBackend) {
          const confirmed = await p.confirm({ message: 'Autorizar o build e o deploy do backend no Render?', initialValue: false });
          deployBackend = !p.isCancel(confirmed) && confirmed;
        }
      }
    }

    let publishFrontend = deployFrontend;
    if (publishFrontend) {
      if (!await exists(localVercel)) throw new Error('Vercel CLI local ausente. Execute npm ci em scripts/.');
      const linkedProject = await readVercelProject();
      if (linkedProject) p.log.info(`Projeto Vercel vinculado: ${linkedProject.projectName ?? linkedProject.projectId}.`);
      else p.log.info('Projeto Vercel sem vínculo local; o CLI oferecerá a seleção pela conta autenticada.');
      const confirmed = await p.confirm({ message: 'Autorizar o build e o deploy de produção do frontend na Vercel?', initialValue: false });
      publishFrontend = !p.isCancel(confirmed) && confirmed;
    }

    const steps = [
      ...(deployBackend && shouldInstallRender ? ['Instalar Render CLI'] : []),
      ...(deployBackend ? ['Instalar dependências do backend', 'Compilar backend', 'Publicar backend no Render'] : []),
      ...(publishFrontend ? ['Instalar dependências do frontend', 'Compilar frontend', 'Publicar frontend na Vercel'] : []),
    ];
    if (!steps.length) return p.outro('Nenhum deploy selecionado.');

    p.note(steps.map((step, index) => `${chalk.cyan(String(index + 1).padStart(2, '0'))}  ${step}`).join('\n'), 'Etapas deste deploy');
    const progress = new Progress(steps);
    if (deployBackend && shouldInstallRender) {
      await progress.run('Instalar Render CLI', 'sh', [path.join(scriptDir, 'install-render.sh')], root);
      if (deployBackend && render) {
        const selectedId = await lookupRenderServiceId(render);
        if (!selectedId) throw new Error('Nenhum serviço Render foi selecionado.');
        serviceId = selectedId;
      }
    }
    if (deployBackend && render) {
      await progress.run('Instalar dependências do backend', 'bun', ['install', '--frozen-lockfile'], backend);
      await progress.run('Compilar backend', 'bun', ['run', 'build'], backend);
      if (serviceId && process.env.RENDER_API_KEY) await progress.runRenderApiDeploy(serviceId);
      else {
        const deployArgs = serviceId ? ['deploys', 'create', serviceId, '--wait'] : ['deploys', 'create'];
        await progress.runLive('Publicar backend no Render', render, deployArgs, root);
      }
    }
    if (publishFrontend) {
      await progress.run('Instalar dependências do frontend', 'npm', ['ci'], frontend);
      await progress.run('Compilar frontend', 'npm', ['run', 'build'], frontend);
      await progress.runLive('Publicar frontend na Vercel', localVercel, ['deploy', '--prod'], frontend);
    }
    p.outro('Fluxo de deploy concluído.');
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const requestedAgent = argv.includes('--agent');
  if (argv.includes('--help') || argv.includes('-h')) {
    if (requestedAgent) {
      agentMode = true;
      printHelp(true);
    } else printHelp();
    return;
  }

  if (!requestedAgent) {
    if (argv.length) {
      console.error(`Argumentos disponíveis apenas com --agent.\n`);
      printHelp();
      process.exitCode = 2;
      return;
    }
    await mainInteractive();
    return;
  }

  agentMode = true;
  try {
    const options = parseAgentOptions(argv);
    if (!options.yes && !options.dryRun) {
      throw new NeedsInputError('confirmation_required', 'Para publicar em produção, passe --yes explicitamente. Use --dry-run para validar sem publicar.');
    }
    await mainAgent(options);
  } catch (error) {
    if (error instanceof NeedsInputError) {
      agentEvent({ type: 'needs_input', code: error.code, message: error.message, ...error.details });
      process.exitCode = 2;
    } else {
      const message = error instanceof Error ? error.message : String(error);
      agentEvent({ type: 'error', code: isRenderNetworkError(message) ? 'render_network_error' : 'deploy_failed', message });
      process.exitCode = 1;
    }
  }
}

await main();
