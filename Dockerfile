# syntax=docker/dockerfile:1
FROM oven/bun:1-debian AS base
WORKDIR /app

# Install minimal system runtime libraries required by @napi-rs/canvas (Skia) on Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libfontconfig1 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

# Cache & install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy application source & pixel fonts
COPY tsconfig.json drizzle.config.ts ./
COPY assets ./assets
COPY src ./src

# Ensure persistent SQLite data & output directories exist
RUN mkdir -p /app/data /app/output

ENV NODE_ENV=production
CMD ["bun", "run", "src/index.ts"]
