# -------------------------------------------------
#  Railway‑compatible Docker image for the VVG app
# -------------------------------------------------
# Use an official lightweight Node image (includes npm)
FROM node:20-alpine AS base

# Set working directory inside the container
WORKDIR /app

# -------------------------------------------------
#  Install dependencies
# -------------------------------------------------
# Copy only package files first – this speeds up rebuilds
COPY package*.json ./
RUN npm ci --omit=dev   # install only production deps

# -------------------------------------------------
#  Build the NestJS backend (and any other build steps)
# -------------------------------------------------
COPY . .
RUN npm run build      # runs the NestJS build (tsc) and any other build scripts

# -------------------------------------------------
#  Runtime stage – keep it small
# -------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy the built artefacts from the builder stage
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Expose the port Railway expects (default 3000)
EXPOSE 3000

# Default command – this is what Railway will execute
CMD ["npm","run","start:prod"]
