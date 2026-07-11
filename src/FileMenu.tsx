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
} from "lucide-react";
import React from "react";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "#/components/ui/dropdown-menu.tsx";

import type { Auth } from "./auth";

interface Props {
  auth: Auth | null;
  canCreateNew: boolean;
  canExport: boolean;
  canSave: boolean;
  canSaveAs: boolean;
  songURL: string | null;
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
}

/**
 * Renders the File menu.
 * The menu button is rendered by <Header />
 */
const FileMenu: React.FC<Props> = React.memo(function FileMenu(props) {
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
  } = props;

  let signOut: React.ReactNode;
  if (auth) {
    signOut = (
      <DropdownMenuItem onClick={onSignOut}>
        <LogOut size="1em" />
        Sign out
      </DropdownMenuItem>
    );
  }

  const tutorial: React.ReactNode = (
    <DropdownMenuItem
      onClick={() =>
        window.open(
          `http://lilypond.org/doc/v${
            process.env.REACT_APP_STABLE_LILYPOND_VERSION?.split(".")
              .slice(0, 2)
              .join(".") ?? "2.26"
          }/Documentation/learning/index`,
          "_blank",
          "noopener noreferrer",
        )
      }
    >
      LilyPond manual&hellip;
    </DropdownMenuItem>
  );

  const about: React.ReactNode = (
    <DropdownMenuItem onClick={onShowAbout}>About Hacklily</DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenuItem onClick={onShowNew} disabled={!canCreateNew}>
        <CirclePlus size="1em" />
        New song
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onShowOpen}>
        <FolderOpen size="1em" />
        Open&hellip;
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => window.open("/musicxml2ly", "_self")}>
        <Import size="1em" />
        Import MusicXML&hellip;
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onShowPublish} disabled={!canSave}>
        <Save size="1em" />
        Save
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onShowClone} disabled={!canSaveAs}>
        <Copy size="1em" />
        Save as&hellip;
      </DropdownMenuItem>
      <DropdownMenuSub disabled={!canExport}>
        <DropdownMenuSubTrigger>
          <Download size="1em" />
          Export
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={onExportLy} disabled={!canExport}>
            <Code size="1em" />
            LilyPond source
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPDF} disabled={!canExport}>
            <FileText size="1em" />
            PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportMIDI} disabled={!canExport}>
            <Music size="1em" />
            MIDI
          </DropdownMenuItem>
          {songURL && <DropdownMenuSeparator />}
          {songURL && (
            <DropdownMenuItem
              onClick={() =>
                window.open(songURL.replace(/\.ly$/, ".pdf"), "_blank")
              }
            >
              View on GitHub&hellip;
            </DropdownMenuItem>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      {signOut}
      <DropdownMenuSeparator />
      {tutorial}
      {about}
    </>
  );
});

export default FileMenu;
