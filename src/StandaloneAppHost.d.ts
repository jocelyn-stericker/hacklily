import React from 'react'
import { Auth } from './ModalLogin';

interface Props {
  auth: Auth | null;
  showUnsavedChangesDialog: boolean;
  showOpenDialog: boolean;

  onNewSong: () => void;
  onOpen: () => void;
  onImport: (name: string, src: string) => void;
  onSave: () => void;
  onFind: () => void;
  onFindNext: () => void;
  onViewMode: () => void;
  onSplitMode: () => void;
  onCodeMode: () => void;
  onAboutHacklily: () => void;
  onOpenCancel: () => void;
  onExportRequested: (filename: string) => void;
  onLocalFilesChanged: () => void;
  onShowLilypondDocumentation: () => void;
  onUnsavedChangesSave: () => void;
  onUnsavedChangesCancel: () => void;
  onUnsavedChangesDiscard: () => void;
}

export default class StandaloneAppHost extends React.Component<Props, void> {
  localFiles: string[] | null;
}