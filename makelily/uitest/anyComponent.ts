import React = require("react");

interface AnyComponent<P, S> extends React.Component<P, S>, React.ComponentLifecycle<P, S> {
    // Implemented by the higher order component
    setRemoteState: (remoteState: any) => void;
    
    // Private
    adjust?: () => void;
    
    // Standard React methods
    setState(f: (prevState: S, props: P) => S, callback?: () => any): void;
    setState(state: S, callback?: () => any): void;
    forceUpdate(): void;
    props: P;
    state: S;
    context: any;
    refs: {
        [key: string]: React.Component<any, any>
    };
    componentWillMount?(): void;
    componentDidMount?(): void;
    componentWillReceiveProps?(nextProps: P, nextContext: any): void;
    shouldComponentUpdate?(nextProps: P, nextState: S, nextContext: any): boolean;
    componentWillUpdate?(nextProps: P, nextState: S, nextContext: any): void;
    componentDidUpdate?(prevProps: P, prevState: S, prevContext: any): void;
    componentWillUnmount?(): void;
    render?(): void;
    
    getChildContext?(): void;
}

export default AnyComponent;