// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

const makelilyStyles = {
  help: "left-[15px] opacity-0 pointer-events-none absolute top-[22px] transition-opacity duration-500 ease-in-out z-[1]",
  helpVisible: "opacity-100 pointer-events-auto",
  insert:
    "bg-[rgb(0,42,74)] border-[rgb(0,42,74)] border border-t-0 border-b border-l border-r rounded-b-[4px] text-white cursor-pointer text-[12px] h-[30px] w-full hover:bg-[rgb(26,68,100)] shadow-[transparent_0px_0px_4px_4px]",
  lyPreview: "bg-[#f6f7f7] rounded-t-[4px] h-20 mb-0 overflow-scroll p-[15px]",
  outputOptions: "text-[12px] absolute right-[10px] top-[18px]",
  paletteSml: "text-[22px]",
  radioGroup: "ml-[15px]",
  resetFont: "text-[1em]",
  section: "mt-5 relative first-of-type:mt-0",
  selectableDescription:
    "bg-[rgb(0,42,74)] absolute bottom-0 text-white text-[10px] h-[14px] left-0 leading-[14px] right-0 text-center",
  selectableList: "flex flex-wrap",
  selectableOption:
    "border border-[#D6D8DA] rounded-[4px] text-[#aeaeae] cursor-pointer inline-block m-[15px] overflow-hidden relative w-[50px] hover:bg-[#f6f7f7]",
  selectableSelected: "bg-[#f6f7f7] cursor-default",
  spacer: "flex-grow",
  tool: "box-border flex flex-col h-full overflow-x-hidden overflow-y-scroll p-[25px_15px_15px_15px]",
  toolHeading: "text-[18px] m-0",
} as const;

export default makelilyStyles;
