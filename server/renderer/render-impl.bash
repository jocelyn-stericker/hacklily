#!/bin/bash
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

IFS="
"
export RUBYOPT="-KU -E utf-8:utf-8"
cd /tmp
cat << EOF > /tmp/start.ly
\\require "lys"
#(lys:start-server)
EOF
until lilypond /tmp/start.ly; do
    echo "Lilypond crashed... restarting"
    sleep 0.5
done 1>&2 &
sleep 2
while read -r line
do
    echo "$line" | jq -r .src > hacklily.ly 2> /dev/null
    backend=$( echo "$line" | jq -r .backend )

    timeout -s9 4 lyp compile -s /tmp/hacklily.ly 2> hacklily.err 1>&2
    if [ $? -eq 137 ]; then
        killall lilypond > /dev/null 2>&1
        echo '{"err": "Failed to render song."}'
        sleep 2
        continue
    fi;

    for f in hacklily*.$backend
    do
        if [ "hacklily*.$backend" == "$f" ]; then
            echo '""' > "hacklily-null.$backend.json"
        elif [ "$backend" == "svg" ]; then
            jq -Rs . $f > $f.json 2>&1
        else
            cat $f | base64 | jq -Rs . > $f.json 2>&1
        fi
    done
    jq -Rs . hacklily.err > hacklily.err.json
    jq -src '{files: ., logs: $errors}' hacklily*.$backend.json --argfile errors hacklily.err.json 2> /dev/null

    rm hacklily* > /dev/null 2> /dev/null
done < "${1:-/dev/stdin}"
