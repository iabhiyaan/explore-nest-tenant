## Project setup

```bash
# Copy .env.example to .env
cp .env.example .env

# Update the .env file with your database credentials and JWT secret
```

## With Docker

### Development

```bash
# Create the network first (one-time)
docker network create sansar-network

# Start with hot reload - code changes reflect immediately
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Without Docker

### Development

```bash
# Install dependencies
nvm use && npm install

# Seed the database with initial data
nvm use && npm run seed

# Start development server with hot reload
nvm use && npm run start:dev
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
