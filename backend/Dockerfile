FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies so TypeScript works)
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Generate Prisma client (if needed)
# RUN npx prisma generate

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
