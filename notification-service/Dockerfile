FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --chown=node:node . .
USER node
EXPOSE 4007
CMD ["npm", "start"]
