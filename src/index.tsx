// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import ErrorBoundary from "#/components/ErrorBoundary";
import { TooltipProvider } from "#/components/ui/tooltip.tsx";

import { getRouter } from "./router";

import "./index.css";

const router = getRouter();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

void router.load().then(() => {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ErrorBoundary>,
  );
});
