FROM node:26.13.1-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5


ENV NODE_ENV production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

COPY package*.json ./

RUN npm install

COPY --chown=node:node ./ /app/
RUN mkdir -p /app/generated/prisma && chown -R node:node /app/generated

USER node
ENTRYPOINT ["./startup.sh"]