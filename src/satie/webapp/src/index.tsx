import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import * as React from "react";
import { createRoot } from "react-dom/client";

// @ts-ignore: TS2307 - path alias not configured in this tsconfig
import ErrorBoundary from "#/ErrorBoundary";

import App from "./app";
import Home from "./home";
import Sandbox from "./sandbox";
import Tests from "./tests";

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const testsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tests",
  component: Tests,
});

const testsIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tests/$id",
  component: function TestsWithId() {
    const TestsComponent = Tests as React.FC<{ testId?: string }>;
    return <TestsComponent />;
  },
});

const sandboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sandbox",
  component: Sandbox,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  testsRoute,
  testsIdRoute,
  sandboxRoute,
]);

const router = createRouter({
  routeTree,
  basepath: "/satie",
  defaultNotFoundComponent: () => <Home />,
} as any);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>,
);
