# Multi-stage build for NestJS backend
FROM node:20-bullseye AS builder

RUN apt-get update && apt-get install -y openssl libssl-dev libssl1.1

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vvg" npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

RUN apt-get update && apt-get install -y openssl libssl-dev libssl1.1 ffmpeg && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN npm ci --only=production

# Copy Prisma client and built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/src/main.js"]
