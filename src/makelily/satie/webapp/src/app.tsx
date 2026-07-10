import * as React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";

import { prefix } from "./config";

import * as STYLES from "./app.css";

export default function App() {
  const location = useLocation();
  const path = location.pathname;
  const topLink = path !== prefix + "/" && path !== prefix && (
    <Link className={STYLES.toplink} to={`${prefix}/`}>
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
