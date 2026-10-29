# Multi-stage Dockerfile for VaultBank Client
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build shared and client
RUN npm run build --workspace=@vaultbank/shared
RUN npm run build --workspace=@vaultbank/client

# Nginx Production Server
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
