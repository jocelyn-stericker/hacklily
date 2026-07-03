# syntax=docker/dockerfile:1.6
# Multi-stage build of LilyPond 2.27.1 from source. Works on both
# linux/amd64 and linux/arm64 since LilyPond publishes no upstream
# linux-arm64 binary. Drops the previous lyp/lys dependency entirely;
# the in-process Scheme render server lives in lily-server.scm.

#---------------------------------------------------------------------
# Stage 1: build LilyPond from source.
#---------------------------------------------------------------------
FROM debian:sid-slim AS builder

ARG LILYPOND_VERSION=2.27.1
ARG LILYPOND_TARBALL_URL=https://gitlab.com/lilypond/lilypond/-/releases/v${LILYPOND_VERSION}/downloads/lilypond-${LILYPOND_VERSION}.tar.gz
# Pinned checksum of the lilypond-2.27.1 release tarball. The build
# verifies this unconditionally (fail-closed); override it when bumping
# LILYPOND_VERSION. Leaving it blank now fails the build rather than
# silently compiling an unverified download.
ARG LILYPOND_TARBALL_SHA256=ab81ac451ee247db3af0980bef6d87834647fd90ad04e1d98730f1bfd285d393

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
# Stage 1b: build a patched libcairo.
#
# Cairo's SVG surface never implemented the tag/link callback (only the
# PDF surface did), so it silently drops the CAIRO_TAG_LINK annotations
# LilyPond emits for point-and-click -- SVG output loses the textedit://
# links the editor uses to jump from a rendered note to its source.
# svg-links.patch adds an SVG tag callback (adapted from the unmerged
# upstream Cairo MR !254) that emits them as transparent <a><rect>
# overlays. LilyPond links libcairo dynamically, so the runtime stage
# just swaps in this .so -- no LilyPond rebuild needed.
#---------------------------------------------------------------------
FROM debian:sid-slim AS cairo-builder

ARG CAIRO_VERSION=1.18.4
# Pinned checksum of the cairo release tarball (fail-closed). Must match
# the libcairo2 version debian:sid-slim ships so the built .so is a
# drop-in for the apt one; bump both together.
ARG CAIRO_SHA256=445ed8208a6e4823de1226a74ca319d3600e83f6369f99b14265006599c32ccb

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        meson \
        ninja-build \
        pkg-config \
        ca-certificates \
        wget \
        xz-utils \
        libfontconfig1-dev \
        libfreetype6-dev \
        libpng-dev \
        libpixman-1-dev \
        zlib1g-dev \
        libglib2.0-dev \
        python3 \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN wget -q -O cairo.tar.xz "https://cairographics.org/releases/cairo-${CAIRO_VERSION}.tar.xz" && \
    echo "${CAIRO_SHA256}  cairo.tar.xz" | sha256sum -c - && \
    tar xf cairo.tar.xz

COPY svg-links.patch /src/
RUN cd cairo-${CAIRO_VERSION} && \
    patch -p1 < /src/svg-links.patch && \
    meson setup build --prefix=/usr --buildtype=release \
        -Dtests=disabled -Dxlib=disabled -Dxcb=disabled -Dspectre=disabled && \
    ninja -C build && \
    DESTDIR=/cairo-install ninja -C build install

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

# Swap the stock libcairo for the point-and-click-patched build from the
# cairo-builder stage (see svg-links.patch). LilyPond loads libcairo at
# runtime, so overwriting the apt .so (same soname/version) in place is
# enough -- no LilyPond rebuild. Overwriting the resolved real file keeps
# the libcairo.so.2 symlink valid.
COPY --from=cairo-builder /cairo-install/ /cairo-install/
RUN set -eux; \
    apt_real=$(readlink -f "$(ls /usr/lib/*/libcairo.so.2 | head -1)"); \
    built=$(find /cairo-install -type f -name 'libcairo.so.2.*' | head -1); \
    cp -f "$built" "$apt_real"; \
    ldconfig; \
    rm -rf /cairo-install

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