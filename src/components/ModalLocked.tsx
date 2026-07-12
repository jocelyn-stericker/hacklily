// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

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
