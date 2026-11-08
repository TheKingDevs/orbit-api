import { MongoClient, Db } from 'mongodb';
import { Logger } from '@utils/logger';
import dns from 'node:dns';

// Configura servidores DNS públicos conhecidos para mitigar falhas de c-ares no Android/Termux
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignora se o runtime não permitir alterar servidores DNS
}

const DEFAULT_DATABASE = 'orbit';

let client: MongoClient | null = null;
let database: Db | null = null;

const KNOWN_CLUSTERS: Record<string, { hosts: string[]; txtParams: string }> = {
  'cluster0.qnk3ftl.mongodb.net': {
    hosts: [
      'ac-prnf0fa-shard-00-00.qnk3ftl.mongodb.net:27017',
      'ac-prnf0fa-shard-00-01.qnk3ftl.mongodb.net:27017',
      'ac-prnf0fa-shard-00-02.qnk3ftl.mongodb.net:27017'
    ],
    txtParams: 'authSource=admin&replicaSet=atlas-1433kz-shard-0'
  }
};

/**
 * Converte URI mongodb+srv:// em uma URI padrão mongodb:// com seedlist de réplicas.
 * Isso resolve problemas de ambientes (como Termux/Android ou redes restritas)
 * onde consultas DNS SRV sofrem ECONNREFUSED na porta 53 local.
 */
async function resolveSrvToSeedlist(srvUri: string): Promise<string> {
  if (!srvUri.startsWith('mongodb+srv://')) return srvUri;

  try {
    const url = new URL(srvUri.replace('mongodb+srv://', 'http://'));
    const clusterHost = url.hostname;
    const user = decodeURIComponent(url.username);
    const pass = decodeURIComponent(url.password);
    const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
    const dbPath = url.pathname && url.pathname !== '/' ? url.pathname : `/${DEFAULT_DATABASE}`;

    let resolvedHosts: string[] = [];
    let txtParams = '';

    // Tenta resolver via DNS-over-HTTPS (Google / Cloudflare)
    try {
      const dohSrvUrl = `https://dns.google/resolve?name=${encodeURIComponent(`_mongodb._tcp.${clusterHost}`)}&type=SRV`;
      const dohTxtUrl = `https://dns.google/resolve?name=${encodeURIComponent(clusterHost)}&type=TXT`;

      const [srvRes, txtRes] = await Promise.all([
        fetch(dohSrvUrl, { signal: AbortSignal.timeout(4000) }).then((r) => r.json()),
        fetch(dohTxtUrl, { signal: AbortSignal.timeout(4000) }).then((r) => r.json())
      ]);

      if (Array.isArray(srvRes.Answer) && srvRes.Answer.length > 0) {
        resolvedHosts = srvRes.Answer.map((ans: { data: string }) => {
          const parts = ans.data.trim().split(/\s+/);
          const port = parts[2] || '27017';
          const target = (parts[3] || '').replace(/\.$/, '');
          return `${target}:${port}`;
        }).filter(Boolean);
      }

      if (Array.isArray(txtRes.Answer) && txtRes.Answer[0]) {
        txtParams = txtRes.Answer[0].data.replace(/^"|"$/g, '');
      }
    } catch {
      // Se DoH falhar, segue para os clusters pré-definidos
    }

    if (resolvedHosts.length === 0 && KNOWN_CLUSTERS[clusterHost]) {
      resolvedHosts = KNOWN_CLUSTERS[clusterHost].hosts;
      txtParams = KNOWN_CLUSTERS[clusterHost].txtParams;
    }

    if (resolvedHosts.length > 0) {
      const params = new URLSearchParams(txtParams);
      params.set('ssl', 'true');
      if (!params.has('authSource')) params.set('authSource', 'admin');
      return `mongodb://${auth}${resolvedHosts.join(',')}${dbPath}?${params.toString()}`;
    }
  } catch {
    // Retorna a URI original se houver falha de parse
  }

  return srvUri;
}

export async function connectDatabase(): Promise<Db | null> {
  if (database) return database;

  const uri = process.env.MONGO_URI?.trim();

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI é obrigatória em produção.');
    }

    Logger.warning(
      'MONGO_URI não configurada. Os dados serão mantidos apenas em memória.',
      'MongoDB'
    );
    return null;
  }

  const databaseName = process.env.MONGO_DB_NAME?.trim() || DEFAULT_DATABASE;

  // Tenta conectar diretamente com a URI configurada
  let mongoClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
    retryWrites: true
  });

  try {
    await mongoClient.connect();
    const mongoDatabase = mongoClient.db(databaseName);

    await mongoDatabase.command({ ping: 1 });

    client = mongoClient;
    database = mongoDatabase;

    Logger.success(`Conectado ao MongoDB (${databaseName}).`, 'MongoDB');
    return database;
  } catch (error: any) {
    await mongoClient.close().catch(() => undefined);

    const errorMessage = String(error?.message || '');
    const isSrvDnsError =
      errorMessage.includes('querySrv') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEOUT');

    // Se falhou por erro de resolução DNS SRV (comum no Termux/Android), tenta fallback com seedlist direta
    if (uri.startsWith('mongodb+srv://') && isSrvDnsError) {
      Logger.warning(
        'Resolução SRV do MongoDB falhou no DNS local. Tentando conexão direta via seedlist do cluster...',
        'MongoDB'
      );

      const fallbackUri = await resolveSrvToSeedlist(uri);
      if (fallbackUri !== uri) {
        mongoClient = new MongoClient(fallbackUri, {
          serverSelectionTimeoutMS: 10_000,
          retryWrites: true
        });

        try {
          await mongoClient.connect();
          const mongoDatabase = mongoClient.db(databaseName);

          await mongoDatabase.command({ ping: 1 });

          client = mongoClient;
          database = mongoDatabase;

          Logger.success(`Conectado ao MongoDB via seedlist direta (${databaseName}).`, 'MongoDB');
          return database;
        } catch (fallbackError) {
          await mongoClient.close().catch(() => undefined);
          throw fallbackError;
        }
      }
    }

    throw error;
  }
}

export function getDatabase(): Db | null {
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (!client) return;

  await client.close();
  client = null;
  database = null;
}
