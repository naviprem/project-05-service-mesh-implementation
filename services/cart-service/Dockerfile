FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

ENV PORT=3002
ENV PRODUCT_SERVICE_URL=http://product-service:3001

EXPOSE 3002

CMD ["node", "server.js"]