/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
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

import { RefreshCw } from "lucide-react";
import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

/**
 * A modal that is rendered when this song is being edited in another tab.
 * There's no escaping this modal. You need to reload or close the tab to continue.
 */
const ModalLocked: React.FC = React.memo(function ModalLocked() {
  return (
    <Dialog
      open={true}
      /*
       * Inescapable by design: `open` is pinned to `true` with no `onOpenChange`,
       * so base-ui cannot close it on Escape or outside-click. Pointer dismissal
       * is disabled explicitly and the close button is hidden. Don't add an
       * `onOpenChange` here without re-establishing this guarantee.
       */
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Locked</DialogTitle>
        </DialogHeader>
        <div>
          This song was opened in another tab. You can only edit in one tab at
          once. If you have closed the other tab, you may{" "}
          <a onClick={() => window.location.reload()}>resume editing here</a>.
        </div>
        <DialogFooter>
          <Button onClick={() => window.location.reload()} variant="default">
            <RefreshCw size="1em" />
            Reload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ModalLocked;

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
