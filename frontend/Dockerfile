# syntax=docker/dockerfile:1

# VITE_API_URL is compiled into the JS bundle. There is no runtime override.
# For the single-origin topology this must be the public https origin
# (the same host that serves this image), not http://localhost:3000.
# The CI artifact built with localhost is not deployable.

FROM node:22-bookworm-slim AS build
WORKDIR /app

ARG VITE_API_URL
ARG VITE_APP_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src

RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build-arg is required" && exit 1)
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Object-storage origin for CSP img-src / media-src / connect-src.
# Example: https://training-media.s3.eu-west-1.amazonaws.com
ENV STORAGE_ORIGIN=""

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
