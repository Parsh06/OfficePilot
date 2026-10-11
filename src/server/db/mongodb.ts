import { MongoClient, type Db, type Collection, type Document } from 'mongodb';
import { baseLogger } from '../utils/logger';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'worktrip_ai';

/**
 * Global cache interface for serverless environment connection reuse.
 */
interface MongoConnectionCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoConnectionCache: MongoConnectionCache | undefined;
}

const cached: MongoConnectionCache = globalThis._mongoConnectionCache || {
  client: null,
  promise: null,
};

if (!globalThis._mongoConnectionCache) {
  globalThis._mongoConnectionCache = cached;
}

/**
 * Checks if MongoDB environment variables are properly defined.
 */
export function isMongoConfigured(): boolean {
  return Boolean(MONGODB_URI && !MONGODB_URI.includes('dummy_mongo_placeholder'));
}

/**
 * Connects to MongoDB Atlas using connection pooling and caching.
 * Reuses the existing connection across serverless invocations.
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    baseLogger.info({ dbName: MONGODB_DB_NAME }, '[MongoDB] Initializing new connection pool...');
    cached.promise = MongoClient.connect(MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then((client) => {
      baseLogger.info('[MongoDB] Connection pool established successfully.');
      return client;
    }).catch((err) => {
      cached.promise = null;
      baseLogger.error({ err }, '[MongoDB] Failed to connect to MongoDB cluster.');
      throw err;
    });
  }

  cached.client = await cached.promise;
  return cached.client;
}

/**
 * Returns the active MongoDB database instance.
 */
export async function getDatabase(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(MONGODB_DB_NAME);
}

/**
 * Type-safe collection getter helper.
 */
export async function getCollection<T extends Document>(name: string): Promise<Collection<T> | null> {
  const db = await getDatabase();
  if (!db) return null;
  return db.collection<T>(name);
}

/**
 * MongoDB Connectivity Status Checker for Health Endpoint.
 */
export async function checkMongoHealth(): Promise<{ status: 'CONNECTED' | 'UNCONFIGURED' | 'DISCONNECTED'; latencyMs?: number }> {
  if (!isMongoConfigured()) {
    return { status: 'UNCONFIGURED' };
  }

  const start = Date.now();
  try {
    const db = await getDatabase();
    if (!db) return { status: 'DISCONNECTED' };
    await db.command({ ping: 1 });
    return { status: 'CONNECTED', latencyMs: Date.now() - start };
  } catch (err) {
    baseLogger.warn({ err }, '[MongoDB:HealthCheck] Ping failed.');
    return { status: 'DISCONNECTED' };
  }
}
