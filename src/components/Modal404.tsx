// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

interface Props {
  onHide(): void;
}

/**
 * A 404 modal that is rendered when the 404 query is set.
 *
 * 404.html (which GitHub pages will render for every unmatched URL) redirects to
 * '/?404=1', which renders <App 404="1" />, which results in this modal being shown.
 */
const Modal404: React.FC<Props> = React.memo(function Modal404(props) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && props.onHide()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Page not found</DialogTitle>
        </DialogHeader>
        <div>
          <p>The requested page may have been moved or deleted.</p>
          <p>
            Hacklily is a free online sheet-music editor and publishing tool.
            While you are here, why not give it a try?
          </p>
        </div>
        <DialogFooter>
          <Button onClick={props.onHide} variant="default">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default Modal404;
