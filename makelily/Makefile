##
# (C) Josh Netterfield 2015
# Part of the Dragon MIDI/audio library <https://github.com/ripieno/ripieno>.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
##

.PHONY: build lint test tsd _gentestsuite _tsc _stageOnly _testOnly _lintOnly test_all

all: build test


# ---- Node dependencies ----------------------------------------------------------

./uittest/node_modules/tsd/build/cli.js:
	cd ./uitest; npm install


# ---- Standard target ------------------------------------------------------------

dist/*.js: build

build: _tsc _stageOnly

NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
INFO_COLOR=\033[36;01m

OK_STRING=$(OK_COLOR)  ...ok!$(NO_COLOR)
TSC_STRING=$(INFO_COLOR)» Building from tsconfig.json...$(NO_COLOR)
WATCH_STRING=$(INFO_COLOR)» Watching from tsconfig.json...$(NO_COLOR)
STAGE_STRING=$(INFO_COLOR)» Staging *.d.ts, *.js, *.js.map...$(NO_COLOR)
LINT_STRING=$(INFO_COLOR)» Linting *.ts...$(NO_COLOR)
TEST_STRING=$(INFO_COLOR)» Testing __test__*.js ...$(NO_COLOR)
CLEAN_STRING=$(INFO_COLOR)» Deleting generated code ...$(NO_COLOR)
COVERAGE_STRING=$(INFO_COLOR)» Writing coverage info for __test__*.js to ./coverage ...$(NO_COLOR)
WARN_STRING=$(WARN_COLOR)[WARNINGS]$(NO_COLOR)

# ---- Other build modes ----------------------------------------------------------

watch-electron:
	./scripts/run-uitest.sh

lint: uitest/node_modules/.bin/tslint
	@printf "$(LINT_STRING)\n"
	@git ls-files | grep [a-zA-Z][a-zA-Z].tsx\\?$$ | xargs ./uitest/node_modules/.bin/tslint -c ./tslint.json
