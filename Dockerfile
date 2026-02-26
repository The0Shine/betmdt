# Build Stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for tsc)
RUN npm install --legacy-peer-deps

# Copy source code and required type declarations
COPY src ./src

# Build TypeScript
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production-only dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

EXPOSE 8386

CMD ["node", "dist/src/server.js"]
