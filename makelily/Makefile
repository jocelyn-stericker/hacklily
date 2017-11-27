.PHONY: help serve server run start build test test-watch

help:
	@echo 'Options: '
	@echo ' - make serve'
	@echo ' - make test-watch (runs tests when things change)'
	@echo ' - make build'
	@echo
	@echo 'Other options: '
	@echo ' - make deps (asserts system dependencies are installed, installs npm packages)'
	@echo '             (`make serve` runs this for you)'
	@echo ' - make test (runs tests once)'

deps:
	yarn

serve: start

server: start

run: start

start: deps
	@yarn start

build: deps
	rm -fr build
	# If we want a demo site...
	#@yarn build
	./node_modules/.bin/tsc

test: deps
	@env CI=1 yarn test

test-watch: deps
	@yarn test
