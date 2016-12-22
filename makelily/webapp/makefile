help:
	@echo 'Usage:'
	@echo 'make watch    Enter development mode'
	@echo 'make build    Build production "dist/" folder'
	@echo 'make deploy   Deploy to Github'
	@echo 'make lint     Lint TypeScript'

NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
INFO_COLOR=\033[36;01m

OK_STRING=$(OK_COLOR)  ...ok!$(NO_COLOR)
TSC_STRING=satie/webapp$(INFO_COLOR)» Building from tsconfig.json...$(NO_COLOR)
BUNDLE_PROD_STRING=satie/webapp$(INFO_COLOR)» Bundling...$(NO_COLOR)
WATCH_STRING=satie/webapp$(INFO_COLOR)» Watching from tsconfig.json...$(NO_COLOR)
LINT_STRING=satie/webapp$(INFO_COLOR)» Linting *.ts...$(NO_COLOR)
CLEAN_STRING=satie/webapp$(INFO_COLOR)» Deleting generated code ...$(NO_COLOR)

TS_FILES = $(shell find src/ -type f -name '*.ts')

watch:
	@printf "$(WATCH_STRING)\n"
	@bash -c "rm -rf ./dist"
	@bash -c "trap 'trap - TERM; kill 0' INT TERM EXIT; \
	./bin/watch.sh"

lint:
	@printf "$(LINT_STRING)\n"
	@bash -c "set -o pipefail; ../node_modules/.bin/tslint $(TS_FILES) | sed -e \"s/\(.*\)/[tslint] \x1b[31;01m\1\x1b[0m/\""

build: clean lint
	bash -c "../node_modules/.bin/tsc"
	bash -c "cd ./src; \
	    find . -type f -name \"*.css\" -exec install -m 644 \"{}\" ../dist/webapp/src/{} \";\" ;"
	bash -c "../node_modules/.bin/webpack -p --config \"webpack.config.prod.js\""
	bash -c "cp -RLf ./static/* ./dist/satie/"
	bash -c "cp ../dist/satie-bundled-min.js ./dist/satie/satie.js"
	bash -c "mv ./dist/satie/index-prod.html ./dist/satie/index.html"
	bash -c "cd ./dist/satie; \
	touch ./.nojekyll; \
	mkdir tests; \
	ln -s ../index.html tests/; \
	mkdir _term; \
	ln -s ../index.html _term/; \
	cd tests; \
	node --harmony -e 'Array.prototype.forEach.call(\"0123456789\", a => Array.prototype.forEach.call(\"0123456789 \", b => Array.prototype.forEach.call(b === \" \" ? \" \" : \" qwertyuiopasdfghjklzxcvbnm\", c => console.log(\"ln -s ../_term \" + a + b + c + \";\"))))' | bash --"

deploy:
	make build
	git fetch origin
	git branch -f gh-pages origin/gh-pages
	cd ./dist/satie; \
	git init; \
	git remote add local ../../../.git; \
	git fetch local; \
	git remote add origin git@github.com:jnetterf/satie; \
	git fetch origin; \
	git add .; \
	git reset local/gh-pages --soft; \
	git commit -m 'Automated Deployment'; \
	git push origin master:gh-pages

clean:
	rm -rf ./dist
