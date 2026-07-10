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
import { css, StyleSheet } from "aphrodite";
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
    <div className={css(styles.logsButtonWrapper)}>
      <Drawer
        isOpen={showLogDrawer}
        title="Logs"
        onClose={handleClose}
        size="45%"
        icon={icon}
      >
        <pre className={css(styles.logDrawer)}>{logs}</pre>
      </Drawer>
      <Tooltip
        disabled={loading}
        content={<pre className={css(styles.logPreview)}>{logs}</pre>}
        position={Position.TOP}
      >
        {btn}
      </Tooltip>
    </div>
  );
};

export default Logs;

export const styles = StyleSheet.create({
  logsButtonWrapper: {
    position: "absolute",
    right: 20,
    bottom: 10,
  },
  logPreview: {
    maxHeight: "calc(100vh - 100px)",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    margin: 0,
    position: "relative",
    paddingBottom: 16,
    ":after": {
      content: "''",
      color: "white",
      position: "absolute",
      bottom: -16,
      fontWeight: "bold",
      width: "100%",
      height: 40,
      background:
        "-webkit-linear-gradient( rgba(57, 75, 89, 0) 0%, rgba(57, 75, 89, 1) 100%)",
      backgroundImage:
        "-moz-linear-gradient( rgba(57, 75, 89, 0) 0%, rgba(57, 75, 89, 1) 100%), " +
        "-o-linear-gradient( rgba(57, 75, 89, 0) 0%, rgba(57, 75, 89, 1) 100%), " +
        "linear-gradient( rgba(57, 75, 89, 0) 0%, rgba(57, 75, 89, 1) 100%), " +
        "-ms-linear-gradient( rgba(57, 75, 89, 0) 0%, rgba(57, 75, 89, 1) 100%)",
    },
  },
  logDrawer: {
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
    marginLeft: 20,
    overflow: "auto",
    whiteSpace: "pre-wrap",
  },
  logPreviewHint: {
    marginTop: 0,
    marginBottom: 8,
  },
});
