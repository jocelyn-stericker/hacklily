// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

export interface Song {
  /**
   * The SHA of the clean version of the song. Null if no version has been saved.
   *
   * Used to detect changes from other sources while editing a song.
   */
  baseSHA: string | null;

  /**
   * The version of the song, with all the edits.
   */
  src: string;
}

let cache: { [key: string]: Song } | null = null;

export function getDirtySongs(): { [key: string]: Song } {
  if (!cache) {
    cache = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key: string | null = localStorage.key(i);
      if (!key) continue;
      const value: string | null = localStorage.getItem(key);
      if (!value) continue;
      if (key.startsWith("dirtySong::")) {
        cache[key.split("::")[1]] = JSON.parse(value);
      }
    }
  }

  return cache;
}

export function editSong(songID: string, song: Song): void {
  localStorage[`dirtySong::${songID}`] = JSON.stringify(song);
  invalidate();
}

export function markSongClean(song: string): void {
  delete localStorage[`dirtySong::${song}`];
  invalidate();
}

export function getHideUnstableNotification(): boolean {
  return localStorage.hideUnstableNotification || false;
}

export function setHideUnstableNotification(hide: boolean) {
  if (hide) {
    localStorage.hideUnstableNotification = true;
  } else {
    delete localStorage.hideUnstableNotification;
  }
  invalidate();
}

const listeners = new Set<() => void>();

function invalidate(): void {
  cache = null;
  for (const fn of listeners) fn();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (_e) => {
    invalidate();
  });
}

export function subscribeToLocalStorage(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
