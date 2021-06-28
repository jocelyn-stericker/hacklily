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

import { Classes, Dialog } from "@blueprintjs/core";
import React from "react";

import RPCClient from "../RPCClient";

interface Props {
  rpc: RPCClient;
  onHide(): void;
}

export default class MusicXML2LyModal extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog title="Import MusicXML" isOpen={true} onClose={this.props.onHide}>
        <div className={Classes.DIALOG_BODY}>
          <p>Select a MusicXML file to import into Hacklily.</p>
          <input type="file" value="" onChange={this.convert} />
        </div>
      </Dialog>
    );
  }

  convert = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!ev.target.files) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.doLoad(reader.result as any);
      reader.onload = null;
    };
    reader.readAsText(ev.target.files[0]);
  };

  doLoad = async (src: string) => {
    console.log(src);
    const rendered = await this.props.rpc.call("render", {
      backend: "musicxml2ly",
      version: "stable",
      src,
    });
    const file = rendered.result.files[0];
    alert(rendered.result.logs);
    location.href = `/#src=${encodeURIComponent(file)}`;
  };
}
