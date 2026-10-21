# ---- Stage 1: build ----
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Dependency manifests first: the `npm ci` layer stays cached until they change
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Source last: editing a .ts file only invalidates the layers from here down
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ---- Stage 2: runtime ----
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma

USER node
EXPOSE 8080
CMD ["node", "dist/main/server.js"]
