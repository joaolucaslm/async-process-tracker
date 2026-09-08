# --- Build the static assets ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL is baked into the bundle at build time. It must point at wherever
# the browser reaches the backend, not at the compose service name.
ARG VITE_API_URL=https://async-process-tracker.duckdns.org/
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Serve them ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
