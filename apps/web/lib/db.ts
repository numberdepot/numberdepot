import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Use globalThis to persist across Next.js hot reloads in dev mode.
// Without this, every hot reload creates a new connection pool while the
// old one stays open — quickly exhausting the 500-connection free-tier limit.
const g = globalThis as unknown as { _mongoCached?: { client: MongoClient; db: Db; promise?: Promise<Db> } };

export async function getDb(): Promise<Db> {
  if (g._mongoCached?.db) return g._mongoCached.db;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // If a connection attempt is already in flight, wait for it instead of opening another
  if (g._mongoCached?.promise) return g._mongoCached.promise;

  const promise = MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 10_000,
  }).then((client) => {
    const db = client.db('numberdepot');
    g._mongoCached = { client, db };
    return db;
  });

  g._mongoCached = { promise } as typeof g._mongoCached;
  return promise;
}
