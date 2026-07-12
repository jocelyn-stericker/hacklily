// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

// TanStack Router root configuration.

import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { NotFoundRouteProps } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    basepath: "/",
    routeTree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: function NotFound(_: NotFoundRouteProps) {
      return <p>Not Found</p>;
    },
  } as any);

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
