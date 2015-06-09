help:
	@echo 'Usage:'
	@echo 'make watch    Run a development server on 0.0.0.0:4200'
	@echo 'make build    Build production "dist/" folder'
	@echo 'make deploy   Deploy to Github'

watch:
	node ./playground-server.js

build: clean
	./node_modules/.bin/webpack -p
	cp -rf ./static/* ./dist/satie/
	cd ./dist/satie; \
	touch ./.nojekyll; \
	sed -i '' 's,"/,"https://ripieno.github.io/satie/,g' ./index.html; \
	mkdir tests; \
	ln -s ../index.html tests/; \
	mkdir _term; \
	ln -s ../index.html _term/; \
	cd tests; \
	node --harmony -e ' \
	    Array.prototype.forEach.call("0123456789", a => \
	    Array.prototype.forEach.call("0123456789 ", b => \
	    Array.prototype.forEach.call(b === " " ? " " : " qwertyuiopasdfghjklzxcvbnm", c => \
	    console.log("ln -s ../_term " + a + b + c + ";"))))' | bash --

deploy:
	cd ../; make build
	make build
	cd ./dist/satie; \
	git init; \
	git remote add origin git@github.com:ripieno/satie; \
	git fetch origin; \
	git add .; \
	git reset origin/gh-pages --soft; \
	git commit -m 'Automated Deployment'; \
	git push origin master:gh-pages

clean:
	rm -rf ./dist

