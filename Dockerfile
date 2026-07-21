# Chaubandi Medusa v2 backend
#
# Railway's Nixpacks builder hung silently in the npm install phase for ~20
# minutes across two builder instances (their own diagnosis blamed build
# infrastructure). A Dockerfile takes that variability out: we pin the Node
# version, control the install flags, and get layer caching that makes repeat
# builds fast.
#
# Multi-stage: the builder installs the full toolchain (medusa build needs
# typescript, and vite/react when the admin dashboard is enabled), while the
# runtime image carries only the compiled server and its production deps.

# ── Stage 1: build ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

# node-gyp needs python3 and a compiler. Some transitive dependencies
# (msgpackr-extract among them) fall back to building from source when no
# prebuilt binary matches, which is where the Nixpacks builds appear to have
# stalled. Providing the toolchain up front makes that path fast instead of
# fatal.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so the dependency layer is cached until they change.
COPY package.json package-lock.json .npmrc ./

# --no-audit/--no-fund cut needless network round-trips; devDependencies are
# required here (see .npmrc) because the build compiles TypeScript.
RUN npm ci --no-audit --no-fund

COPY . .

# Emits a self-contained server into .medusa/server.
RUN npm run build

# The build output ships a package.json but no lockfile, so this is
# `npm install`, not `npm ci`. --omit=dev keeps the runtime lean.
WORKDIR /app/.medusa/server
RUN npm install --omit=dev --no-audit --no-fund


# ── Stage 2: runtime ──────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

# Only the compiled server and its production dependencies — no source, no
# build toolchain, no devDependencies.
COPY --from=builder /app/.medusa/server ./

# Railway sets PORT; medusa start honours it and binds all interfaces.
EXPOSE 9000

# Migrations run on every start. They are idempotent, and this keeps the schema
# in step with the code that was just deployed.
CMD ["sh", "-c", "npx medusa db:migrate && npm run start -- -H 0.0.0.0"]
