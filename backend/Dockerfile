FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies so TypeScript works)
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Expose the port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]
