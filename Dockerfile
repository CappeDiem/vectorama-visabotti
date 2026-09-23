FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f


ENV NODE_ENV production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

COPY package*.json ./

RUN npm install

COPY --chown=node:node ./ /app/
RUN mkdir -p /app/generated/prisma && chown -R node:node /app/generated

USER node
ENTRYPOINT ["./startup.sh"]