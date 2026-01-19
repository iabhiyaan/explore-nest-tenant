## Project setup

```bash
$ nvm use && npm install
```

## Environment Configuration

```bash
# Copy .env.example to .env
$ cp .env.example .env

# Update the .env file with your database credentials and other settings
```

## Database Setup

```bash
# Seed the database with initial data
$ nvm use && npm run seed
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ nvm use && npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```