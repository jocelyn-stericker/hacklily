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

# Stdin: one JSON request per line, {id, backend, version, src}.
# Stdout: one JSON response per line, {files, logs, midi}.
# stderr: lilypond / server log noise.
#
# A warm LilyPond process runs in the background running
# lily-server.scm, listening on TCP port 1225. For each request we
# open a fresh connection, write the source to
# /tmp/lyp/wrappers/hacklily.ly, send a compile s-expression, wait for
# the EOF sentinel (or a 5s timeout), then base64/json-
# encode the produced output files and emit one JSON response line.

set -u

cd /tmp
mkdir -p /tmp/lyp/wrappers

# Launch the warm LilyPond server in the background. It will print its
# log to stderr; we don't need it on stdout. We start it with --pdf and
# --svg so both formats are in LilyPond's output_formats_global list;
# the per-request backend is then selected via #(ly:set-option 'backend
# X) (already injected by renderer-server for SVG, default for PDF).
# PNG/PS are not currently supported by this server configuration.
bash -c "lilypond --pdf --svg -e '(load \"/usr/local/share/lily-server.scm\") (hacklily:start-server)' 1>&2" &

IFS="
"

while read -r line; do
    # Wait until the server is accepting connections.
    until printf "" 2>>/dev/null >>/dev/tcp/localhost/1225; do sleep 0.05; done

    backend=$(echo "$line" | jq -r .backend)

    if [ "$backend" == "musicxml2ly" ]; then
        # Clear any output left by a previous request on this (reused)
        # container so a failed conversion can't repackage stale source.
        rm -f hacklily.musicxml2ly.ly hacklily.err hacklily.err.json
        echo "$line" | jq -r .src | musicxml2ly - -o hacklily.musicxml2ly.ly 2> hacklily.err 1>&2
        # musicxml2ly writes nothing on a hard conversion failure; touch
        # both files so the jq below always has input and ALWAYS emits a
        # response line. Without this, a bad MusicXML upload produced no
        # output line at all, hanging renderer-server until its 8s
        # timeout and forcing a container teardown.
        touch hacklily.musicxml2ly.ly hacklily.err
        jq -Rs . hacklily.err > hacklily.err.json
        jq -Rsrc '{files: [.], logs: $errors, midi: ""}' hacklily.musicxml2ly.ly \
            --rawfile errors hacklily.err.json \
            2> /dev/null | jq -c '.logs |= fromjson'
        rm -f hacklily.musicxml2ly.ly hacklily.err hacklily.err.json
        continue
    fi

    echo "$line" | jq -r .src > /tmp/lyp/wrappers/hacklily.ly 2> /dev/null

    # Translate the requested backend into LilyPond long options.
    case "$backend" in
        svg) opts="--svg" ;;
        pdf) opts="--pdf" ;;
        png) opts="--png" ;;
        ps)  opts="--ps"  ;;
        *)   opts="--svg" ;;
    esac

    rm -f /tmp/lyp/wrappers/hacklily*."$backend" /tmp/lyp/wrappers/hacklily.midi 2>/dev/null

    # Open a TCP connection to the warm server, write the s-expr, read
    # until the worker closes the connection (EOF — the framing signal,
    # unfakeable by user source). The outer timeout (5s) is deliberately
    # shorter than the Rust harness's render timeout (8s) so the bash
    # emits its own error response before the harness kills the
    # container. No inner read timeout: a crash/kill of the worker that
    # skips shutdown is caught by the outer timeout; legitimate slow
    # renders with long pauses between log lines are not penalized.
    #
    # Logs are written to a file (not a bash variable) so they survive a
    # timeout kill. stdout stays clean for the JSON response.
    rm -f /tmp/lyp/wrappers/hacklily.logs
    timeout 5 bash -c '
        exec 3<>/dev/tcp/localhost/1225
        printf "%s\n" "$1" >&3
        # Read line-by-line, but also capture a trailing partial line
        # (one with no terminating newline). LilyPond progress messages
        # like "Drawing systems..." are written without a newline; the
        # following warning that would have supplied it may be suppressed
        # (ly:expect-warning), so read returns non-zero on EOF with the
        # partial line in $line -- print it before the loop exits.
        while IFS= read -r -u 3 line || [ -n "$line" ]; do
            printf "%s\n" "$line"
        done
    ' -- "(hacklily:compile-file \"/tmp/lyp/wrappers\" \"$opts\" \"/tmp/lyp/wrappers/hacklily.ly\")" > /tmp/lyp/wrappers/hacklily.logs 2>/dev/null
    status=$?
    # Strip the trailing newline added by the last printf so the logs
    # match LilyPond's native output (no trailing newline).
    [ -s /tmp/lyp/wrappers/hacklily.logs ] && truncate -s -1 /tmp/lyp/wrappers/hacklily.logs

    if [ $status -ne 0 ]; then
        if [ ! -s /tmp/lyp/wrappers/hacklily.logs ]; then
            # No logs at all: the connection bash never reached the warm
            # server, or it died before emitting anything. This
            # {"err":...} line fails renderer-server's canary check,
            # which recycles the (presumed unhealthy) container.
            echo '{"err": "Failed to render song."}'
            echo 'failed to render' >&2
            continue
        fi
        # Non-zero status WITH partial logs means the 5s timeout fired
        # mid-render. This previously slipped through as a "success" and
        # the half-written (or absent) output was packaged as a normal
        # response. Instead surface the partial logs plus an explicit
        # error as a proper {files,logs,midi} response (empty files): the
        # user sees the failure, the canary line in the partial logs is
        # preserved, and the container survives for reuse.
        printf '\nfailed to render: timed out after 5s' >> /tmp/lyp/wrappers/hacklily.logs
        jq -Rs . /tmp/lyp/wrappers/hacklily.logs > /tmp/lyp/wrappers/hacklily.logs.json 2>/dev/null
        jq -cn '{files: [""], logs: ($logs | fromjson), midi: ""}' \
            --rawfile logs /tmp/lyp/wrappers/hacklily.logs.json
        echo 'render timed out' >&2
        rm -f /tmp/lyp/wrappers/hacklily* > /dev/null 2>&1
        continue
    fi

    # Encode any produced output files. SVG is plain text; everything
    # else (PDF/PNG/MIDI) is base64'd.
    for f in /tmp/lyp/wrappers/hacklily*."$backend"; do
        if [ "/tmp/lyp/wrappers/hacklily*.$backend" == "$f" ]; then
            echo '""' > "/tmp/lyp/wrappers/hacklily-null.$backend.json"
        elif [ "$backend" == "svg" ]; then
            jq -Rs . "$f" > "$f.json" 2>&1
        else
            cat "$f" | base64 | jq -Rs . > "$f.json" 2>&1
        fi
    done
    touch /tmp/lyp/wrappers/hacklily.midi
    cat /tmp/lyp/wrappers/hacklily.midi | base64 | jq -Rs . > /tmp/lyp/wrappers/hacklily.midi.json 2>&1

    jq -Rs . /tmp/lyp/wrappers/hacklily.logs > /tmp/lyp/wrappers/hacklily.logs.json 2>&1

    # Assemble the final JSON response. jq 1.7+ removed --argfile, so
    # we use --rawfile (which reads the file as a string) and parse it
    # with fromjson in the filter.
    # Order the per-page files numerically. A plain glob sorts
    # lexically (hacklily-1, hacklily-10, hacklily-2, ...), which would
    # mis-order the pages of a 10+ page score in the files array; ls -v
    # uses natural/version ordering (hacklily-1 .. hacklily-2 .. -10).
    jq -src '{files: ., logs: ($logs | fromjson), midi: ($midi | fromjson)}' \
        $(ls -v /tmp/lyp/wrappers/hacklily*."$backend".json 2>/dev/null) \
        --rawfile logs /tmp/lyp/wrappers/hacklily.logs.json \
        --rawfile midi /tmp/lyp/wrappers/hacklily.midi.json \
        2> /dev/null

    rm -f /tmp/lyp/wrappers/hacklily* > /dev/null 2>&1
done < "${1:-/dev/stdin}"
