FROM node:20-slim

# Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
