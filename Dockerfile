FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN npm install --global pnpm@12.8.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html site.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY demo ./demo
RUN pnpm build:showcase

FROM caddy:2-alpine

# The upstream binary carries a privileged-port capability. Remove it because
# this image serves port 8080 with all Linux capabilities dropped.
RUN setcap -r /usr/bin/caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/showcase-dist /srv
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
