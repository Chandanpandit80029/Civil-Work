# Use Node.js LTS
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for prisma CLI)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client (schema is at prisma/schema.prisma)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"]