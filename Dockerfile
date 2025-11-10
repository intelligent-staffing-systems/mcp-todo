# Use official Node.js LTS image
FROM node:20-slim

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies (better-sqlite3 needs native compilation)
# Skip prepare scripts (husky is a devDependency) and rebuild better-sqlite3
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild better-sqlite3

# Copy application files
COPY . .

# Create directory for SQLite database (will be mounted as volume)
RUN mkdir -p /data

# Expose port (Fly.io sets PORT env var to 8080)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
