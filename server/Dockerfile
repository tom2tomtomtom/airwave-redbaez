FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
# Create app directory
WORKDIR /app
# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
# Copy only production dependencies and built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
# Use the non-root user
USER nodejs
# Set environment variables
ENV NODE_ENV=production
ENV USE_REAL_REDIS=true
ENV USE_REAL_SUPABASE=true
# Expose port
EXPOSE 3001
# Start the server
CMD ["node", "dist/index.js"]
