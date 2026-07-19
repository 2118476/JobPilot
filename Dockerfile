FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "run", "start"]
