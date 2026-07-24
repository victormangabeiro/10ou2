FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Install turbo globally
RUN npm install -g turbo

# Copy dependency configs
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the app using Turbo
RUN turbo run build --filter=@10ou2/backend...

# Runner stage
FROM node:24-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app ./

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "start:prod", "--workspace=@10ou2/backend"]
