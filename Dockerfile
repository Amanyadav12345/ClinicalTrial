# Use an official Node.js runtime as base image
FROM node:18-alpine

# Create and set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy entire project, including the script
COPY . .

# Make the script executable
RUN chmod +x ./executable.sh

# Expose the port your app runs on
EXPOSE 3000

# Use the shell script as entrypoint
CMD ["sh", "./executable.sh"]

