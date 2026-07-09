import * as React from "react";
import { render } from "react-dom";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./app";
import Home from "./home";
import Tests from "./tests";
import Sandbox from "./sandbox";

const prefix = process.env.PLAYGROUND_PREFIX || "";

const rootInstance = render(
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
  </BrowserRouter>,
  document.getElementById("root"),
);

if ((module as any).hot) {
  require("react-hot-loader/Injection").RootInstanceProvider.injectProvider({
    getRootInstances: function () {
      // Help React Hot Loader figure out the root component instances on the page:
      return [rootInstance];
    },
  });
}
