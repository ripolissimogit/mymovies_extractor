FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./

# Skip Chromium download (base image already includes it)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY . .

# Render will provide PORT; Express reads process.env.PORT
EXPOSE 3000

CMD ["node", "api-server.js"]
