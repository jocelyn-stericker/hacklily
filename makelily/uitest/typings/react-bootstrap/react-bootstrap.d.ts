 // Type definitions for react-bootstrap
 // Project: https://react-bootstrap.github.io/
 // Definitions by: René Verheij <https://github.com/flyon>
 // Definitions: https://github.com/borisyankov/DefinitelyTyped
 /// <reference path="../react/react.d.ts" />

declare module "react-bootstrap" {
    export let Accordion:__React.Factory<__Bootstrap.PanelGroupAttributes>;
    export let Affix:__React.Factory<__Bootstrap.AffixAttributes>;
    export let AffixMixin:__React.Mixin<__Bootstrap.AffixAttributes,any>;
    export let Alert:__React.Factory<__Bootstrap.AlertAttributes>;
    export let Badge:__React.Factory<__Bootstrap.BadgeAttributes>;
    export let Button:__React.Factory<__Bootstrap.ButtonAttributes>;
    export let ButtonGroup:__React.Factory<__Bootstrap.ButtonGroupAttributes>;
    export let ButtonToolbar:__React.Factory<__Bootstrap.ReactBootstrapAttributes>;
    export let Carousel:__React.Factory<__Bootstrap.CarouselAttributes>;
    export let CarouselItem:__React.Factory<__Bootstrap.CarouselItemAttributes>;
    export let Col:__React.Factory<__Bootstrap.ColAttributes>;
    export let DropdownButton:__React.Factory<__Bootstrap.DropdownButtonAttributes>;
    export let DropdownMenu:__React.Factory<__Bootstrap.DropdownMenuAttributes>;
    export let Glyphicon:__React.Factory<__Bootstrap.GlyphiconAttributes>;
    export let Grid:__React.Factory<__Bootstrap.GridAttributes>;
    export let Input:__React.Factory<__Bootstrap.InputAttributes>;
    export let Interpolate:__React.Factory<__Bootstrap.InterpolateAttributes>;
    export let Jumbotron:__React.Factory<{}>;
    export let Label:__React.Factory<__Bootstrap.ReactBootstrapAttributes>;
    export let ListGroup:__React.Factory<__Bootstrap.ListGroupAttributes>;
    export let ListGroupItem:__React.Factory<__Bootstrap.ListGroupItemAttributes>;
    export let MenuItem:__React.Factory<__Bootstrap.MenuItemAttributes>;
    export let Modal:__React.Factory<__Bootstrap.ModalAttributes>;
    export let ModalTrigger:__React.Factory<__Bootstrap.ModalTriggerAttributes>;
    export let Nav:__React.Factory<__Bootstrap.NavAttributes>;
    export let NavItem:__React.Factory<__Bootstrap.NavItemAttributes>;
    export let Navbar:__React.Factory<__Bootstrap.NavbarAttributes>;
    export let OverlayTrigger:__React.Factory<__Bootstrap.OverlayTriggerAttributes>;
    export let PageHeader:__React.Factory<any>;
    export let PageItem:__React.Factory<__Bootstrap.PageItemAttributes>;
    export let Pager:__React.Factory<__Bootstrap.PagerAttributes>;
    export let Panel:__React.Factory<__Bootstrap.PanelAttributes>;
    export let PanelGroup:__React.Factory<__Bootstrap.PanelGroupAttributes>;
    export let Popover:__React.Factory<__Bootstrap.PopoverAttributes>;
    export let ProgressBar:__React.Factory<__Bootstrap.ProgressBarAttributes>;
    export let Row:__React.Factory<__Bootstrap.RowAttributes>;
    export let SplitButton:__React.Factory<__Bootstrap.SplitButtonAttributes>;
    export let SubNav:__React.Factory<__Bootstrap.SubNavAttributes>;
    export let TabPane:__React.Factory<__Bootstrap.TabPaneAttributes>;
    export let TabbedArea:__React.Factory<__Bootstrap.TabbedAreaAttributes>;
    export let Table:__React.Factory<__Bootstrap.TableAttributes>;
    export let Tooltip:__React.Factory<__Bootstrap.TooltipAttributes>;
    export let Well:__React.Factory<__Bootstrap.ReactBootstrapAttributes>;
}

declare module __Bootstrap {
    interface TooltipAttributes extends ReactBootstrapAttributes
    {
            /**
             * oneOf(['top','right', 'bottom', 'left']),
             */
            placement?: string;
            positionLeft?:number;
            positionTop?:number;
            arrowOffsetLeft?:number;
            arrowOffsetTop?:number;
    }
    interface TableAttributes extends __React.DOMAttributes
    {
            striped?: boolean;
            bordered?: boolean;
            condensed?: boolean;
            hover?: boolean;
            responsive?: boolean;
    }
    interface TabbedAreaAttributes extends ReactBootstrapAttributes
    {
            /**
             * oneOf(['tabs','pills'])
             */
            bsStyle: string;
            animation: boolean;
            onSelect:(key?:string)=>void;
    }
    interface TabPaneAttributes extends __React.DOMAttributes
    {
            animation?:boolean;
            active?:boolean;
            onAnimateOutEnd?:()=>void;
    }
    interface SubNavAttributes extends ReactBootstrapAttributes
    {
            onSelect?: (key?:string, href?:string)=>void;
            active?: boolean;
            disabled?: boolean;
            href?: string;
            title?: string;
            text?: any;
    }

    interface SplitButtonAttributes extends ReactBootstrapAttributes
    {
            pullRight?: boolean;
            title?: any;
            href?: string;
            /**
             * Is rendered inside <span>
             */
            dropdownTitle?: any
            onClick?: (e?:__React.MouseEvent)=>void;
            onSelect?: (key?:string)=>void;
            disabled?: boolean;
    }
    interface RowAttributes extends __React.DOMAttributes
    {
            componentClass: string;
    }

    interface ProgressBarAttributes extends ReactBootstrapAttributes
    {
            min?: number;
            now?: number;
            max?: number;
            label?: any;
            /**
             * ScreenReaderOnly
             */
            srOnly?: boolean;
            striped?: boolean;
            active?: boolean;
    }
    interface PopoverAttributes extends ReactBootstrapAttributes
    {
            /**
             * oneOf(['top','right', 'bottom', 'left']),
             */
            placement?: string;
            positionLeft?: number;
            positionTop?: number;
            arrowOffsetLeft?: number;
            arrowOffsetTop?: number;
            title?: any;
    }
    interface PanelGroupAttributes extends ReactBootstrapAttributes {
            collapsable?: boolean;
            activeKey?: any;
            defaultActiveKey?: any;
            onSelect?: (key?:string)=>void;
    }
    interface PanelAttributes extends ReactBootstrapAttributes,CollapsableAttributes {
            onSelect: (key?:string)=>void;
            header: any;
            footer: any;
    }

    interface PagerAttributes extends __React.DOMAttributes
    {
            onSelect:()=>void;
    }
    interface PageItemAttributes extends __React.DOMAttributes
    {
            disabled?: boolean;
            previous?: boolean;
            next?: boolean;
            onSelect?:(key?:string,href?:string)=>void;
    }
    interface OverlayTriggerAttributes extends OverlayAttributes
    {
            /**
             * oneOfType([
                    oneOf(['manual', 'click', 'hover', 'focus']),
                    arrayOf(oneOf(['click', 'hover', 'focus']))
               ])
             */
            trigger?: any;
            /**
             * oneOf(['top','right', 'bottom', 'left']),
             */
            placement?: string;
            delay?: number;
            delayShow?: number;
            delayHide?: number;
            defaultOverlayShown?:boolean;
            overlay: any;
    }
    interface NavbarAttributes extends ReactBootstrapAttributes
    {
            fixedTop?:boolean;
            fixedBottom?:boolean;
            staticTop?:boolean;
            inverse?:boolean;
            fluid?:boolean;
            role?: string;
            componentClass: string;
            brand?: any;
            toggleButton?: any;
            onToggle?: ()=>void;
            navExpanded?:boolean;
            defaultNavExpanded?: boolean;
    }
    interface NavItemAttributes extends ReactBootstrapAttributes
    {
            onSelect?:(key?:string,href?:string)=>void;
            active?:boolean;
            disabled?:boolean;
            href?:string;
            title?:string;
    }
    interface NavAttributes extends ReactBootstrapAttributes,CollapsableAttributes
    {
            /**
             * oneOf('tabs','pills')
             */
            bsStyle?: string;
            stacked?:boolean;
            justified?:boolean;
            //TODO: see what type of attributes
            onSelect?: ()=>void;
            collapsable?:boolean;
            expanded?:boolean;
            navbar?: boolean;
    }
    interface OverlayAttributes extends __React.DOMAttributes
    {
            /**
             * CustomPropTypes.mountable
             */
            container?: any;
    }
    interface ModalTriggerAttributes extends OverlayAttributes
    {
            //change to 'any'?
            modal: __React.Factory<ModalAttributes>
    }

    interface ModalAttributes extends ReactBootstrapAttributes
    {
            title: any;
            /**
             * oneOf(['static', true, false]),
             */
            backdrop?: string;
            keyboard?: boolean;
            closeButton?:boolean;
            animation?:boolean;
            onRequestHide?:()=>void;
    }
    interface ListGroupItemAttributes extends ReactBootstrapAttributes
    {
            /**
             * oneOf(['danger','info','success','warning']),
             */
            bsStyle?: string;
            active?: any;
            disabled?: any;
            header?: any;
            /**
             * NOTE: In actuality: onClick?: (key?:string,href?:string)=>void;
             * Altough typescript does not allow overwrites
             * React Bootstrap implements onClick different from the React default
             * with two parameters, being: key and href
             * @param key:string
             * @param href:string
             */
            onClick?: (event: __React.MouseEvent) => void;

    }
    interface ListGroupAttributes extends ReactBootstrapAttributes
    {
            onClick:()=>void;
    }
    interface InterpolateAttributes extends __React.DOMAttributes
    {
            format?: string;
    }

    interface InputAttributes extends __React.DOMAttributes
    {
            type?: string;
            label?: any;
            help?: any;
            addonBefore?: any;
            addonAfter?: any;
            /**
             * success,warning,error,default,info
             */
            bsStyle?: string;
            hasFeedback?: boolean;
            groupClassName?: string;
            wrapperClassName?: string;
            labelClassName?: string;
            disabled?: boolean;
    }
    interface GridAttributes extends __React.DOMAttributes
    {
            fluid?:boolean;
            compenentClass:string;
    }
    interface GlyphiconAttributes extends ReactBootstrapAttributes
    {
            glyph: string;
    }
    interface DropdownMenuAttributes extends __React.DOMAttributes
    {
            pullRight?: boolean;
            //TODO: what type of attributes?
            onSelect?: ()=>void;
    }
    interface DropdownButtonAttributes extends ReactBootstrapAttributes
    {
            pullRight?:boolean;
            dropup?:boolean;
            title?:any;
            href?:string;
            onClick?:()=>void;
            onSelect?:(key?:string)=>void;
            navItem?:boolean;
    }
    interface CollapsableAttributes
    {
            collapsable?: boolean;
            defaultExpanded?: boolean;
            expanded?: boolean;
    }

    interface ColAttributes extends __React.DOMAttributes
    {
            xs?: number;
            sm?: number;
            md?: number;
            lg?: number;
            xsOffset?: number;
            smOffset?: number;
            mdOffset?: number;
            lgOffset?: number;
            xsPush?: number;
            smPush?: number;
            mdPush?: number;
            lgPush?: number;
            xsPull?: number;
            smPull?: number;
            mdPull?: number;
            lgPull?: number;
            componentClass: string;
    }

    interface CarouselItemAttributes extends __React.DOMAttributes
    {
            /**
             * oneOf(['prev', 'next']),
             */
            direction?: string;
            onAnimateOutEnd?: (index:string)=>void;
            active?: boolean;
            caption?: any;
    }
    interface CarouselAttributes extends ReactBootstrapAttributes
    {
            slide?:boolean;
            indicators?:boolean;
            controls?:boolean;
            pauseOnHover?:boolean;
            wrap?:boolean;
            onSelect?:(index?:string,direction?:string)=>void;
            onSlideEnd?: ()=>void;
            activeIndex?: number;
            defaultActiveIndex?: number;
            /**
             * 'prev' or 'next'
             */
            direction?:string;
    }
    interface ButtonGroupAttributes extends ReactBootstrapAttributes
    {
            vertical?:boolean;
            justified?:boolean;
    }
    interface ButtonAttributes extends ReactBootstrapAttributes
    {
            active?:boolean;
            disabled?: boolean;
            block?: boolean;
            navItem?:boolean;
            navDropdown?:boolean;
            componentClass?:string;
    }
    interface BadgeAttributes extends __React.DOMAttributes
    {
            pullRight?: boolean;
    }
    interface AlertAttributes extends ReactBootstrapAttributes
    {
            onDismiss?: (e?:__React.MouseEvent)=>void;
            dismissAfter?: number;
    }
    interface ReactBootstrapAttributes extends __React.DOMAttributes
    {
            /**
             * Used internally in react-bootstrap
             */
            bsClass?:string;
            /**
             * 'default','primary','success','info','warning','danger',
             *	'link','inline',
             *	'tabs','pills'
             **/
            bsStyle?:string;
            /**
             * 'large','medium','small','xsmall'
             */
            bsSize?:string;
    }
    interface AffixAttributes extends __React.DOMAttributes
    {
            offset?: number;
            offsetTop?: number;
            offsetBottom?: number;
    }

    interface MenuItemAttributes extends ReactBootstrapAttributes
    {
            header?:boolean;
            divider?:boolean;
            href?:string;
            title?:string;
            onSelect?:(key?:string)=>void;
    }
}
