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

import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import {
  CirclePlus,
  Code,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Import,
  LogOut,
  Music,
  Save,
  Sun,
} from "lucide-react";
import React from "react";

import { Auth } from "./auth";

interface Props {
  auth: Auth | null;
  canCreateNew: boolean;
  canExport: boolean;
  canSave: boolean;
  canSaveAs: boolean;
  songURL: string | null;
  colourScheme: "vs-dark" | "vs";
  onExportLy(): any;
  onExportMIDI(): any;
  onExportPDF(): any;
  onDeleteSong(song: string): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onShowClone(): void;
  onShowOpen(): void;
  onShowNew(): void;
  onShowPublish(): void;
  onSignIn(): void;
  onSignOut(): void;
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;
}

/**
 * Renders the File menu.
 * The menu button is rendered by <Header />
 */
export default class FileMenu extends React.PureComponent<Props> {
  render(): JSX.Element {
    const {
      auth,
      canCreateNew,
      canExport,
      canSave,
      canSaveAs,
      onSignOut,
      onShowAbout,
      onShowClone,
      onShowOpen,
      onExportLy,
      onExportMIDI,
      onExportPDF,
      onShowNew,
      onShowPublish,
      songURL,
    } = this.props;

    let signOut: React.ReactNode;
    if (auth) {
      signOut = (
        <MenuItem
          onClick={onSignOut}
          icon={<LogOut size="1em" />}
          text="Sign out"
        />
      );
    }

    const tutorial: React.ReactNode = (
      <MenuItem
        href={`http://lilypond.org/doc/v${
          process.env.REACT_APP_STABLE_LILYPOND_VERSION?.split(".")
            .slice(0, 2)
            .join(".") ?? "2.26"
        }/Documentation/learning/index`}
        rel="noopener noreferrer"
        target="_blank"
        text="LilyPond manual&hellip;"
      />
    );

    const about: React.ReactNode = (
      <MenuItem onClick={onShowAbout} text="About Hacklily" />
    );

    return (
      <Menu>
        <MenuItem
          icon={<CirclePlus size="1em" />}
          text="New song"
          onClick={onShowNew}
          disabled={!canCreateNew}
        />
        <MenuDivider />
        <MenuItem
          icon={<FolderOpen size="1em" />}
          text="Open&hellip;"
          onClick={onShowOpen}
        />
        <MenuItem
          icon={<Import size="1em" />}
          text="Import MusicXML&hellip;"
          href="/musicxml2ly.html"
        />
        <MenuItem
          icon={<Save size="1em" />}
          text="Save"
          disabled={!canSave}
          onClick={onShowPublish}
        />
        <MenuItem
          icon={<Copy size="1em" />}
          text="Save as&hellip;"
          onClick={onShowClone}
          disabled={!canSaveAs}
        />
        <MenuItem
          icon={<Download size="1em" />}
          text="Export"
          disabled={!canExport}
        >
          <MenuItem
            onClick={onExportLy}
            icon={<Code size="1em" />}
            text="LilyPond source"
          />
          <MenuItem
            onClick={onExportPDF}
            icon={<FileText size="1em" />}
            text="PDF"
          />
          <MenuItem
            onClick={onExportMIDI}
            icon={<Music size="1em" />}
            text="MIDI"
          />
          {songURL && <MenuDivider />}
          {songURL && (
            <MenuItem
              href={songURL.replace(/\.ly$/, ".pdf")}
              text="View on GitHub&hellip;"
            />
          )}
        </MenuItem>
        <MenuDivider />
        {this.renderSetColourScheme()}
        {signOut}
        <MenuDivider />
        {tutorial}
        {about}
      </Menu>
    );
  }

  private handleColourSchemeToggled = (): void => {
    const newColourScheme: "vs-dark" | "vs" =
      this.props.colourScheme === "vs-dark" ? "vs" : "vs-dark";

    this.props.setColourScheme(newColourScheme);
  };

  private renderSetColourScheme(): React.ReactNode {
    const text: string =
      this.props.colourScheme === "vs-dark"
        ? "Use light colour scheme"
        : "Use dark colour scheme";

    return (
      <MenuItem
        onClick={this.handleColourSchemeToggled}
        icon={<Sun size="1em" />}
        text={text}
      />
    );
  }
}
