# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Vite dev server runs on port 5173 by default, but we'll map it to 3000
# Expose the port Vite runs on (Vite's default is 5173, can be changed in vite.config.js or via CLI)
EXPOSE 5173

# Define the command to run the Vite dev server
# The --host flag is important to expose the server to the Docker network
CMD [ "npm", "run", "dev", "--", "--host" ]
