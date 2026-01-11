FROM node:20-bullseye
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8000
CMD ["npm","run","start:luma"]
