# --- Stage 1: Build & Dependency installation ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package management files
COPY package*.json ./

# Install ALL dependencies (including devDependencies if you have build tools)
RUN npm ci

# Copy the rest of your application code
COPY . .

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

# Copy application source code from the builder stage
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package*.json ./

# Install ONLY production dependencies to keep the image slim
RUN npm ci --only=production

# Run as a non-root user for security compliance
USER node

EXPOSE 3000

CMD ["node", "src/app.js"]