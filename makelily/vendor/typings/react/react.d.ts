// Type definitions for React v0.14.0 (external module)
// Project: http://facebook.github.io/react/
// Definitions by: Josh Netterfield <joshua@nettek.ca>, Asana <https://asana.com>, AssureSign <http://www.assuresign.com>, Microsoft <https://microsoft.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module __React {
    //
    // __React Elements
    // ----------------------------------------------------------------------

    type ReactType = ComponentClass<any> | string;

    interface ReactElement<P> {
        type: string | ComponentClass<P>;
        props: P;
        key: string | number;
        ref: string | ((component: Component<P, any>) => any);
    }

    interface ClassicElement<P> extends ReactElement<P> {
        type: string | ClassicComponentClass<P>;
        ref: string | ((component: ClassicComponent<P, any>) => any);
    }

    interface DOMElement<P> extends ClassicElement<P> {
        type: string;
        ref: string | ((component: DOMComponent<P>) => any);
    }

    type HTMLElement = DOMElement<HTMLAttributes>;
    type SVGElement = DOMElement<SVGAttributes>;

    //
    // Factories
    // ----------------------------------------------------------------------

    interface Factory<P> {
        (props?: P, ...children: __ReactNode[]): ReactElement<P>;
    }

    interface ClassicFactory<P> extends Factory<P> {
        (props?: P, ...children: __ReactNode[]): ClassicElement<P>;
    }

    interface DOMFactory<P> extends ClassicFactory<P> {
        (props?: P, ...children: __ReactNode[]): DOMElement<P>;
    }

    type HTMLFactory = DOMFactory<HTMLAttributes>;
    type SVGFactory = DOMFactory<SVGAttributes>;
    type SVGElementFactory = DOMFactory<SVGElementAttributes>;

    //
    // __React Nodes
    // http://facebook.github.io/react/docs/glossary.html
    // ----------------------------------------------------------------------

    type __ReactText = string | number;
    type __ReactChild = ReactElement<any> | __ReactText;

    // Should be Array<__ReactNode> but type aliases cannot be recursive
    type __ReactFragment = {} | Array<__ReactChild | any[] | boolean>;
    type __ReactNode = __ReactChild | __ReactFragment | boolean;

    //
    // Top Level API
    // ----------------------------------------------------------------------

    function createClass<P, S>(spec: ComponentSpec<P, S>): ClassicComponentClass<P>;

    function createFactory<P>(type: string): DOMFactory<P>;
    function createFactory<P>(type: ClassicComponentClass<P> | string): ClassicFactory<P>;
    function createFactory<P>(type: ComponentClass<P>): Factory<P>;

    function createElement<P>(
        type: string,
        props?: P,
        ...children: __ReactNode[]): DOMElement<P>;
    function createElement<P>(
        type: ClassicComponentClass<P> | string,
        props?: P,
        ...children: __ReactNode[]): ClassicElement<P>;
    function createElement<P>(
        type: ComponentClass<P>,
        props?: P,
        ...children: __ReactNode[]): ReactElement<P>;

    function cloneElement<P>(
        element: DOMElement<P>,
        props?: P,
        ...children: __ReactNode[]): DOMElement<P>;
    function cloneElement<P>(
        element: ClassicElement<P>,
        props?: P,
        ...children: __ReactNode[]): ClassicElement<P>;
    function cloneElement<P>(
        element: ReactElement<P>,
        props?: P,
        ...children: __ReactNode[]): ReactElement<P>;

    function isValidElement(object: {}): boolean;

    var DOM: __ReactDOM;
    var PropTypes: __ReactPropTypes;
    var Children: __ReactChildren;

    //
    // Component API
    // ----------------------------------------------------------------------

    // Base component for plain JS classes
    class Component<P, S> implements ComponentLifecycle<P, S> {
        constructor(props?: P, context?: any);
        setState(f: (prevState: S, props: P) => S, callback?: () => any): void;
        setState(state: S, callback?: () => any): void;
        forceUpdate(): void;
        props: P;
        state: S;
        context: any;
        refs: {
            [key: string]: Component<any, any>
        };
    }

    interface ClassicComponent<P, S> extends Component<P, S> {
        replaceState(nextState: S, callback?: () => any): void;
        getDOMNode<TElement extends Element>(): TElement;
        getDOMNode(): Element;
        isMounted(): boolean;
        getInitialState?(): S;
        setProps(nextProps: P, callback?: () => any): void;
        replaceProps(nextProps: P, callback?: () => any): void;
    }

    interface DOMComponent<P> extends ClassicComponent<P, any> {
        tagName: string;
    }

    type HTMLComponent = DOMComponent<HTMLAttributes>;
    type SVGComponent = DOMComponent<SVGAttributes>;

    interface ChildContextProvider<CC> {
        getChildContext(): CC;
    }

    //
    // Class Interfaces
    // ----------------------------------------------------------------------

    interface ComponentClass<P> {
        new(props?: P, context?: any): Component<P, any>;
        propTypes?: ValidationMap<P>;
        contextTypes?: ValidationMap<any>;
        childContextTypes?: ValidationMap<any>;
        defaultProps?: P;
    }

    interface ClassicComponentClass<P> extends ComponentClass<P> {
        new(props?: P, context?: any): ClassicComponent<P, any>;
        getDefaultProps?(): P;
        displayName?: string;
    }

    //
    // Component Specs and Lifecycle
    // ----------------------------------------------------------------------

    interface ComponentLifecycle<P, S> {
        componentWillMount?(): void;
        componentDidMount?(): void;
        componentWillReceiveProps?(nextProps: P, nextContext: any): void;
        shouldComponentUpdate?(nextProps: P, nextState: S, nextContext: any): boolean;
        componentWillUpdate?(nextProps: P, nextState: S, nextContext: any): void;
        componentDidUpdate?(prevProps: P, prevState: S, prevContext: any): void;
        componentWillUnmount?(): void;
    }

    interface Mixin<P, S> extends ComponentLifecycle<P, S> {
        mixins?: Mixin<P, S>;
        statics?: {
            [key: string]: any;
        };

        displayName?: string;
        propTypes?: ValidationMap<any>;
        contextTypes?: ValidationMap<any>;
        childContextTypes?: ValidationMap<any>

        getDefaultProps?(): P;
        getInitialState?(): S;
    }

    interface ComponentSpec<P, S> extends Mixin<P, S> {
        render(): ReactElement<any>;
    }

    //
    // Event System
    // ----------------------------------------------------------------------

    interface SyntheticEvent {
        bubbles: boolean;
        cancelable: boolean;
        currentTarget: EventTarget;
        defaultPrevented: boolean;
        eventPhase: number;
        isTrusted: boolean;
        nativeEvent: Event;
        preventDefault(): void;
        stopPropagation(): void;
        target: EventTarget;
        timeStamp: Date;
        type: string;
    }

    interface DragEvent extends SyntheticEvent {
        dataTransfer: DataTransfer;
    }

    interface ClipboardEvent extends SyntheticEvent {
        clipboardData: DataTransfer;
    }

    interface KeyboardEvent extends SyntheticEvent {
        altKey: boolean;
        charCode: number;
        ctrlKey: boolean;
        getModifierState(key: string): boolean;
        key: string;
        keyCode: number;
        locale: string;
        location: number;
        metaKey: boolean;
        repeat: boolean;
        shiftKey: boolean;
        which: number;
    }

    interface FocusEvent extends SyntheticEvent {
        relatedTarget: EventTarget;
    }

    interface FormEvent extends SyntheticEvent {
    }

    interface MouseEvent extends SyntheticEvent {
        altKey: boolean;
        button: number;
        buttons: number;
        clientX: number;
        clientY: number;
        ctrlKey: boolean;
        getModifierState(key: string): boolean;
        metaKey: boolean;
        pageX: number;
        pageY: number;
        relatedTarget: EventTarget;
        screenX: number;
        screenY: number;
        shiftKey: boolean;
    }

    interface TouchEvent extends SyntheticEvent {
        altKey: boolean;
        changedTouches: TouchList;
        ctrlKey: boolean;
        getModifierState(key: string): boolean;
        metaKey: boolean;
        shiftKey: boolean;
        targetTouches: TouchList;
        touches: TouchList;
    }

    interface UIEvent extends SyntheticEvent {
        detail: number;
        view: AbstractView;
    }

    interface WheelEvent extends SyntheticEvent {
        deltaMode: number;
        deltaX: number;
        deltaY: number;
        deltaZ: number;
    }

    //
    // Event Handler Types
    // ----------------------------------------------------------------------

    interface EventHandler<E extends SyntheticEvent> {
        (event: E): void;
    }

    interface DragEventHandler extends EventHandler<DragEvent> {}
    interface ClipboardEventHandler extends EventHandler<ClipboardEvent> {}
    interface KeyboardEventHandler extends EventHandler<KeyboardEvent> {}
    interface FocusEventHandler extends EventHandler<FocusEvent> {}
    interface FormEventHandler extends EventHandler<FormEvent> {}
    interface MouseEventHandler extends EventHandler<MouseEvent> {}
    interface TouchEventHandler extends EventHandler<TouchEvent> {}
    interface UIEventHandler extends EventHandler<UIEvent> {}
    interface WheelEventHandler extends EventHandler<WheelEvent> {}

    //
    // Props / DOM Attributes
    // ----------------------------------------------------------------------

    interface Props<T> {
        children?: __ReactNode;
        key?: string | number;
        ref?: string | ((component: T) => any);
    }

    interface DOMAttributes extends Props<DOMComponent<any>> {
        onCopy?: ClipboardEventHandler;
        onCut?: ClipboardEventHandler;
        onPaste?: ClipboardEventHandler;
        onKeyDown?: KeyboardEventHandler;
        onKeyPress?: KeyboardEventHandler;
        onKeyUp?: KeyboardEventHandler;
        onFocus?: FocusEventHandler;
        onBlur?: FocusEventHandler;
        onChange?: FormEventHandler;
        onInput?: FormEventHandler;
        onSubmit?: FormEventHandler;
        onClick?: MouseEventHandler;
        onDoubleClick?: MouseEventHandler;
        onDrag?: DragEventHandler;
        onDragEnd?: DragEventHandler;
        onDragEnter?: DragEventHandler;
        onDragExit?: DragEventHandler;
        onDragLeave?: DragEventHandler;
        onDragOver?: DragEventHandler;
        onDragStart?: DragEventHandler;
        onDrop?: DragEventHandler;
        onMouseDown?: MouseEventHandler;
        onMouseEnter?: MouseEventHandler;
        onMouseLeave?: MouseEventHandler;
        onMouseMove?: MouseEventHandler;
        onMouseOut?: MouseEventHandler;
        onMouseOver?: MouseEventHandler;
        onMouseUp?: MouseEventHandler;
        onTouchCancel?: TouchEventHandler;
        onTouchEnd?: TouchEventHandler;
        onTouchMove?: TouchEventHandler;
        onTouchStart?: TouchEventHandler;
        onScroll?: UIEventHandler;
        onWheel?: WheelEventHandler;

        dangerouslySetInnerHTML?: {
            __html: string;
        };
    }

    // This interface is not complete. Only properties accepting
    // unitless numbers are listed here (see CSSProperty.js in __React)
    interface CSSProperties {
        boxFlex?: number;
        boxFlexGroup?: number;
        columnCount?: number;
        flex?: number | string;
        flexGrow?: number;
        flexShrink?: number;
        fontWeight?: number | string;
        lineClamp?: number;
        lineHeight?: number | string;
        opacity?: number;
        order?: number;
        orphans?: number;
        widows?: number;
        zIndex?: number;
        zoom?: number;

        top?: any;
        bottom?: any;
        left?: any;
        right?: any;
        width?: any;
        height?: any;
        
        fontFamily?: string;
        fontSize?: any;
        position?: any;
        textAlign?: any;
        padding?: any;
        marginBottom?: any;
        marginTop?: any;
        marginLeft?: any;
        marginRight?: any;
        display?: string;
        verticalAlign?: string;

        // SVG-related properties
        fillOpacity?: number;
        strokeOpacity?: number;
        strokeWidth?: number;
    }

    interface HTMLAttributes extends DOMAttributes {
        ref?: string | ((component: HTMLComponent) => void);

        accept?: string;
        acceptCharset?: string;
        accessKey?: string;
        action?: string;
        allowFullScreen?: boolean;
        allowTransparency?: boolean;
        alt?: string;
        async?: boolean;
        autoComplete?: boolean;
        autoFocus?: boolean;
        autoPlay?: boolean;
        cellPadding?: number | string;
        cellSpacing?: number | string;
        charSet?: string;
        checked?: boolean;
        classID?: string;
        className?: string;
        cols?: number;
        colSpan?: number;
        content?: string;
        contentEditable?: boolean;
        contextMenu?: string;
        controls?: any;
        coords?: string;
        crossOrigin?: string;
        data?: string;
        dateTime?: string;
        defer?: boolean;
        dir?: string;
        disabled?: boolean;
        download?: any;
        draggable?: boolean;
        encType?: string;
        form?: string;
        formAction?: string;
        formEncType?: string;
        formMethod?: string;
        formNoValidate?: boolean;
        formTarget?: string;
        frameBorder?: number | string;
        headers?: string;
        height?: number | string;
        hidden?: boolean;
        high?: number;
        href?: string;
        hrefLang?: string;
        htmlFor?: string;
        httpEquiv?: string;
        icon?: string;
        id?: string;
        label?: string;
        lang?: string;
        list?: string;
        loop?: boolean;
        low?: number;
        manifest?: string;
        marginHeight?: number;
        marginWidth?: number;
        max?: number | string;
        maxLength?: number;
        media?: string;
        mediaGroup?: string;
        method?: string;
        min?: number | string;
        multiple?: boolean;
        muted?: boolean;
        name?: string;
        noValidate?: boolean;
        open?: boolean;
        optimum?: number;
        pattern?: string;
        placeholder?: string;
        poster?: string;
        preload?: string;
        radioGroup?: string;
        readOnly?: boolean;
        rel?: string;
        required?: boolean;
        role?: string;
        rows?: number;
        rowSpan?: number;
        sandbox?: string;
        scope?: string;
        scoped?: boolean;
        scrolling?: string;
        seamless?: boolean;
        selected?: boolean;
        shape?: string;
        size?: number;
        sizes?: string;
        span?: number;
        spellCheck?: boolean;
        src?: string;
        srcDoc?: string;
        srcSet?: string;
        start?: number;
        step?: number | string;
        style?: CSSProperties;
        tabIndex?: number;
        target?: string;
        title?: string;
        type?: string;
        useMap?: string;
        value?: string;
        width?: number | string;
        wmode?: string;

        // Non-standard Attributes
        autoCapitalize?: boolean;
        autoCorrect?: boolean;
        property?: string;
        itemProp?: string;
        itemScope?: boolean;
        itemType?: string;
        unselectable?: boolean;
    }

    interface SVGElementAttributes extends HTMLAttributes {
        viewBox?: string;
        preserveAspectRatio?: string;

        // Ripieno EXT
        "data-page"?: string;
    }

    interface SVGAttributes extends DOMAttributes {
        ref?: string | ((component: SVGComponent) => void);

        cx?: number | string;
        cy?: number | string;
        d?: string;
        dx?: number | string;
        dy?: number | string;
        fill?: string;
        fillOpacity?: number | string;
        fontFamily?: string;
        fontSize?: number | string;
        fx?: number | string;
        fy?: number | string;
        gradientTransform?: string;
        gradientUnits?: string;
        markerEnd?: string;
        markerMid?: string;
        markerStart?: string;
        offset?: number | string;
        opacity?: number | string;
        patternContentUnits?: string;
        patternUnits?: string;
        points?: string;
        preserveAspectRatio?: string;
        r?: number | string;
        rx?: number | string;
        ry?: number | string;
        spreadMethod?: string;
        stopColor?: string;
        stopOpacity?: number | string;
        stroke?: string;
        strokeDasharray?: string;
        strokeLinecap?: string;
        strokeOpacity?: number | string;
        strokeWidth?: number | string;
        textAnchor?: string;
        transform?: string;
        version?: string;
        viewBox?: string;
        x1?: number | string;
        x2?: number | string;
        x?: number | string;
        y1?: number | string;
        y2?: number | string
        y?: number | string;

        // Ripieno EXT
        className?: string;
        "font-weight"?: string;
        "alignment-baseline"?: string;
        height?: number;
        direction?: string;
        "font-style"?: string;
        "letter-spacing"?: string;
        "text-decoration"?: string;
        width?: number;
    }

    //
    // __React.DOM
    // ----------------------------------------------------------------------

    interface __ReactDOM {
        // HTML
        a: HTMLFactory;
        abbr: HTMLFactory;
        address: HTMLFactory;
        area: HTMLFactory;
        article: HTMLFactory;
        aside: HTMLFactory;
        audio: HTMLFactory;
        b: HTMLFactory;
        base: HTMLFactory;
        bdi: HTMLFactory;
        bdo: HTMLFactory;
        big: HTMLFactory;
        blockquote: HTMLFactory;
        body: HTMLFactory;
        br: HTMLFactory;
        button: HTMLFactory;
        canvas: HTMLFactory;
        caption: HTMLFactory;
        cite: HTMLFactory;
        code: HTMLFactory;
        col: HTMLFactory;
        colgroup: HTMLFactory;
        data: HTMLFactory;
        datalist: HTMLFactory;
        dd: HTMLFactory;
        del: HTMLFactory;
        details: HTMLFactory;
        dfn: HTMLFactory;
        dialog: HTMLFactory;
        div: HTMLFactory;
        dl: HTMLFactory;
        dt: HTMLFactory;
        em: HTMLFactory;
        embed: HTMLFactory;
        fieldset: HTMLFactory;
        figcaption: HTMLFactory;
        figure: HTMLFactory;
        footer: HTMLFactory;
        form: HTMLFactory;
        h1: HTMLFactory;
        h2: HTMLFactory;
        h3: HTMLFactory;
        h4: HTMLFactory;
        h5: HTMLFactory;
        h6: HTMLFactory;
        head: HTMLFactory;
        header: HTMLFactory;
        hr: HTMLFactory;
        html: HTMLFactory;
        i: HTMLFactory;
        iframe: HTMLFactory;
        img: HTMLFactory;
        input: HTMLFactory;
        ins: HTMLFactory;
        kbd: HTMLFactory;
        keygen: HTMLFactory;
        label: HTMLFactory;
        legend: HTMLFactory;
        li: HTMLFactory;
        link: HTMLFactory;
        main: HTMLFactory;
        map: HTMLFactory;
        mark: HTMLFactory;
        menu: HTMLFactory;
        menuitem: HTMLFactory;
        meta: HTMLFactory;
        meter: HTMLFactory;
        nav: HTMLFactory;
        noscript: HTMLFactory;
        object: HTMLFactory;
        ol: HTMLFactory;
        optgroup: HTMLFactory;
        option: HTMLFactory;
        output: HTMLFactory;
        p: HTMLFactory;
        param: HTMLFactory;
        picture: HTMLFactory;
        pre: HTMLFactory;
        progress: HTMLFactory;
        q: HTMLFactory;
        rp: HTMLFactory;
        rt: HTMLFactory;
        ruby: HTMLFactory;
        s: HTMLFactory;
        samp: HTMLFactory;
        script: HTMLFactory;
        section: HTMLFactory;
        select: HTMLFactory;
        small: HTMLFactory;
        source: HTMLFactory;
        span: HTMLFactory;
        strong: HTMLFactory;
        style: HTMLFactory;
        sub: HTMLFactory;
        summary: HTMLFactory;
        sup: HTMLFactory;
        table: HTMLFactory;
        tbody: HTMLFactory;
        td: HTMLFactory;
        textarea: HTMLFactory;
        tfoot: HTMLFactory;
        th: HTMLFactory;
        thead: HTMLFactory;
        time: HTMLFactory;
        title: HTMLFactory;
        tr: HTMLFactory;
        track: HTMLFactory;
        u: HTMLFactory;
        ul: HTMLFactory;
        "var": HTMLFactory;
        video: HTMLFactory;
        wbr: HTMLFactory;

        // SVG
        svg: SVGElementFactory;
        circle: SVGFactory;
        defs: SVGFactory;
        ellipse: SVGFactory;
        g: SVGFactory;
        line: SVGFactory;
        linearGradient: SVGFactory;
        mask: SVGFactory;
        path: SVGFactory;
        pattern: SVGFactory;
        polygon: SVGFactory;
        polyline: SVGFactory;
        radialGradient: SVGFactory;
        rect: SVGFactory;
        stop: SVGFactory;
        text: SVGFactory;
        tspan: SVGFactory;
    }

    //
    // __React.PropTypes
    // ----------------------------------------------------------------------

    interface Validator<T> {
        (object: T, key: string, componentName: string): Error;
    }

    interface Requireable<T> extends Validator<T> {
        isRequired: Validator<T>;
    }

    interface ValidationMap<T> {
        [key: string]: Validator<T>;
    }

    interface __ReactPropTypes {
        any: Requireable<any>;
        array: Requireable<any>;
        bool: Requireable<any>;
        func: Requireable<any>;
        number: Requireable<any>;
        object: Requireable<any>;
        string: Requireable<any>;
        node: Requireable<any>;
        element: Requireable<any>;
        instanceOf(expectedClass: {}): Requireable<any>;
        oneOf(types: any[]): Requireable<any>;
        oneOfType(types: Validator<any>[]): Requireable<any>;
        arrayOf(type: Validator<any>): Requireable<any>;
        objectOf(type: Validator<any>): Requireable<any>;
        shape(type: ValidationMap<any>): Requireable<any>;
    }

    //
    // __React.Children
    // ----------------------------------------------------------------------

    interface __ReactChildren {
        map<T>(children: __ReactNode, fn: (child: __ReactChild) => T): { [key:string]: T };
        forEach(children: __ReactNode, fn: (child: __ReactChild) => any): void;
        count(children: __ReactNode): number;
        only(children: __ReactNode): __ReactChild;
    }

    //
    // Browser Interfaces
    // https://github.com/nikeee/2048-typescript/blob/master/2048/js/touch.d.ts
    // ----------------------------------------------------------------------

    interface AbstractView {
        styleMedia: StyleMedia;
        document: Document;
    }

    interface Touch {
        identifier: number;
        target: EventTarget;
        screenX: number;
        screenY: number;
        clientX: number;
        clientY: number;
        pageX: number;
        pageY: number;
    }

    interface TouchList {
        [index: number]: Touch;
        length: number;
        item(index: number): Touch;
        identifiedTouch(identifier: number): Touch;
    }
}

declare module JSX {
    interface Element extends __React.ReactElement<any> { }
    interface ElementClass extends __React.Component<any, any> {
        render(): JSX.Element;
    }
    interface ElementAttributesProperty { props: {}; }

    interface IntrinsicElements {
        // HTML
        a: __React.HTMLAttributes;
        abbr: __React.HTMLAttributes;
        address: __React.HTMLAttributes;
        area: __React.HTMLAttributes;
        article: __React.HTMLAttributes;
        aside: __React.HTMLAttributes;
        audio: __React.HTMLAttributes;
        b: __React.HTMLAttributes;
        base: __React.HTMLAttributes;
        bdi: __React.HTMLAttributes;
        bdo: __React.HTMLAttributes;
        big: __React.HTMLAttributes;
        blockquote: __React.HTMLAttributes;
        body: __React.HTMLAttributes;
        br: __React.HTMLAttributes;
        button: __React.HTMLAttributes;
        canvas: __React.HTMLAttributes;
        caption: __React.HTMLAttributes;
        cite: __React.HTMLAttributes;
        code: __React.HTMLAttributes;
        col: __React.HTMLAttributes;
        colgroup: __React.HTMLAttributes;
        data: __React.HTMLAttributes;
        datalist: __React.HTMLAttributes;
        dd: __React.HTMLAttributes;
        del: __React.HTMLAttributes;
        details: __React.HTMLAttributes;
        dfn: __React.HTMLAttributes;
        dialog: __React.HTMLAttributes;
        div: __React.HTMLAttributes;
        dl: __React.HTMLAttributes;
        dt: __React.HTMLAttributes;
        em: __React.HTMLAttributes;
        embed: __React.HTMLAttributes;
        fieldset: __React.HTMLAttributes;
        figcaption: __React.HTMLAttributes;
        figure: __React.HTMLAttributes;
        footer: __React.HTMLAttributes;
        form: __React.HTMLAttributes;
        h1: __React.HTMLAttributes;
        h2: __React.HTMLAttributes;
        h3: __React.HTMLAttributes;
        h4: __React.HTMLAttributes;
        h5: __React.HTMLAttributes;
        h6: __React.HTMLAttributes;
        head: __React.HTMLAttributes;
        header: __React.HTMLAttributes;
        hr: __React.HTMLAttributes;
        html: __React.HTMLAttributes;
        i: __React.HTMLAttributes;
        iframe: __React.HTMLAttributes;
        img: __React.HTMLAttributes;
        input: __React.HTMLAttributes;
        ins: __React.HTMLAttributes;
        kbd: __React.HTMLAttributes;
        keygen: __React.HTMLAttributes;
        label: __React.HTMLAttributes;
        legend: __React.HTMLAttributes;
        li: __React.HTMLAttributes;
        link: __React.HTMLAttributes;
        main: __React.HTMLAttributes;
        map: __React.HTMLAttributes;
        mark: __React.HTMLAttributes;
        menu: __React.HTMLAttributes;
        menuitem: __React.HTMLAttributes;
        meta: __React.HTMLAttributes;
        meter: __React.HTMLAttributes;
        nav: __React.HTMLAttributes;
        noscript: __React.HTMLAttributes;
        object: __React.HTMLAttributes;
        ol: __React.HTMLAttributes;
        optgroup: __React.HTMLAttributes;
        option: __React.HTMLAttributes;
        output: __React.HTMLAttributes;
        p: __React.HTMLAttributes;
        param: __React.HTMLAttributes;
        picture: __React.HTMLAttributes;
        pre: __React.HTMLAttributes;
        progress: __React.HTMLAttributes;
        q: __React.HTMLAttributes;
        rp: __React.HTMLAttributes;
        rt: __React.HTMLAttributes;
        ruby: __React.HTMLAttributes;
        s: __React.HTMLAttributes;
        samp: __React.HTMLAttributes;
        script: __React.HTMLAttributes;
        section: __React.HTMLAttributes;
        select: __React.HTMLAttributes;
        small: __React.HTMLAttributes;
        source: __React.HTMLAttributes;
        span: __React.HTMLAttributes;
        strong: __React.HTMLAttributes;
        style: __React.HTMLAttributes;
        sub: __React.HTMLAttributes;
        summary: __React.HTMLAttributes;
        sup: __React.HTMLAttributes;
        table: __React.HTMLAttributes;
        tbody: __React.HTMLAttributes;
        td: __React.HTMLAttributes;
        textarea: __React.HTMLAttributes;
        tfoot: __React.HTMLAttributes;
        th: __React.HTMLAttributes;
        thead: __React.HTMLAttributes;
        time: __React.HTMLAttributes;
        title: __React.HTMLAttributes;
        tr: __React.HTMLAttributes;
        track: __React.HTMLAttributes;
        u: __React.HTMLAttributes;
        ul: __React.HTMLAttributes;
        "var": __React.HTMLAttributes;
        video: __React.HTMLAttributes;
        wbr: __React.HTMLAttributes;

        // SVG
        svg: __React.SVGElementAttributes;

        circle: __React.SVGAttributes;
        defs: __React.SVGAttributes;
        ellipse: __React.SVGAttributes;
        g: __React.SVGAttributes;
        line: __React.SVGAttributes;
        linearGradient: __React.SVGAttributes;
        mask: __React.SVGAttributes;
        path: __React.SVGAttributes;
        pattern: __React.SVGAttributes;
        polygon: __React.SVGAttributes;
        polyline: __React.SVGAttributes;
        radialGradient: __React.SVGAttributes;
        rect: __React.SVGAttributes;
        stop: __React.SVGAttributes;
        text: __React.SVGAttributes;
        tspan: __React.SVGAttributes;
    }
}

declare module "react" {
    export = __React;
}
