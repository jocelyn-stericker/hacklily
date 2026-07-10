import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// @ts-ignore: TS2307 - path alias not configured in this tsconfig
import ErrorBoundary from "#/ErrorBoundary";

import App from "./app";
import Home from "./home";
import Sandbox from "./sandbox";
import Tests from "./tests";

// @ts-ignore: TS2591 - process not typed in this context
const prefix = process.env.PLAYGROUND_PREFIX || "";

const root = createRoot(document.getElementById("root")!);

root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path={`${prefix}/`} element={<App />}>
          <Route index element={<Home />} />
          <Route path="tests" element={<Tests />} />
          <Route path="tests/:id" element={<Tests />} />
          <Route path="sandbox" element={<Sandbox />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>,
);
