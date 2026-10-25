FROM golang:1.27.3-alpine AS caddy-build
ENV GOMAXPROCS=2
RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch v2.11.7 https://github.com/caddyserver/caddy.git .
RUN go get golang.org/x/net@v0.60.0 && CGO_ENABLED=0 go build -trimpath -o /tmp/caddy ./cmd/caddy

FROM node:24.22.1-bookworm-slim AS build

WORKDIR /app
RUN npm install --global pnpm@12.8.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html site.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY demo ./demo
RUN pnpm build:showcase

FROM caddy:2.11.7-alpine
RUN apk upgrade --no-cache
COPY --from=caddy-build /tmp/caddy /usr/bin/caddy

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/showcase-dist /srv
ENV XDG_DATA_HOME=/tmp/caddy-data
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
