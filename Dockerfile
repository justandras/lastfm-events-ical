FROM node:20-alpine AS build

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src
COPY packages ./packages

RUN npm install \
  && npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache tzdata

ENV NODE_ENV=production
ENV PORT=3000
ENV CACHE_FILE_PATH=/data/events-cache.json

COPY package.json ./
COPY packages ./packages
RUN npm install --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/packages/lastfm-scraper/dist ./packages/lastfm-scraper/dist

# Directory for persistent cache; mount this as a volume when running.
VOLUME ["/data"]

EXPOSE 3000

CMD ["node", "dist/index.js"]

