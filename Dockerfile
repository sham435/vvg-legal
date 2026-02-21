# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies
RUN npm ci

# Generate Prisma Client (needs empty schema for build, actual migrations run at runtime)
RUN npx prisma generate || echo "Prisma generate skipped - will run at startup"

# Copy source code
COPY . .

# Build application
RUN npm run build

# Verify build output
RUN ls -la dist/main.js || (echo "❌ Build failed - dist/main.js not found" && exit 1)

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    bash \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads/videos && chown -R nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/main.js"]
