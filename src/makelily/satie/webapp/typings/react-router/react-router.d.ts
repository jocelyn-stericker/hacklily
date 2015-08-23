// Type definitions for React Router 0.13.3
// Project: https://github.com/rackt/react-router
// Definitions by: Yuichi Murata <https://github.com/mrk21>, Václav Ostrožlík <https://github.com/vasek17>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "react-router" {

  import React = require("react");

  //
  // Transition
  // ----------------------------------------------------------------------
  interface Transition {
    path: string;
    abortReason: any;
    retry(): void;
    abort(reason?: any): void;
    redirect(to: string, params?: {}, query?: {}): void;
    cancel(): void;
    from: (transition: Transition, routes: Route[], components?: React.ReactElement<any>[], callback?: (error?: any) => void) => void;
    to: (transition: Transition, routes: Route[], params?: {}, query?: {}, callback?: (error?: any) => void) => void;
  }

  interface TransitionStaticLifecycle {
    willTransitionTo?(
      transition: Transition,
      params: {},
      query: {},
      callback: Function
    ): void;

    willTransitionFrom?(
      transition: Transition,
      component: React.ReactElement<any>,
      callback: Function
    ): void;
  }

  // Redirect
  interface RedirectProp {
    path?: string;
    from?: string;
    to?: string;
  }
  class Redirect extends React.Component<RedirectProp, any> { render(): any }

  // Route
  interface RouteProp {
    name?: string;
    path?: string;
    component?: any;
    components?: {[key: string]: any};
    ignoreScrollBehavior?: boolean;
  }
  class Route extends React.Component<RouteProp, any> { render(): any }
  class Router extends React.Component<any, any> { render(): any }
  
  interface CreateRouteOptions {
    name?: string;
    path?: string;
    ignoreScrollBehavior?: boolean;
    isDefault?: boolean;
    isNotFound?: boolean;
    onEnter?: (transition: Transition, params: {}, query: {}, callback: Function) => void;
    onLeave?: (transition: Transition, wtf: any, callback: Function) => void;
    component?: Function;
    parentRoute?: Route;
  }

  type CreateRouteCallback = (route: Route) => void;

  function createRoute(callback: CreateRouteCallback): Route;
  function createRoute(options: CreateRouteOptions | string, callback: CreateRouteCallback): Route;
  function createDefaultRoute(options?: CreateRouteOptions | string): Route;
  function createNotFoundRoute(options?: CreateRouteOptions | string): Route;

  interface CreateRedirectOptions extends CreateRouteOptions {
    path?: string;
    from?: string;
    to: string;
    params?: {};
    query?: {};
  }
  function createRedirect(options: CreateRedirectOptions): Redirect;
  function createRoutesFromReactChildren(children: Route): Route[];

  //
  // Components
  // ----------------------------------------------------------------------
  // Link
  interface LinkProp {
    activeClassName?: string;
    activeStyle?: {};
    to: string;
    params?: {};
    query?: {};
    onClick?: Function;
    className?: string;
  }
  class Link extends React.Component<LinkProp, any> {
    render(): any;
    handleClick(event: any): void;
    getHref(): string;
    getClassName(): string;
    getActiveState(): boolean;
  }

  //
  // Top-Level
  // ----------------------------------------------------------------------
  interface Router extends React.ReactElement<any> {
    run(callback: RouterRunCallback): void;
  }

  interface RouterState {
    path: string;
    action: string;
    pathname: string;
    params: {};
    query: {};
    routes: Route[];
  }

  interface RouterCreateOption {
    routes: Route;
    location?: LocationBase;
    scrollBehavior?: ScrollBehaviorBase;
    onError?: (error: any) => void;
    onAbort?: (error: any) => void;
  }

  type RouterRunCallback = (Handler: React.Component<any, any>, state: RouterState) => void;

  function create(options: RouterCreateOption): Router;
  function run(routes: React.ReactElement<any>, callback: RouterRunCallback): Router;
  function run(routes: React.ReactElement<any>, location: LocationBase, callback: RouterRunCallback): Router;


  //
  // Location
  // ----------------------------------------------------------------------
  interface LocationBase {
    getCurrentPath(): void;
    toString(): string;
  }
  interface Location extends LocationBase {
    push(path: string): void;
    replace(path: string): void;
    pop(): void;
  }

  interface LocationListener {
    addChangeListener(listener: Function): void;
    removeChangeListener(listener: Function): void;
  }

  interface HashLocation extends Location, LocationListener { }
  interface HistoryLocation extends Location, LocationListener { }
  interface RefreshLocation extends Location { }
  interface StaticLocation extends LocationBase { }
  interface TestLocation extends Location, LocationListener { }

  var HashLocation: HashLocation;
  var HistoryLocation: HistoryLocation;
  var RefreshLocation: RefreshLocation;
  var StaticLocation: StaticLocation;
  var TestLocation: TestLocation;


  //
  // Behavior
  // ----------------------------------------------------------------------
  interface ScrollBehaviorBase {
    updateScrollPosition(position: { x: number; y: number; }, actionType: string): void;
  }
  interface ImitateBrowserBehavior extends ScrollBehaviorBase { }
  interface ScrollToTopBehavior extends ScrollBehaviorBase { }

  var ImitateBrowserBehavior: ImitateBrowserBehavior;
  var ScrollToTopBehavior: ScrollToTopBehavior;


  //
  // Mixin
  // ----------------------------------------------------------------------
  interface Navigation {
    makePath(to: string, params?: {}, query?: {}): string;
    makeHref(to: string, params?: {}, query?: {}): string;
    transitionTo(to: string, params?: {}, query?: {}): void;
    replaceWith(to: string, params?: {}, query?: {}): void;
    goBack(): void;
  }

  interface State {
    getPath(): string;
    getRoutes(): Route[];
    getPathname(): string;
    getParams(): {};
    getQuery(): {};
    isActive(to: string, params?: {}, query?: {}): boolean;
  }

  var Navigation: Navigation;
  var State: State;


  //
  // History
  // ----------------------------------------------------------------------
  interface History {
    back(): void;
    length: number;
  }
  var History: History;
}
