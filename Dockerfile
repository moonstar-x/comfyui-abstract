FROM node:lts-slim AS base
WORKDIR /app

# Build the UI.
FROM base AS ui-build
WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Build the API.
FROM base AS api-build
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/ ./
RUN npm run build

# Install only the API's runtime dependencies.
FROM base AS api-dependencies
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

# Serve the UI through the API's own HTTP server.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
ENV APP_BUILD_DIR=/app/ui

WORKDIR /app/api
COPY --from=api-dependencies /app/api/node_modules ./node_modules
COPY --from=api-build /app/api/package.json ./
COPY --from=api-build /app/api/dist ./dist
COPY --from=api-build /app/api/migrations ./migrations
COPY --from=ui-build /app/ui/dist /app/ui

# The public directory holds generated outputs and uploads, so the server must be able to write to it.
RUN mkdir -p public && chown node:node public
USER node

EXPOSE 4000
CMD ["node", "dist/index.js"]
