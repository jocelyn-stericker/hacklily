// Type definitions for react-router v1.0.0-rc1
// Project: https://github.com/rackt/react-router
// Definitions by: Sergey Buturlakin <http://github.com/sergey-buturlakin>
// Definitions: https://github.com/borisyankov/DefinitelyTyped


/// <reference path="../react/react.d.ts" />
/// <reference path="../history/history.d.ts"/>


declare namespace ReactRouter {

    // types based on https://github.com/rackt/react-router/blob/master/docs/Glossary.md

    import H = HistoryModule

    type Component = __React.ReactType

    type Components = { [key: string]: Component }

    type EnterHook = (nextState: RouterState, replaceState: RedirectFunction, callback?: Function) => any

    type LeaveHook = () => any

    type Params = Object

    type ParseQueryString = (queryString: H.QueryString) => H.Query

    type RedirectFunction = (state: H.LocationState, pathname: H.Pathname | H.Path, query?: H.Query) => void

    interface RouteComponentProps<P, R> {
        history?: History
        location?: Location
        params?: P
        route?: PlainRoute
        routeParams?: R
        routes?: PlainRoute[]
    }

    type RouteComponent = __React.ComponentClass<Object>

    type RouteConfig = RouteObject[]

    type RouteHook = (nextLocation?: Location) => any

    type RoutePattern = string

    type RouteObject = PlainRoute

    type StringifyQuery = (queryObject: H.Query) => H.QueryString

    interface RouterState {
        location: Location
        routes: RouteConfig
        params: Params
        components: Component[]
    }

    type RouteType = Route | IndexRoute | PlainRoute | Redirect

    type RouteTypes = RouteType | RouteType[]


    interface HistoryBase extends H.History {
        routes: PlainRoute[]
        parseQueryString?: ParseQueryString
        stringifyQuery?: StringifyQuery
    }

    type History = HistoryBase & H.HistoryQueries & HistoryRoutes


    interface RouterProps {
        history?: H.History
        children?: RouteTypes
        routes?:  RouteTypes // alias for children
        createElement?: (component: Component, props: Object) => any
        onError?: (err: any) => any
        onUpdate?: () => any
        parseQueryString?: ParseQueryString
        stringifyQuery?: StringifyQuery
    }
    interface Router extends __React.ComponentClass<RouterProps> {}
    interface RouterElement extends __React.ReactElement<RouterProps> {}
    const Router: Router


    interface LinkProps extends __React.HTMLAttributes {
        activeStyle?: __React.CSSProperties
        activeClassName?: string
        onlyActiveOnIndex?: boolean
        to: RoutePattern
        query?: H.Query
        state?: H.LocationState
    }
    interface Link extends __React.ComponentClass<LinkProps> {}
    interface LinkElement extends __React.DOMElement<LinkProps> {}
    const Link: Link


    interface RoutePropsBase  {
        children?: RouteTypes
        ignoreScrollBehavior?: boolean
        component?: Component
        components?: Components
        getComponent?: (location: Location, cb: (err: any, component?: Component) => void) => void
        getComponents?: (location: Location, cb: (err: any, components?: Components) => void) => void
        onEnter?: EnterHook
        onLeave?: LeaveHook
    }

    interface RouteProps extends RoutePropsBase {
        path?: RoutePattern
    }
    interface Route extends __React.ComponentClass<RouteProps> {}
    interface RouteElement extends __React.ReactElement<RouteProps> {}
    const Route: Route


    interface PlainRoute extends RouteProps {
        childRoutes: RouteTypes
        getChildRoutes: (location: Location, cb: (err: any, routesArray: RouteTypes) => void) => void
    }


    interface RedirectProps {
        path?: RoutePattern
        from?: RoutePattern // alias for path
        to: RoutePattern
        query?: H.Query
        state?: H.LocationState
    }
    interface Redirect extends __React.ReactElement<RedirectProps> {}
    interface RedirectElement extends __React.ReactElement<RedirectProps> {}
    const Redirect: Redirect


    interface IndexRouteProps extends RoutePropsBase {}
    interface IndexRoute extends __React.ComponentClass<IndexRouteProps> {}
    interface IndexRouteElement extends __React.ReactElement<IndexRouteProps> {}
    const IndexRoute: IndexRoute


    interface RoutingContextProps {
        history: H.History
        createElement?: (component: Component, props: Object) => any
        location: Location
        routes:  RouteTypes
        params: Params
        components?: Components
    }
    interface RoutingContext extends __React.ReactElement<RoutingContextProps> {}
    interface RoutingContextElement extends __React.ReactElement<RoutingContextProps> {}
    const RoutingContext: RoutingContext


    interface LifecycleMixin {
        routerWillLeave(nextLocation: Location): string | boolean
    }
    const Lifecycle: __React.Mixin<any, any>


    const RouteContext: __React.Mixin<any, any>


    interface HistoryMixin {
        history: History
    }
    const History: __React.Mixin<any, any>


    type RouterListener = (error: Error, nextState: RouterState) => void

    interface HistoryRoutes {
        isActive(pathname: H.Pathname, query: H.Query): boolean
        registerRouteHook(route: PlainRoute, hook: H.LocationListener): void
        unregisterRouteHook(route: PlainRoute, hook: H.LocationListener): void
        listen(listener: RouterListener): Function
        match(location: H.Location, callback: (error: any, nextState: RouterState, nextLocation: H.Location) => void): void
    }

    function useRoutes<T>(createHistory: HistoryModule.CreateHistory<T>): HistoryModule.CreateHistory<T & HistoryRoutes>


    function createRoutes(routes: RouteTypes): PlainRoute[]


    interface MatchArgs {
        routes?:  RouteTypes
        history?: H.History
        location?: Location
        parseQueryString?: ParseQueryString
        stringifyQuery?: StringifyQuery
    }
    interface MatchState extends RouterState {
        history: History
    }
    function match(args: MatchArgs, cb: (error: any, nextLocation: H.Location, nextState: MatchState) => void): void

}


declare module "react-router/lib/Router" {

    export default ReactRouter.Router

}


declare module "react-router/lib/Link" {

    export default ReactRouter.Link

}


declare module "react-router/lib/IndexLink" {

    const IndexLink: ReactRouter.Link

    export default IndexLink

}


declare module "react-router/lib/IndexRoute" {

    export default ReactRouter.IndexRoute

}


declare module "react-router/lib/Redirect" {

    export default ReactRouter.Redirect

}


declare module "react-router/lib/Route" {

    export default ReactRouter.Route

}


declare module "react-router/lib/History" {

    export default ReactRouter.History

}


declare module "react-router/lib/Lifecycle" {

    export default ReactRouter.Lifecycle

}


declare module "react-router/lib/RouteContext" {

    export default ReactRouter.RouteContext

}


declare module "react-router/lib/useRoutes" {

    export default ReactRouter.useRoutes

}


declare module "react-router/lib/RouteUtils" {

    type E = __React.ReactElement<any>

    export function isReactChildren(object: E | E[]): boolean

    export function createRouteFromReactElement(element: E): ReactRouter.PlainRoute

    export function createRoutesFromReactChildren(children: E | E[], parentRoute: ReactRouter.PlainRoute): ReactRouter.PlainRoute[]

    export import createRoutes = ReactRouter.createRoutes

}


declare module "react-router/lib/RoutingContext" {

    export default ReactRouter.RoutingContext

}


declare module "react-router/lib/PropTypes" {

    export function falsy(props: any, propName: string, componentName: string): Error;

    export const history: __React.Requireable<any>

    export const location: __React.Requireable<any>

    export const component: __React.Requireable<any>

    export const components: __React.Requireable<any>

    export const route: __React.Requireable<any>

    export const routes: __React.Requireable<any>

    export default {
        falsy,
        history,
        location,
        component,
        components,
        route
    }

}


declare module "react-router/lib/match" {

    export default ReactRouter.match

}


declare module "react-router" {

    import Router from "react-router/lib/Router"

    import Link from "react-router/lib/Link"

    import IndexRoute from "react-router/lib/IndexRoute"

    import Redirect from "react-router/lib/Redirect"

    import Route from "react-router/lib/Route"

    import History from "react-router/lib/History"

    import Lifecycle from "react-router/lib/Lifecycle"

    import RouteContext from "react-router/lib/RouteContext"

    import useRoutes from "react-router/lib/useRoutes"

    import { createRoutes } from "react-router/lib/RouteUtils"

    import RoutingContext from "react-router/lib/RoutingContext"

    import PropTypes from "react-router/lib/PropTypes"

    import match from "react-router/lib/match"

    export {
        Router,
        Link,
        IndexRoute,
        Redirect,
        Route,
        History,
        Lifecycle,
        RouteContext,
        useRoutes,
        createRoutes,
        RoutingContext,
        PropTypes,
        match
    }

    export default Router

}
