FROM node:20-alpine

WORKDIR /app

RUN echo "=== Starting build ===" && \
    ls -la

# Install libssl1.1 for Prisma
RUN apk add --no-cache libssl1.1 || apk add --no-cache libssl3

COPY package*.json ./
RUN echo "=== After copying package.json ===" && \
    ls -la

RUN npm install && \
    echo "=== After npm install ===" && \
    ls -la

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN echo "=== After copying source ===" && \
    ls -la

RUN npm run build && \
    echo "=== After npm run build ===" && \
    ls -la dist/

EXPOSE 8080

CMD ["sh", "-c", "echo '=== Runtime ===' && ls -la && ls -la dist/ && node dist/main.js"]
