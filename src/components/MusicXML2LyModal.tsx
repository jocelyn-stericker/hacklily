// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { track } from "#/lib/analytics";
import type RPCClient from "#/lib/RPCClient";

interface Props {
  rpc: RPCClient;
  onHide(): void;
}

export default class MusicXML2LyModal extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && this.props.onHide()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import MusicXML</DialogTitle>
          </DialogHeader>
          <div>
            <p>Select a MusicXML file to import into Hacklily.</p>
            <input type="file" value="" onChange={this.convert} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  convert = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!ev.target.files) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void this.doLoad(reader.result as any);
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
    track("musicxml-import");
    alert(rendered.result.logs);
    location.href = `/#src=${encodeURIComponent(file)}`;
  };
}
