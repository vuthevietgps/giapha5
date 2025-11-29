FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev=false

# Build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY .env ./
RUN npm run build

# Production image
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# runtime uploads folder
RUN mkdir -p /app/uploads/members

EXPOSE 3000
CMD ["node", "dist/main.js"]
