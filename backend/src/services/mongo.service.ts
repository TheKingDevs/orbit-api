import { MongoClient, Db } from 'mongodb';
import { Logger } from '@utils/logger';

const DEFAULT_DATABASE = 'orbit';

let client: MongoClient | null = null;
let database: Db | null = null;

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
  const mongoClient = new MongoClient(uri, {
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
  } catch (error) {
    await mongoClient.close().catch(() => undefined);
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
