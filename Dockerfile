# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project
COPY . .

# Expose port (you can change if your app uses another)
EXPOSE 3000

# Command to run the app
CMD ["node", "backend/server.js"]
