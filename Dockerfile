# syntax=docker/dockerfile:1
#
# Multi-stage build for the NumberDepot Next.js app (npm workspaces monorepo).
#
# Only NEXT_PUBLIC_* values are build args: Next.js inlines those into the
# client bundle at build time, so they have to be present here. Everything
# secret — the Mongo URI, JWT secret, Resend key, Authorize.Net transaction key
# — is supplied at RUNTIME only. Passing a secret as an ARG bakes it into an
# image layer where `docker history` can read it back out.

# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies ----
FROM base AS deps
# The workspace root lockfile covers apps/web too, so both manifests are needed
# for `npm ci` to resolve the workspace.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# ---- Build ----
FROM base AS builder

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTHORIZENET_ENV
ARG NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY
ARG NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTHORIZENET_ENV=$NEXT_PUBLIC_AUTHORIZENET_ENV
ENV NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY=$NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY
ENV NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID=$NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID

# Source first, then dependencies on top — .dockerignore keeps host node_modules
# out of the context, and this ordering makes that guarantee explicit.
COPY . .
COPY --from=deps /app/node_modules ./node_modules
# npm does not hoist everything: bcryptjs resolves only from the workspace's own
# node_modules, so auth fails to build without this second copy.
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

RUN npm run build --workspace=apps/web

# ---- Runtime ----
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
# Next's standalone server binds to localhost unless told otherwise, which makes
# the published port unreachable from outside the container.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# `output: "standalone"` in a monorepo emits:
#   .next/standalone/apps/web/server.js   <- entrypoint
#   .next/standalone/node_modules         <- traced runtime deps
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
