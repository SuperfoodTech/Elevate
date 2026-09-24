# Stage 1: Build production static files
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code and config
COPY . .

# Compile TypeScript and bundle with Vite
RUN npm run build

# Stage 2: Production web server
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
