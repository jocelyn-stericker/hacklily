help:
	@echo 'Usage:'
	@echo 'make serve    Run a development server on 0.0.0.0:4200'
	@echo 'make build    Build production "dist/" folder'
	@echo 'make deploy   Deploy to Github'

NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
INFO_COLOR=\033[36;01m

OK_STRING=$(OK_COLOR)  ...ok!$(NO_COLOR)
TSC_STRING=webapp$(INFO_COLOR)» Building from tsconfig.json...$(NO_COLOR)
BUNDLE_PROD_STRING=webapp$(INFO_COLOR)» Bundling...$(NO_COLOR)
WATCH_STRING=webapp$(INFO_COLOR)» Watching from tsconfig.json...$(NO_COLOR)
LINT_STRING=webapp$(INFO_COLOR)» Linting *.ts...$(NO_COLOR)
CLEAN_STRING=webapp$(INFO_COLOR)» Deleting generated code ...$(NO_COLOR)

serve:
	@clear
	@printf "$(WATCH_STRING)\n"
	@CLEAN="1"; \
	INIT="0"; \
	../node_modules/.bin/tsc -w | \
	while read line; do \
	    if [[ $$line == *TS6042* ]]; then \
		if [[ "$$CLEAN" == "1" ]]; then \
		    printf "webapp$(INFO_COLOR)» $$line$(NO_COLOR)\n"; \
		    cd ./src; \
		    find -type f -name \\*.css -exec install -m 644-D {} ../dist/{} ';'; \
		    cd ..; \
		    if [[ "$$INIT" == "0" ]]; then \
			if [[ "x$$RUN_LINT" != "x" ]]; then \
			    ../node_modules/.bin/nodemon --quiet --exec "make lint" -w ./dist/ -d 2 &\
			else \
			    printf "webapp$(WARN_COLOR)» Linting is disabled. Run 'make watch RUN_LINT=1' to run tests. $(NO_COLOR)\n"; \
			fi; \
			if [[ "x$$RUN_DEVSRV" != "x" ]]; then \
			    ../node_modules/.bin/webpack-dev-server \
				--debug \
				--devtool source-map \
				--output-pathinfo \
				--hot \
				--no-info \
				--progress \
				--history-api-fallback \
				--content-base static \
				--watch \
				--host 0.0.0.0 \
				--port 4200 & \
			else \
			    printf "webapp$(WARN_COLOR)» The dev server is disabled. Run 'make watch RUN_DEVSRV=1' to enable. $(NO_COLOR)\n"; \
			fi; \
			INIT="1"; \
		    fi; \
		else \
		    printf "webapp$(ERROR_COLOR)» $$line$(NO_COLOR)\n"; \
		fi; \
	    elif [[ $$line == *TS6032* ]]; then \
		clear; \
		CLEAN="1"; \
		printf "webapp$(INFO_COLOR)» $$line$(NO_COLOR)\n"; \
	    else \
		CLEAN="0"; \
		printf "webapp$(ERROR_COLOR)» $$line$(NO_COLOR)\n"; \
	    fi; \
	done;

lint:
	@find ./src -regex ".*[a-zA-Z0-9_][a-zA-Z0-9_]\.ts" | sed 's/\(.*\)/-f\1/g' | xargs ../node_modules/.bin/tslint -c ./tsconfig.json

build: clean lint
	./node_modules/.bin/webpack -p
	cp -RLf ./static/* ./dist/satie/
	cd ./dist/satie; \
	touch ./.nojekyll; \
	sed -i.bak 's,"/,"https://nettek.ca/satie/,g' ./index.html; \
	rm *.bak; \
	mkdir tests; \
	ln -s ../index.html tests/; \
	mkdir _term; \
	ln -s ../index.html _term/; \
	cd tests; \
	node --harmony -e 'Array.prototype.forEach.call("0123456789", a => Array.prototype.forEach.call("0123456789 ", b => Array.prototype.forEach.call(b === " " ? " " : " qwertyuiopasdfghjklzxcvbnm", c => console.log("ln -s ../_term " + a + b + c + ";"))))' | bash --

deploy:
	cd ../; make build
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
