# ---------- Stage 1: build the static assets ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Optional: trust any *.crt files placed under ./certs/ at build time.
# Useful behind a TLS-intercepting corporate proxy (e.g. Zscaler).
# The certs/ directory is gitignored except for .gitkeep, so this is a no-op
# in normal environments.
COPY certs/ /tmp/extra-ca/
RUN apk add --no-cache ca-certificates && \
    if ls /tmp/extra-ca/*.crt >/dev/null 2>&1; then \
      cp /tmp/extra-ca/*.crt /usr/local/share/ca-certificates/ && \
      update-ca-certificates && \
      npm config set cafile /etc/ssl/certs/ca-certificates.crt; \
    fi

# Install dependencies first for better layer caching.
# Copy lockfile too if present; falls back to package.json only.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---------- Stage 2: serve with nginx ----------
FROM nginx:1.27-alpine AS runner

# Custom nginx config for an SPA (gzip + sensible caching + fallback to index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the builder stage.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic healthcheck so orchestrators know when the app is ready.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]