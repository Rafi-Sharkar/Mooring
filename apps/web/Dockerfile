FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy workspace configurations and manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy web app source
COPY apps/web/ apps/web/

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @dockhand/web build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.15.0

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "--filter", "@dockhand/web", "start"]
