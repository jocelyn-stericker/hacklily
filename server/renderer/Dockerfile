FROM debian:sid-slim
RUN echo \
  'deb http://snapshot.debian.org/archive/debian/20230531T025815Z/ sid  main' > /etc/apt/sources.list.d/snapshot.list \
  && printf "Package: ghostscript\nPin: origin snapshot.debian.org\nPin-Priority: 990\n\n" > /etc/apt/preferences.d/snapshot \
  && printf "Package: libgs10\nPin: origin snapshot.debian.org\nPin-Priority: 990\n\n" >> /etc/apt/preferences.d/snapshot \
  && printf "Package: libgs10-common\nPin: origin snapshot.debian.org\nPin-Priority: 990\n\n" >> /etc/apt/preferences.d/snapshot \
  &&  apt-get -o Acquire::Check-Valid-Until=false update
RUN apt-get -o Acquire::Check-Valid-Until=false install --no-install-recommends -y ruby curl bzip2 git locales gsfonts ghostscript fonts-dejavu-extra psmisc emacs-intl-fonts xfonts-intl-.* fonts-ipafont-mincho xfonts-bolkhov-75dpi xfonts-cronyx-100dpi xfonts-cronyx-75dpi patch python3 adduser && \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && \
    curl -L https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64 > /usr/local/bin/jq && \
    chmod +x /usr/local/bin/jq && echo 42 | jq .
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
COPY no_lyp_check_update.patch /tmp
RUN adduser --disabled-password --gecos '' r && \
    chown -R r /tmp && \
    chown -R r /home/r && \
    curl -OL https://github.com/noteflakes/lyp/releases/download/1.3.8/lyp-1.3.8-linux-x86_64.tar.gz && \
    tar -xzf lyp-1.3.8-linux-x86_64.tar.gz && \
    chown -R r ./lyp-1.3.8-linux-x86_64 && \
    su r -c "./lyp-1.3.8-linux-x86_64/bin/lyp install self" && \
    cd ~r/.lyp && \
    patch -p0 < /tmp/no_lyp_check_update.patch && \
    rm /tmp/no_lyp_check_update.patch && \
    su r -c "source ~/.profile; lyp install lilypond@2.22.2 && cd; git clone https://github.com/lyp-packages/lys; lyp install lys@dev:~/lys" && \
    rm /home/r/.lyp/lilyponds/*/etc/relocate/gs.reloc && \
    rm /home/r/.lyp/lilyponds/*/bin/gs && \
    chown r -R /tmp/* && \
    chown nobody -R /home/r/.lyp/* /home/r/lys
RUN apt-get remove -y curl patch && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN su r -c "source ~/.profile; cd /tmp; echo '{c4}' | lilypond --verbose -"
COPY render-impl.bash /usr/local/bin
USER r
CMD render-impl.bash
