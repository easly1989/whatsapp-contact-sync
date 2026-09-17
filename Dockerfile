### Build web files
FROM node:22-alpine AS web-build

WORKDIR /app/web

COPY ["web/package.json", "web/package-lock.json*", "./"]

RUN npm ci

COPY ./interfaces /app/interfaces
COPY ./web .

RUN npm run build


### Build server files and production dependencies
FROM node:22-alpine AS server-build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
ENV PUPPETEER_SKIP_DOWNLOAD="true"
WORKDIR /app/server

COPY ["server/package.json", "server/package-lock.json*", "./"]

RUN apk add --no-cache git && npm ci

COPY ./interfaces /app/interfaces
COPY ./server .

RUN npm run build

RUN npm prune --omit=dev


### Build final image
FROM node:22-alpine

ENV RUNNING_IN_DOCKER="true"
WORKDIR /app/server

# Chromium is used by whatsapp-web.js. Node is the only container process;
# this lets Render forward SIGTERM cleanly during deploys.
RUN apk add --no-cache nss udev ttf-freefont chromium

COPY --from=web-build /app/web/dist ./public
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/build ./build

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "build/server/main.js"]
