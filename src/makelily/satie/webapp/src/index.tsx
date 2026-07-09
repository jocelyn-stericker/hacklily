import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ErrorBoundary from "#/ErrorBoundary";
import App from "./app";
import Home from "./home";
import Tests from "./tests";
import Sandbox from "./sandbox";

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
