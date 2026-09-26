# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and prisma definitions
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client and compile TypeScript to dist
RUN npx prisma generate && npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy dependencies and compiled artifacts from builder with proper node user ownership
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Use non-root user
USER node

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
