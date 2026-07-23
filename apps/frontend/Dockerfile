FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Install turbo globally
RUN npm install -g turbo

# Copy dependency configs
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/database/package*.json ./packages/database/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the frontend using Turbo
RUN turbo run build --filter=@10ou2/frontend...

# Runner stage using Nginx
FROM nginx:alpine AS runner

COPY --from=builder /usr/src/app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
