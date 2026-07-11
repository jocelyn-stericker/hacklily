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

export const APP_STYLE = {
  errorDecoration:
    "border-2 border-red-600 text-red-600 italic font-bold underline",
  errorMask:
    "bg-black text-white absolute inset-y-0 left-[50%] p-4 text-center",
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
