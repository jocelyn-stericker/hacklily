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
