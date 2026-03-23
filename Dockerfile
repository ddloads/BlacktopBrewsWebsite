FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Ensure data and uploads directories exist and have correct permissions
RUN mkdir -p data uploads && \
    chmod -R 777 data uploads

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# The ADMIN_PASSWORD should be set via docker-compose or portainer
# ENV ADMIN_PASSWORD=blacktopbrews2026

EXPOSE 3000

CMD ["node", "server.js"]
