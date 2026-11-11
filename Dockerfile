FROM node:22-alpine

WORKDIR /app
COPY package.json aggregator.js ./
COPY src ./src

USER node
ENTRYPOINT ["node", "aggregator.js"]
CMD ["--help"]
