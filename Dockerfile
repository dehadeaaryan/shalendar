# Production Dockerfile for Shalendar (SvelteKit + Node Adapter + SQLite)

FROM node:22-alpine AS builder
WORKDIR /app

# Install build tools required for native C++ addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build SvelteKit app
COPY . .
RUN npm run build
RUN npm prune --production

# Final lightweight runner image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_URL=/app/data/shalendar.db

# Create directory for persistent SQLite database storage
RUN mkdir -p /app/data

# Copy production dependencies, drizzle configs, and built server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

EXPOSE 3000

# Push any pending schema changes non-interactively, then start the app
CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit push --force && node build"]