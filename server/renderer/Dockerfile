FROM debian:jessie-slim
RUN apt-get update && apt-get install --no-install-recommends  -y rubygems ruby2.1-dev make cmake pkg-config lilypond libssl-dev gcc curl psmisc emacs-intl-fonts xfonts-intl-.* ttf-kochi-gothic ttf-kochi-mincho xfonts-bolkhov-75dpi xfonts-cronyx-100dpi xfonts-cronyx-75dpi
RUN curl -L https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64 > /usr/local/bin/jq && chmod +x /usr/local/bin/jq && echo 42 | jq .
RUN adduser --disabled-password --gecos '' r && \
    chown -R r /tmp && \
    chown -R r /home/r && \
    gem install lyp && \
    su r -c "lyp install lys" && \
    chown r -R /tmp/*
RUN apt-get remove -y make cmake pkg-config libssl-dev gcc curl && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*
COPY render-impl.bash /usr/local/bin
USER r
CMD render-impl.bash
