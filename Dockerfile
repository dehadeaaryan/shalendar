# Production Dockerfile for Shalendar (SvelteKit + Node Adapter + SQLite)

FROM node:22-alpine AS builder
WORKDIR /app

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

# Copy production dependencies and built server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["node", "build"]
