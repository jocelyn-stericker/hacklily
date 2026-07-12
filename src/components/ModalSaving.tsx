// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { Loader2 } from "lucide-react";
import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

/**
 * A modal that is rendered while saving a song.
 * There's no escaping this modal. It's visible until saving completes.
 */
const ModalSaving: React.FC = React.memo(function ModalSaving() {
  return (
    <Dialog
      open={true}
      /*
       * Inescapable by design: `open` is pinned to `true` with no `onOpenChange`,
       * so base-ui cannot close it on Escape or outside-click (a controlled dialog
       * with no change handler ignores internal close requests). We also disable
       * pointer dismissal explicitly and hide the close button. Don't add an
       * `onOpenChange` here without re-establishing this guarantee.
       */
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Saving, please wait&hellip;</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin size-6" />
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ModalSaving;
