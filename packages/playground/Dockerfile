# Build context: ../  (packages/)
# docker build -f playground/Dockerfile ..

# ── Stage 1: compile the browser SDK ────────────────────────
FROM node:20-alpine AS sdk-builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build
COPY browser/package.json browser/pnpm-lock.yaml ./browser/
RUN cd browser && pnpm install --frozen-lockfile

COPY browser/src        ./browser/src
COPY browser/tsconfig.json ./browser/
COPY browser/vite.config.ts ./browser/
RUN cd browser && pnpm build

# ── Stage 2: nginx serving playground + compiled SDK ─────────
FROM nginx:alpine

RUN mkdir -p /usr/share/nginx/html/sdk
COPY --from=sdk-builder /build/browser/dist/index.umd.js /usr/share/nginx/html/sdk/batrewind.umd.js

COPY playground/index.html    /usr/share/nginx/html/index.html
COPY playground/nginx.conf    /etc/nginx/conf.d/default.conf
COPY playground/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["/entrypoint.sh"]
