FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ src/
RUN npm run build

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built output
COPY --from=builder /app/dist ./dist

# Run as non-root (but needs docker socket access via group)
RUN addgroup -S hawser && adduser -S hawser -G hawser
USER hawser

ENTRYPOINT ["node", "dist/index.js"]
