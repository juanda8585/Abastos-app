# --- STAGE 1: Build the static assets ---
FROM node:20-alpine AS build-stage
WORKDIR /app

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the optimized production assets into the /app/dist folder
RUN npm run build

# --- STAGE 2: Serve with Nginx ---
FROM nginx:alpine
# Copy the compiled static assets from the build stage over to Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy a basic Nginx configuration to handle React Router client-side routing fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]