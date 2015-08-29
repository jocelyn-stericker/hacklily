help:
	@echo 'Usage:'
	@echo 'make serve    Run a development server on 0.0.0.0:4200'
	@echo 'make build    Build production "dist/" folder'
	@echo 'make deploy   Deploy to Github'

serve:
	./node_modules/.bin/forever --minUptime 2000 --spinSleepTime 1 ./playground-server.js

lint:
	@find ./src -regex ".*[a-zA-Z0-9_][a-zA-Z0-9_]\.ts" | sed 's/\(.*\)/-f\1/g' | xargs ../node_modules/.bin/tslint -c ./tsconfig.json

build: clean lint
	./node_modules/.bin/webpack -p
	cp -RLf ./static/* ./dist/satie/
	cd ./dist/satie; \
	touch ./.nojekyll; \
	sed -i.bak 's,"/,"https://jnetterf.github.io/satie/,g' ./index.html; \
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

patch:
	git submodule update --init --recursive
	cd ./vendor/react-router && npm install
	rm -rf ./vendor/react-router/node_modules/react
	ln -s ../ ./node_modules/dashboard-ui
	git apply --stat --apply json3.patch
