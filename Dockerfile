FROM node:24.15.0-alpine


ENV NODE_ENV production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

COPY package*.json ./

RUN npm install

COPY --chown=node:node ./ /app/
RUN mkdir -p /app/generated/prisma && chown -R node:node /app/generated

USER node
ENTRYPOINT ["./startup.sh"]