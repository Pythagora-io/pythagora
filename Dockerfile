FROM node:18

# Create app directory
RUN mkdir /app

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm i -g pythagora

# Copy source code
COPY . .

VOLUME [ "/data" ]
