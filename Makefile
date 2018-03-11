.PHONY: help deps-frontend deps-backend deps serve server run start serve-qt-bundle build-backend build-frontend build run-backend test test-watch deploy-frontend deploy fmt

help:
	@echo 'Common options: '
	@echo ' - make serve (runs frontend and backend without GitHub integration)'
	@echo ' - make test-watch (runs tests when things change)'
	@echo ' - make fmt (formats code using prettier -- also try editor integrations)'
	@echo
	@echo 'Other options: '
	@echo ' - make deps (asserts system dependencies are installed, installs npm packages)'
	@echo '             (`make serve` runs this for you)'
	@echo ' - make serve-qt-bundle (serves a bundle that the desktop app can use)'
	@echo ' - make run-backend (runs backend without frontend and without GitHub integration)'
	@echo ' - yarn start (runs frontend without a backend)'
	@echo ' - make test (runs tests once)'
	@echo ' - make deploy-frontend (deploys to GitHub pages -- runs automatically on Travis)'

fmt: deps
	@./node_modules/.bin/prettier --write './src/**{ts,tsx,js,jsx}'

deps-frontend:
	@yarn

deps-backend:
	@if ! which qmake; then echo "Please install Qt 5.9 or better."; exit 1; fi
	@if ! which docker; then echo "Please install Docker."; exit 1; fi

deps: deps-frontend deps-backend
	git submodule update --init --recursive

serve: start

server: start

run: start

start: deps
	@make run-backend & yarn start & wait %1; wait %2

serve-qt-bundle: deps-frontend
	@env REACT_APP_STANDALONE=yes make serve

build-backend: deps-backend
	mkdir -p ./server/build
	cd ./server/build && \
	qmake ../ws-server && \
	make -j7

build-frontend: deps-frontend
	@yarn build

build: build-backend build-frontend

run-backend: build-backend
	cd ./server/build && \
	./ws-server --renderer-path ../renderer --renderer-docker-tag hacklily-renderer --jobs 1 --ws-port 2000


test: deps-frontend
	@env CI=1 yarn test

test-watch: deps-frontend
	@yarn test

deploy-frontend: test build-frontend
	@./scripts/deploy.sh

deploy: deploy-frontend
