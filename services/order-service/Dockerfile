FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

ENV PORT=3003
ENV USER_SERVICE_URL=http://user-service:3004
ENV CART_SERVICE_URL=http://cart-service:3002

EXPOSE 3003

CMD ["node", "server.js"]