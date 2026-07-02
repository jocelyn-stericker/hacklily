FROM nixos/nix:latest

# Enable flakes + the new nix CLI (needed by `nix develop` / nix-direnv).
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf \
    && echo "max-jobs = auto" >> /etc/nix/nix.conf

# Host-level tooling that must exist OUTSIDE the flake devshell.
# The base nixos/nix image already ships bash, coreutils, gnutar, gzip and
# git — so only direnv + nix-direnv (for auto-loading the flake) are needed.
RUN nix profile install \
      nixpkgs#direnv \
      nixpkgs#nix-direnv

# Wire nix-direnv's fast use_flake + the direnv bash hook into the shell rc,
# so interactive terminals auto-load the flake devshell on cd.
RUN mkdir -p /root/.config/direnv \
    && echo 'source /root/.nix-profile/share/nix-direnv/direnvrc' \
         > /root/.config/direnv/direnvrc \
    && echo 'eval "$(direnv hook bash)"' >> /root/.bashrc

# VS Code Server compat: its bundled node is glibc-linked and expects the
# loader at /lib64. nixos/nix is non-FHS, so symlink glibc's loader into place.
RUN mkdir -p /lib64 \
    && ln -sf "$(nix eval --raw nixpkgs#glibc.out)/lib64/ld-linux-x86-64.so.2" \
         /lib64/ld-linux-x86-64.so.2

SHELL ["/root/.nix-profile/bin/bash", "-lc"]
