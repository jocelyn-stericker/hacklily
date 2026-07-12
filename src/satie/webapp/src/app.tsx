import { Link, Outlet, useLocation } from "@tanstack/react-router";
import * as React from "react";

import * as STYLES from "./app.css";

export default function App() {
  const { pathname } = useLocation();
  const topLink = pathname !== "/satie" && pathname !== "/satie/" && (
    <Link to="/satie" className={STYLES.toplink}>
      « Go home
    </Link>
  );
  return (
    <div>
      <header>
        <div className={STYLES.topbar} />
        {topLink}
      </header>
      <Outlet />
    </div>
  );
}
