/** Arguments that enable yt-dlp's YouTube JavaScript challenge solver. */
export function ytDlpRuntimeArgs(): string[] {
  const configured = process.env.YTDLP_JS_RUNTIME?.trim();
  if (configured) return ['--js-runtimes', configured];

  const nodePath = Bun.which('node');
  if (nodePath) {
    const version = Bun.spawnSync([nodePath, '--version'], { stdout: 'pipe', stderr: 'ignore' });
    const major = Number(new TextDecoder().decode(version.stdout ?? new Uint8Array()).trim().replace(/^v/, '').split('.')[0]);
    if (Number.isFinite(major) && major >= 22) return ['--js-runtimes', `node:${nodePath}`];
  }

  const denoPath = Bun.which('deno');
  if (denoPath) return ['--js-runtimes', `deno:${denoPath}`];

  return [];
}

export function isYtDlpSearchQuery(value: string): boolean {
  return value.startsWith('ytsearch5:') && value.length > 'ytsearch5:'.length && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value);
}
