BACKEND_DIR := harvest-finance/backend
FRONTEND_DIR := harvest-finance/frontend

.PHONY: help dev build test lint format \
        db:migrate db:migrate:revert db:seed db:seed:clear db:seed:reset \
        docker:up docker:down docker:logs

help:
	@grep -E '^[a-zA-Z_:/-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

## ── Development ────────────────────────────────────────────────────────────────

dev: ## Start backend in watch mode
	cd $(BACKEND_DIR) && npm run start:dev

dev:frontend: ## Start frontend dev server
	cd $(FRONTEND_DIR) && npm run dev

dev:all: ## Start all services via Docker Compose
	docker compose up -d

## ── Build ───────────────────────────────────────────────────────────────────

build: ## Build the backend
	cd $(BACKEND_DIR) && npm run build

build:frontend: ## Build the frontend
	cd $(FRONTEND_DIR) && npm run build

## ── Code quality ────────────────────────────────────────────────────────────

lint: ## Lint and auto-fix backend source
	cd $(BACKEND_DIR) && npm run lint

format: ## Format backend source with Prettier
	cd $(BACKEND_DIR) && npm run format

## ── Tests ───────────────────────────────────────────────────────────────────

test: ## Run backend unit tests
	cd $(BACKEND_DIR) && npm run test

test:cov: ## Run backend unit tests with coverage report
	cd $(BACKEND_DIR) && npm run test:cov

test:e2e: ## Run backend end-to-end tests
	cd $(BACKEND_DIR) && npm run test:e2e

test:watch: ## Run backend unit tests in watch mode
	cd $(BACKEND_DIR) && npm run test:watch

## ── Database ────────────────────────────────────────────────────────────────

db:migrate: ## Run pending TypeORM migrations
	cd $(BACKEND_DIR) && npm run migration:run

db:migrate:revert: ## Revert the last TypeORM migration
	cd $(BACKEND_DIR) && npm run migration:revert

db:seed: ## Seed the database with initial data
	cd $(BACKEND_DIR) && npm run seed

db:seed:clear: ## Clear all seeded data from the database
	cd $(BACKEND_DIR) && npm run seed:clear

db:seed:reset: ## Clear and re-seed the database
	cd $(BACKEND_DIR) && npm run seed:reset

## ── Docker ──────────────────────────────────────────────────────────────────

docker:up: ## Start all Docker Compose services in the background
	docker compose up -d

docker:down: ## Stop and remove all Docker Compose services
	docker compose down

docker:logs: ## Tail logs for all running Docker Compose services
	docker compose logs -f
