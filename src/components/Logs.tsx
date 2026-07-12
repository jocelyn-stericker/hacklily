// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "#/components/ui/drawer.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip.tsx";

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

  const btn = (
    <Button
      variant={error && !loading ? "destructive" : "outline"}
      size="lg"
      onClick={handleOpen}
    >
      Logs
    </Button>
  );

  return (
    <div className="absolute right-5 bottom-2.5">
      <Drawer open={showLogDrawer} onOpenChange={handleClose} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-2">
              {error && !loading ? (
                <AlertTriangleIcon className="size-4 text-destructive" />
              ) : (
                <InfoIcon className="size-4 text-muted-foreground" />
              )}{" "}
              Logs
            </DrawerTitle>
          </DrawerHeader>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap p-2 m-0">
            {logs}
          </pre>
        </DrawerContent>
        {!loading && (
          <Tooltip>
            <TooltipTrigger render={btn} />
            <TooltipContent
              side="top"
              className="max-h-[calc(100vh-100px)] overflow-hidden"
            >
              <pre className="whitespace-pre-wrap m-0">{logs}</pre>
            </TooltipContent>
          </Tooltip>
        )}
        {loading && btn}
      </Drawer>
    </div>
  );
};

export default Logs;
