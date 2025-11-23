# syntax=docker/dockerfile:1.7-labs
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig*.json vite.config.ts ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/node_modules \
    npm ci --no-audit --no-fund

COPY index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# Serve stage
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
