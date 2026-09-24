FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1


ENV NODE_ENV production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

COPY package*.json ./

RUN npm install

COPY --chown=node:node ./ /app/
RUN mkdir -p /app/generated/prisma && chown -R node:node /app/generated

USER node
ENTRYPOINT ["./startup.sh"]