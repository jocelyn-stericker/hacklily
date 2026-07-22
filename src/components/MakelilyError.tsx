// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import { cn } from "../lib/utils";
import makelilyStyles from "./makelilyStyles";
import type { MakelilyToolProps } from "./MakelilyToolProps";

/**
 * Placeholder for when an error was caught.
 */
const ToolError: React.FC<MakelilyToolProps> = () => {
  return (
    <span className={cn(makelilyStyles.tool)}>
      <div className={cn(makelilyStyles.section)}>
        <h3 className={cn(makelilyStyles.toolHeading)}>
          It&apos;s not your fault!
        </h3>
      </div>
      <div className={cn(makelilyStyles.section)}>
        The tool you were using crashed, so it has been closed. Please send an
        email to `jocelyn@nettek.ca` so I can try fixing it.
      </div>
    </span>
  );
};

export default ToolError;
