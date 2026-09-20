FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files from backend folder
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy rest of backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 10000

# Start server
CMD ["npm", "start"]
