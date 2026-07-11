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

import { Button, Drawer, Position, Tooltip } from "@blueprintjs/core";
import React from "react";

interface Props {
  loading: boolean;
  logs: string | null;
}

/**
 * Renders a logs button, that when hovered, expands to show the output from Lilypond.
 *
 * This is visible in the app whenever the preview is visible.
 */
const Logs: React.FC<Props> = (props) => {
  const { logs, loading } = props;

  const [showLogDrawer, setShowLogDrawer] = React.useState<boolean>(false);

  const handleClose = React.useCallback(() => {
    setShowLogDrawer(false);
  }, []);

  const handleOpen = React.useCallback(() => {
    setShowLogDrawer(true);
  }, []);

  const error = !logs || logs.includes("error") || logs.includes("warning");
  const icon = error && !loading ? "warning-sign" : "info-sign";

  const btn = (
    <Button
      loading={loading}
      intent={error && !loading ? "warning" : "none"}
      large={true}
      onClick={handleOpen}
      icon={icon}
    >
      Logs
    </Button>
  );

  return (
    <div className="absolute right-5 bottom-2.5">
      <Drawer
        isOpen={showLogDrawer}
        title="Logs"
        onClose={handleClose}
        size="45%"
        icon={icon}
      >
        <pre className="pt-5 pb-5 mt-0 mb-0 mr-0 ml-5 overflow-auto whitespace-pre-wrap">
          {logs}
        </pre>
      </Drawer>
      <Tooltip
        disabled={loading}
        content={
          <pre className="max-h-[calc(100vh-100px)] whitespace-pre-wrap overflow-hidden m-0 relative pb-4 after:content-[''] after:text-white after:absolute after:-bottom-4 after:font-bold after:w-full after:h-10 after:bg-gradient-to-b after:from-transparent after:to-[rgb(57,75,89)]">
            {logs}
          </pre>
        }
        position={Position.TOP}
      >
        {btn}
      </Tooltip>
    </div>
  );
};

export default Logs;
