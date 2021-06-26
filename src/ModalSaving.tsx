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

import { Classes, Dialog, Spinner } from "@blueprintjs/core";
import React from "react";

/**
 * A modal that is rendered while saving a song.
 * There's no escaping this modal. It's visible until saving completes.
 */
class ModalSaving extends React.PureComponent {
  render(): JSX.Element {
    return (
      <Dialog
        title="Saving, please wait&hellip;"
        isOpen={true}
        canOutsideClickClose={false}
        canEscapeKeyClose={false}
        isCloseButtonShown={false}
      >
        <div className={Classes.DIALOG_BODY}>
          <Spinner />
        </div>
      </Dialog>
    );
  }
}

export default ModalSaving;
