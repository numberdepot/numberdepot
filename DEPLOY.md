# NumberDepot — VPS Deployment

Self-hosted Docker stack: Next.js app + MongoDB in containers, optional Caddy
for TLS. Replaces the MongoDB Atlas connection string with a local container.

---

## 1. What was wrong with the previous Docker setup

| # | Problem | Effect | Fixed |
|---|---|---|---|
| 1 | **No `.dockerignore` at the build context root** (only `apps/web/.dockerignore`, which Docker never read for this build) | Build context was **995 MB**. `COPY . .` copied the host's Windows `node_modules` *over* the Linux ones installed in the image, and baked `.env` — live Mongo password, JWT secret, Resend key — into an image layer readable with `docker history`. | ✅ root `.dockerignore` added |
| 2 | **`HOSTNAME` never set** in the runtime stage | Next's standalone server binds to `localhost` inside the container, so `-p 3000:3000` reaches nothing. The container would look healthy and serve no traffic. | ✅ `ENV HOSTNAME=0.0.0.0` |
| 3 | **Mongo published as `27017:27017`** | Docker writes its own iptables rules that **bypass UFW**, so the database would have been exposed to the public internet with a password from `.env.docker`'s default. | ✅ not published; `web` reaches it on the private network |
| 4 | **Secrets passed as build `ARG`s** (`JWT_SECRET`, `RESEND_API_KEY`, `MONGODB_URI`) | Persisted in image layers. Only `NEXT_PUBLIC_*` genuinely needs build time. | ✅ secrets are runtime-only |
| 5 | **No Authorize.Net variables anywhere** | Checkout would have loaded with an empty client key and failed on every payment. | ✅ added, split correctly build-time vs runtime |
| 6 | `npm install --frozen-lockfile \|\| npm install` | `--frozen-lockfile` is not an npm flag, so this always fell through to an unpinned `npm install`. | ✅ `npm ci` |
| 7 | No healthcheck on `web` | A crashed app stayed "up". | ✅ `/api/health` + `HEALTHCHECK` |
| 8 | `apps/web/Dockerfile` is stale and broken | It runs `npm ci` against a context with no lockfile. Unused by compose, but a trap for whoever deploys next. | ⚠️ **left in place — recommend deleting it** |

Verified: `docker compose config` parses, and `MONGODB_URI` resolves to
`mongodb://<user>:<pass>@mongo:27017/numberdepot?authSource=admin`.

> Not verified: an actual `docker build`. The Docker daemon was not running in
> the environment where these changes were made, so run step 3 below once and
> confirm before pointing DNS at the box.

---

## 2. First deploy

```bash
# on the VPS
git clone <repo> numberdepot && cd numberdepot
cp .env.docker .env
nano .env                      # fill in every value — see the notes in the file
```

`.env` must have, at minimum: `MONGO_USER`, `MONGO_PASS`, `JWT_SECRET`,
the four `AUTHORIZENET_*` / `NEXT_PUBLIC_AUTHORIZENET_*` values, and
`NEXT_PUBLIC_APP_URL`. Compose refuses to start if `MONGO_USER`, `MONGO_PASS`
or `JWT_SECRET` is blank.

```bash
docker compose up -d --build
docker compose ps              # both containers should read "healthy"
docker compose logs -f web
curl localhost:3000/api/health # {"status":"ok","database":"connected",...}
```

With a domain pointed at the VPS:

```bash
docker compose --profile proxy up -d --build
```

Then change the `web` port mapping to `"127.0.0.1:3000:3000"` so only Caddy can
reach the app, and open just 80/443 in the firewall.

**`NEXT_PUBLIC_*` values are compiled into the browser bundle.** Changing any of
them needs `docker compose up -d --build`, not just a restart.

---

## 3. Moving the Atlas data into the container

Two routes. **Route A needs nothing installed** and is the one to use unless the
database has grown large.

### Route A — the repo's own migration script (recommended)

Run it from the VPS, where it can reach both Atlas (outbound) and the container.
Publish Mongo to loopback only, temporarily:

```bash
# 1. temporarily expose the container's Mongo on localhost only
#    (uncomment the 127.0.0.1:27017:27017 line in docker-compose.yml)
docker compose up -d mongo

# 2. install just what the script needs
npm ci

# 3. copy everything across
SOURCE_URI="mongodb+srv://officialsoumyajit12:PASSWORD@cluster0.jyee7.mongodb.net/numberdepot" \
TARGET_URI="mongodb://$MONGO_USER:$MONGO_PASS@127.0.0.1:27017/numberdepot?authSource=admin" \
npm run migrate:mongo -- --drop

# 4. re-comment the port line, then
docker compose up -d
```

Do a `--dry-run` first to see the collection list and counts without writing:

```bash
SOURCE_URI=... TARGET_URI=... npm run migrate:mongo -- --dry-run
```

The script streams in batches of 1000, verifies source and target counts
afterwards, and without `--drop` refuses to write into a collection that already
has documents — so a re-run can never silently duplicate anything.

**Atlas access:** allow the VPS's IP in Atlas → Network Access, or temporarily
allow `0.0.0.0/0` for the duration of the copy.

### Route B — mongodump / mongorestore

Better for large datasets since it streams a compressed archive. The official
`mongo:8` image ships the database tools, so no host install is needed — but
confirm before relying on it:

```bash
docker compose exec mongo which mongodump mongorestore
```

```bash
# dump from Atlas straight into the bind-mounted ./backup directory
docker compose exec mongo mongodump \
  --uri="mongodb+srv://USER:PASS@cluster0.jyee7.mongodb.net/numberdepot" \
  --archive=/backup/atlas.archive --gzip

# restore into the container's own database
docker compose exec mongo mongorestore \
  --username "$MONGO_USER" --password "$MONGO_PASS" --authenticationDatabase admin \
  --archive=/backup/atlas.archive --gzip --drop \
  --nsFrom='numberdepot.*' --nsTo='numberdepot.*'
```

If `which` comes back empty, use a container that definitely has the tools:

```bash
docker run --rm --network numberdepot_internal -v "$PWD/backup:/backup" \
  mongo:8 mongodump --uri="mongodb+srv://..." --archive=/backup/atlas.archive --gzip
```

### After either route

```bash
docker compose restart web
curl localhost:3000/api/health
```

**Indexes are not copied, and that is deliberate.** The app rebuilds them itself
through `ensureIndexes()` on the first API request — which is also what drops
the old TTL index that was deleting inventory. Confirm:

```bash
docker compose exec mongo mongosh -u "$MONGO_USER" -p "$MONGO_PASS" \
  --authenticationDatabase admin numberdepot \
  --eval 'db.numbers.getIndexes().forEach(i => print(i.name, JSON.stringify(i.key), i.expireAfterSeconds ?? ""))'
```

No index on `reservationExpiresAt` may have an `expireAfterSeconds` value.

Then run the payment smoke test against the deployed stack:

```bash
BASE_URL=http://localhost:3000 npm run verify:payments
```

---

## 4. Backups

The Atlas safety net is gone once you self-host — nothing takes backups now
unless you set them up. A nightly dump into the bind mount:

```bash
# /etc/cron.d/numberdepot-backup
0 3 * * * root cd /opt/numberdepot && docker compose exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASS" --authenticationDatabase admin \
  --db numberdepot --archive=/backup/numberdepot-$(date +\%F).archive --gzip
```

Copy those off the VPS, and prune old ones. Test a restore before you need one.

---

## 5. Day-to-day

```bash
docker compose logs -f web             # app logs
docker compose ps                      # health
docker compose up -d --build           # deploy a new version
docker compose exec mongo mongosh -u "$MONGO_USER" -p "$MONGO_PASS" \
  --authenticationDatabase admin numberdepot
```

Going live with real payments: set `AUTHORIZENET_ENV=production` **and**
`NEXT_PUBLIC_AUTHORIZENET_ENV=production` together, then rebuild. If they
disagree, the browser tokenises against one Authorize.Net environment while the
server charges against the other, and every payment fails.
