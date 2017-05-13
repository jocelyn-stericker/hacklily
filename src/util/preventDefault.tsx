/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

/**
 * Returns an event handler that cancels the event. In particular, it calls
 * preventDefault and stopPropagation.
 *
 * Accepts a callback function that can be called after this is called.
 *
 * Example: Click <a href="#" onClick={preventDefault(this._loadSong)}>here</a>
 *
 * @param cb {() => void} Callback to call after the event is cancelled.
 */
export default function preventDefault<T>(cb?: ((ev?: React.SyntheticEvent<T>) => void)):
    (ev: React.SyntheticEvent<T>) => void {

  return (ev: React.SyntheticEvent<T>): void => {
    ev.preventDefault();
    ev.stopPropagation();
    if (cb) {
      cb(ev);
    }
  };
}
