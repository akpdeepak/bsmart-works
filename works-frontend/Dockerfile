# syntax=docker/dockerfile:1.7
# ── Build stage: produce the static Vite bundle ───────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
# .npmrc carries legacy-peer-deps=true (eslint 10 is ahead of jsx-a11y's peer range);
# it must be present for `npm ci` to resolve, exactly as CI relies on it.
COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# Same-origin API base — nginx (runtime stage) proxies /api/* to the backend,
# so the browser never makes a cross-origin call and CORS is never exercised.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Runtime stage: nginx serving the SPA + proxying the API ───────────────────
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
