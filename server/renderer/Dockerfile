# syntax=docker/dockerfile:1.6
# Multi-stage build of LilyPond 2.26.0 (the current stable release
# branch) from source. Works on both linux/amd64 and linux/arm64 since
# LilyPond publishes no upstream linux-arm64 binary. Drops the previous
# lyp/lys dependency entirely; the in-process Scheme render server lives
# in lily-server.scm. The development branch (2.27.x) is built the same
# way in ../renderer-unstable.

#---------------------------------------------------------------------
# Stage 1: build LilyPond from source.
#---------------------------------------------------------------------
FROM debian:sid-slim AS builder

ARG LILYPOND_VERSION=2.26.0
ARG LILYPOND_TARBALL_URL=https://gitlab.com/lilypond/lilypond/-/releases/v${LILYPOND_VERSION}/downloads/lilypond-${LILYPOND_VERSION}.tar.gz
# Pinned checksum of the lilypond-2.26.0 release tarball. The build
# verifies this unconditionally (fail-closed); override it when bumping
# LILYPOND_VERSION. Leaving it blank now fails the build rather than
# silently compiling an unverified download.
ARG LILYPOND_TARBALL_SHA256=bbe82dbeba7f7f99ddcd8d1fa134a0d89cafa6e8f815fde5bb01f4208b06fe05

# Build dependencies (autotools-based). See INSTALL.txt sections
# 1.2.1 (runtime) and 1.2.2 (compile) for the canonical list.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        wget \
        autoconf \
        automake \
        pkg-config \
        bison \
        flex \
        libfl-dev \
        gettext \
        texinfo \
        texlive \
        texlive-fonts-recommended \
        texlive-metapost \
        t1utils \
        fontforge \
        ghostscript \
        python3 \
        guile-3.0-dev \
        libgmp-dev \
        libfontconfig1-dev \
        libfreetype6-dev \
        libharfbuzz-dev \
        libpango1.0-dev \
        libcairo2-dev \
        libglib2.0-dev \
        libpng-dev \
        libreadline-dev \
        libltdl-dev \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN wget -q -O lilypond.tar.gz "${LILYPOND_TARBALL_URL}" && \
    echo "${LILYPOND_TARBALL_SHA256}  lilypond.tar.gz" | sha256sum -c - && \
    tar xzf lilypond.tar.gz && \
    rm lilypond.tar.gz

RUN mkdir -p /src/build && cd /src/build && \
    /src/lilypond-${LILYPOND_VERSION}/configure \
        --prefix=/usr/local \
        --disable-documentation && \
    make -j"$(nproc)" && \
    make install

# Smoke-test the freshly built binary.
RUN echo '{c4}' | lilypond - 2>/dev/null && ls -la /usr/local/bin/lilypond

#---------------------------------------------------------------------
# Stage 2: runtime image.
#---------------------------------------------------------------------
FROM debian:sid-slim

# Runtime dependencies. We keep the font set the old image shipped so
# existing scores render with the same metrics. Guile 3.0 is required
# for LilyPond 2.27. ghostscript is used by the PS/PDF backends.
# python3 ships musicxml2ly.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        adduser \
        guile-3.0 \
        ghostscript \
        gsfonts \
        fonts-dejavu-extra \
        fonts-noto \
        fonts-ipafont-mincho \
        fonts-urw-base35 \
        emacs-intl-fonts \
        xfonts-bolkhov-75dpi \
        xfonts-cronyx-100dpi \
        xfonts-cronyx-75dpi \
        fontconfig \
        python3 \
        jq \
        locales-all \
        libgmp10 \
        libltdl7 \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libpangocairo-1.0-0 \
        libcairo2 \
        libfontconfig1 \
        libfreetype6 \
        libpng16-16 \
        libharfbuzz0b \
        libglib2.0-0 \
        && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Pull the installed LilyPond tree out of the builder.
COPY --from=builder /usr/local /usr/local

# Make sure the dynamic linker can find any libs LilyPond installed
# under /usr/local/lib (e.g. its own .so files, Guile extensions).
RUN ldconfig

# Create an unprivileged user. The whole tree under /tmp must be
# writeable by it (the render loop writes source/output files there).
RUN adduser --disabled-password --gecos '' r && \
    chown -R r /tmp && \
    chown -R r /home/r && \
    mkdir -p /tmp/lyp/wrappers && \
    chown -R r /tmp/lyp

COPY lily-server.scm /usr/local/share/
COPY render-impl.bash /usr/local/bin/
RUN chmod +x /usr/local/bin/render-impl.bash

# Build a complete, valid per-user fontconfig cache so the first
# fc-match in a fresh worker process is fast (~0.01s, not ~4s of
# cache rebuild). Without this the smoke test below only warms the
# fonts that {c4} touches, leaving an incomplete cache that fontconfig
# later declares invalid, forcing a multi-second rescan on every
# forked worker and tripping the inner render timeout. See render-impl.bash
# for the matching runtime validity check.
#
# Normalize the font directory mtimes to a fixed value *before* fc-cache
# so the value fontconfig bakes into the cache header (offset 0x38) is a
# known constant (1767225600). This alone is NOT enough: a directory's
# mtime is a side effect of populating it, so when the image layers are
# unpacked at container start the font files get written into these dirs
# and re-stamp their mtime to the unpack wall-clock time. fontconfig's
# read-side FcDirCacheValid then compares that live st_mtime against the
# baked constant, sees a mismatch, and triggers a ~4s rescan on every
# forked worker (SOURCE_DATE_EPOCH doesn't help — the check uses the real
# st_mtime, not SDE). render-impl.bash reasserts the same mtime at
# startup, before the first fc-match, so the live value matches the baked
# header; chown the dirs to r so that runtime touch (which runs as r) can.
RUN chown -R r /usr/share/fonts && \
    find /usr/share/fonts -type d -exec touch -d @1767225600 {} + && \
    su r -c "fc-cache -f"

# Verify the toolchain end-to-end before declaring the image good.
RUN su r -c "cd /tmp && echo '{c4}' | lilypond -"

USER r
WORKDIR /tmp
CMD ["/usr/local/bin/render-impl.bash"]