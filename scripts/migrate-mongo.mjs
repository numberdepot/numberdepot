/**
 * Copies every collection from one MongoDB to another.
 *
 * Built for the Atlas → self-hosted container move, but it works either way
 * round (it is also how you take a copy back out of the VPS).
 *
 * It uses the `mongodb` driver already in this repo, so nothing extra has to be
 * installed — no mongodump/mongorestore, no MongoDB Database Tools.
 *
 * Usage — from the repo root:
 *
 *   SOURCE_URI="mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/numberdepot" \
 *   TARGET_URI="mongodb://numberdepot:PASS@127.0.0.1:27017/numberdepot?authSource=admin" \
 *   node scripts/migrate-mongo.mjs
 *
 * Flags:
 *   --drop        empty each target collection before inserting (repeatable runs)
 *   --dry-run     report what would be copied, write nothing
 *   --only=a,b    restrict to named collections
 *
 * Safety: without --drop it refuses to write into a non-empty collection, so a
 * half-finished run can never silently duplicate documents.
 */

import { MongoClient } from 'mongodb';

const args = process.argv.slice(2);
const DROP = args.includes('--drop');
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7).split(',').map((s) => s.trim()).filter(Boolean);

const SOURCE_URI = process.env.SOURCE_URI;
const TARGET_URI = process.env.TARGET_URI;
const SOURCE_DB = process.env.SOURCE_DB || 'numberdepot';
const TARGET_DB = process.env.TARGET_DB || 'numberdepot';
const BATCH = Number(process.env.BATCH_SIZE || 1000);

if (!SOURCE_URI || !TARGET_URI) {
  console.error('SOURCE_URI and TARGET_URI must both be set. See the header of this file.');
  process.exit(1);
}
if (SOURCE_URI === TARGET_URI && SOURCE_DB === TARGET_DB) {
  console.error('SOURCE and TARGET point at the same database — refusing to run.');
  process.exit(1);
}

const source = await MongoClient.connect(SOURCE_URI, { serverSelectionTimeoutMS: 15000 });
const target = await MongoClient.connect(TARGET_URI, { serverSelectionTimeoutMS: 15000 });

const sourceDb = source.db(SOURCE_DB);
const targetDb = target.db(TARGET_DB);

let totalCopied = 0;
let hadError = false;

try {
  const collections = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'))
    .filter((name) => !ONLY || ONLY.includes(name))
    .sort();

  if (collections.length === 0) {
    console.log('Nothing to copy — the source has no matching collections.');
  }

  console.log(`\n${SOURCE_DB} → ${TARGET_DB}   (${collections.length} collections)`);
  console.log(DRY_RUN ? 'DRY RUN — nothing will be written\n' : '');

  for (const name of collections) {
    const from = sourceDb.collection(name);
    const to = targetDb.collection(name);

    const sourceCount = await from.countDocuments();
    const targetCount = await to.countDocuments();

    if (DRY_RUN) {
      console.log(`  ${name.padEnd(20)} ${String(sourceCount).padStart(7)} docs   (target has ${targetCount})`);
      continue;
    }

    if (targetCount > 0) {
      if (!DROP) {
        console.error(
          `  ${name.padEnd(20)} SKIPPED — target already holds ${targetCount} docs. Re-run with --drop to replace.`
        );
        hadError = true;
        continue;
      }
      await to.deleteMany({});
    }

    if (sourceCount === 0) {
      console.log(`  ${name.padEnd(20)} ${String(0).padStart(7)} docs`);
      continue;
    }

    // Stream in batches so a large collection never has to fit in memory.
    const cursor = from.find({});
    let buffer = [];
    let copied = 0;

    const flush = async () => {
      if (buffer.length === 0) return;
      // ordered:false keeps going past a single bad document rather than
      // aborting the whole collection midway.
      await to.insertMany(buffer, { ordered: false });
      copied += buffer.length;
      buffer = [];
      process.stdout.write(`\r  ${name.padEnd(20)} ${String(copied).padStart(7)} / ${sourceCount}`);
    };

    for await (const doc of cursor) {
      buffer.push(doc);
      if (buffer.length >= BATCH) await flush();
    }
    await flush();

    process.stdout.write(`\r  ${name.padEnd(20)} ${String(copied).padStart(7)} docs copied\n`);
    totalCopied += copied;

    if (copied !== sourceCount) {
      console.error(`    WARNING: expected ${sourceCount}, copied ${copied}`);
      hadError = true;
    }
  }

  // ── Verify ──
  if (!DRY_RUN && collections.length > 0) {
    console.log('\nVerifying document counts:');
    for (const name of collections) {
      const a = await sourceDb.collection(name).countDocuments();
      const b = await targetDb.collection(name).countDocuments();
      const ok = a === b;
      if (!ok) hadError = true;
      console.log(`  ${ok ? 'OK  ' : 'MISMATCH'}  ${name.padEnd(20)} source ${a}  target ${b}`);
    }
    console.log(`\n${totalCopied} documents copied.`);
    console.log(
      'Indexes are NOT copied — the app rebuilds them itself via ensureIndexes() ' +
      'on the first API request, which also drops the old destructive TTL index.'
    );
  }
} catch (err) {
  console.error('\nMigration failed:', err.message);
  hadError = true;
} finally {
  await source.close();
  await target.close();
  process.exit(hadError ? 1 : 0);
}
