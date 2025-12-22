FROM node:20-alpine AS builder
WORKDIR /app

# Install backend dependencies (uses package.json & package-lock.json if present)
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code and build
COPY backend ./
RUN npm run build

# Runtime stage – minimal image
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm","run","start:prod"]
