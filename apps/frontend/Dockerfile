FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci --workspace apps/frontend --include-workspace-root=false

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
WORKDIR /app/apps/frontend
COPY --from=build /app/apps/frontend/.next/standalone/. ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/frontend/.next/static ./.next/static
COPY --from=build /app/apps/frontend/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
