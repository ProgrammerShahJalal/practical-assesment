# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Install workspace dependencies using the lockfile for reproducible builds.
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci

COPY apps ./apps
RUN npm run build -w client

FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

COPY --from=production-deps /app/package.json /app/package-lock.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/server/package.json ./apps/server/package.json
COPY --from=production-deps /app/apps/client/package.json ./apps/client/package.json

COPY apps/server ./apps/server
COPY --from=build /app/apps/client/dist ./apps/client/dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npm", "start", "-w", "server"]
