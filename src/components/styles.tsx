// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

export const APP_STYLE = {
  errorDecoration:
    "border-2 border-red-600 text-red-600 italic font-bold underline",
  monacoHidden: "hidden",
  pendingPreviewMask:
    "bg-black absolute inset-0 left-[50%] animate-[previewPending_2s_ease-in-out_infinite]",
  previewPendingMaskModeView: "left-0",
  sheetMusicError: "text-[#aeaeae] inline-block text-center align-middle",
  sheetMusicView:
    "items-center bg-white border-0 absolute inset-y-0 right-0 flex justify-center overflow-hidden border-l boder-black",
  sheetMusicViewEdit: "left-[50%]",
  sheetMusicViewView: "left-0",
  urgentEditorNotification:
    "bg-[#1e1e1e] text-white font-bold left-0 p-2.5 top-0 z-[100000]",
  urgentEditorNotificationClose: "text-[#aeaeae]",
} as const;
