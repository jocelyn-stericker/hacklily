import React from 'react'
import { Auth } from './ModalLogin';

interface Props {
  auth: Auth | null;
  showUnsavedChangesDialog: boolean;
  showOpenDialog: boolean;
  showSaveAs: boolean;
  showSaving: boolean;
  showImport: boolean;

  onNewSong: () => void;
  onOpen: () => void;
  onImport: (name: string, src: string) => void;
  onImportRejected: () => void;
  onRequestImport: () => void;
  onSave: () => void;
  onSaveAsCancel: () => void;
  onSaveAsFile: (file: string, source: "remote" | "local") => void;
  onFind: () => void;
  onFindNext: () => void;
  onViewMode: () => void;
  onSelectAll: () => void;
  onSplitMode: () => void;
  onCodeMode: () => void;
  onAboutHacklily: () => void;
  onOpenCancel: () => void;
  onOpenFile: (filename: string, source: "remote" | "local", sha: string, contents: string) => void;
  onExportRequested: (filename: string) => void;
  onLocalFilesChanged: () => void;
  onUnsavedChangesSave: () => void;
  onUnsavedChangesCancel: () => void;
  onUnsavedChangesDiscard: () => void;
}

export default class StandaloneAppHost extends React.Component<Props> {
  localFiles: string[] | null;
  renderLy: (src: string, filetype: string) => Promise<{content: string[], logs: string}>;
  save: (src: string, filename: string) => Promise<void>;
}