// Type definitions for React v0.14
// Project: http://facebook.github.io/react/
// Definitions by: Josh Netterfield <joshua@nettek.ca>, Asana <https://asana.com>, AssureSign <http://www.assuresign.com>, Microsoft <https://microsoft.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module __ReactDOMModule {
    function render<P>(
        element: __React.DOMElement<P>,
        container: Element,
        callback?: () => any): __React.DOMComponent<P>;
    function render<P, S>(
        element: __React.ClassicElement<P>,
        container: Element,
        callback?: () => any): __React.ClassicComponent<P, S>;
    function render<P, S>(
        element: __React.ReactElement<P>,
        container: Element,
        callback?: () => any): __React.Component<P, S>;

    function unmountComponentAtNode(container: Element): boolean;

    function findDOMNode<TElement extends Element>(
        componentOrElement: __React.Component<any, any> | Element): TElement;
    function findDOMNode(
        componentOrElement: __React.Component<any, any> | Element): Element;
}

declare module __ReactDOMServer {
    function renderToString(element: __React.ReactElement<any>): string;
    function renderToStaticMarkup(element: __React.ReactElement<any>): string;
}

declare module "react-dom" {
    export = __ReactDOMModule;
}

declare module "react-dom/server" {
    export = __ReactDOMServer;
}
