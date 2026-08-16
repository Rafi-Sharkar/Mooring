FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy workspace configurations and manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy packages and api source code
COPY packages/database/ packages/database/
COPY apps/api/ apps/api/

# Generate Prisma Client & build packages
RUN pnpm --filter @dockhand/database db:generate
RUN pnpm --filter @dockhand/database build
RUN pnpm --filter @dockhand/api build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/database ./packages/database
COPY --from=base /app/apps/api ./apps/api

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @dockhand/database db:push && node apps/api/dist/main.js"]
