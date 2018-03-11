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

import { css } from "aphrodite";
import React from "react";
import * as ReactModal from "react-modal";

import { MODAL_STYLE } from "./styles";

/**
 * A modal that is rendered when this song is being edited in another tab.
 * There's no escaping this modal. You need to reload or close the tab to continue.
 */
export default class ModalLocked extends React.PureComponent {
  render(): JSX.Element {
    return (
      <ReactModal
        className={css(MODAL_STYLE.modal)}
        contentLabel="Opened in another tab..."
        isOpen={true}
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            This song was opened in another tab. You can only edit in one tab at
            once. If you have closed the other tab, you may{" "}
            <a href={window.location.toString()}>resume editing here</a>.
          </div>
        </div>
      </ReactModal>
    );
  }
}

export function lock(songID: string): void {
  // This is a trick to send a notification to other pages editing this document.
  // Other tabs can listen to the 'storage' event and lock when startedEditedNotification is set to
  // a song they are editing.
  localStorage.setItem("startedEditingNotification", songID);
  localStorage.removeItem("startedEditingNotification");
}

let editingNotificationHandler: null | ((ev: StorageEvent) => void) = null;
/**
 * Calls handler when another tab starts editing a song.
 */
export function setEditingNotificationHandler(
  handler: null | ((songID: string) => void),
): void {
  if (editingNotificationHandler) {
    window.removeEventListener("storage", editingNotificationHandler);
    editingNotificationHandler = null;
  }
  if (handler) {
    editingNotificationHandler = (ev: StorageEvent): void => {
      if (ev.key === "startedEditingNotification" && ev.newValue) {
        handler(ev.newValue);
      }
    };
    window.addEventListener("storage", editingNotificationHandler);
  }
}
