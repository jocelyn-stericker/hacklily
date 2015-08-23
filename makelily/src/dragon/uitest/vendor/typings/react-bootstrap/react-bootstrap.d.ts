// Type definitions for react-bootstrap
// Project: https://react-bootstrap.github.io/
// Definitions by: Josh Netterfield <https://github/jnetterf>
// Definitions by: René Verheij <https://github.com/flyon>
// Definitions: https://github.com/borisyankov/DefinitelyTyped
/// <reference path="../react/react.d.ts" />

declare module "react-bootstrap" {
    export module FormControls {
        export class Static extends __React.Component<__Bootstrap.LabelAttributes, void> {
            render: () => any;
        }
    }

    export class Accordion extends __React.Component<__Bootstrap.PanelGroupAttributes, void> {
        render: () => any;
    }
    export class Affix extends __React.Component<__Bootstrap.AffixAttributes, void> {
        render: () => any;
    }
    // export class AffixMixin extends __React.Mixin<__Bootstrap.AffixAttributes, any> {
    // }
    export class Alert extends __React.Component<__Bootstrap.AlertAttributes, void> {
        render: () => any;
    }
    export class Badge extends __React.Component<__Bootstrap.BadgeAttributes, void> {
        render: () => any;
    }
    export class Button extends __React.Component<__Bootstrap.ButtonAttributes, void> {
        render: () => any;
    }
    // export class BootstrapMixin extends __React.Mixin<__Bootstrap.ReactBootstrapAttributes, any> {
    // }
    export class ButtonInput extends __React.Component<__Bootstrap.ButtonInputAttributes, void> {
        render: () => any;
    }
    export class ButtonGroup extends __React.Component<__Bootstrap.ButtonGroupAttributes, void> {
        render: () => any;
    }
    export class ButtonToolbar extends __React.Component<__Bootstrap.ReactBootstrapAttributes, void> {
        render: () => any;
    }
    export class CollapsibleNav extends __React.Component<__Bootstrap.CollapsibleNavAttributes, void> {
        render: () => any;
    }
    export class Carousel extends __React.Component<__Bootstrap.CarouselAttributes, void> {
        render: () => any;
    }
    export class CarouselItem extends __React.Component<__Bootstrap.CarouselItemAttributes, void> {
        render: () => any;
    }
    export class Col extends __React.Component<__Bootstrap.ColAttributes, void> {
        render: () => any;
    }
    // export class GenericMixin extends __React.Mixin<any, any> {
    // }
    export class DropdownButton extends __React.Component<__Bootstrap.DropdownButtonAttributes, void> {
        render: () => any;
    }
    export class DropdownMenu extends __React.Component<__Bootstrap.DropdownMenuAttributes, void> {
        render: () => any;
    }
    export class Glyphicon extends __React.Component<__Bootstrap.GlyphiconAttributes, void> {
        render: () => any;
    }
    export class Grid extends __React.Component<__Bootstrap.GridAttributes, void> {
        render: () => any;
    }
    export class Input extends __React.Component<__Bootstrap.InputAttributes, void> {
        render: () => any;
    }
    export class Interpolate extends __React.Component<__Bootstrap.InterpolateAttributes, void> {
        render: () => any;
    }
    export class Jumbotron extends __React.Component<__Bootstrap.JumbotronAttributes, void> {
        render: () => any;
    }
    export class Label extends __React.Component<__Bootstrap.LabelAttributes, void> {
        render: () => any;
    }
    export class ListGroup extends __React.Component<__Bootstrap.ListGroupAttributes, void> {
        render: () => any;
    }
    export class ListGroupItem extends __React.Component<__Bootstrap.ListGroupItemAttributes, void> {
        render: () => any;
    }
    export class MenuItem extends __React.Component<__Bootstrap.MenuItemAttributes, void> {
        render: () => any;
    }
    export class Modal extends __React.Component<__Bootstrap.ModalAttributes, void> {
        render: () => any;
    }
    module Modal {
        export class Header extends __React.Component<__Bootstrap.ModalHeaderAttributes, void> {
            render: () => any;
        }
        export class Title extends __React.Component<__Bootstrap.ModalTitleAttributes, void> {
            render: () => any;
        }
        export class Body extends __React.Component<__Bootstrap.ModalBodyAttributes, void> {
            render: () => any;
        }
        export class Footer extends __React.Component<__Bootstrap.ModalFooterAttributes, void> {
            render: () => any;
        }
    }
    export class ModalHeader extends __React.Component<__Bootstrap.ModalHeaderAttributes, void> {
        render: () => any;
    }
    export class ModalTitle extends __React.Component<__Bootstrap.ModalTitleAttributes, void> {
        render: () => any;
    }
    export class ModalBody extends __React.Component<__Bootstrap.ModalBodyAttributes, void> {
        render: () => any;
    }
    export class ModalFooter extends __React.Component<__Bootstrap.ModalFooterAttributes, void> {
        render: () => any;
    }
    export class ModalTrigger extends __React.Component<__Bootstrap.ModalTriggerAttributes, void> {
        render: () => any;
    }
    export class Overlay extends __React.Component<__Bootstrap.OverlayAttributes, void> {
        render: () => any;
    }
    export class Nav extends __React.Component<__Bootstrap.NavAttributes, void> {
        render: () => any;
    }
    export class NavItem extends __React.Component<__Bootstrap.NavItemAttributes, void> {
        render: () => any;
    }
    export class Navbar extends __React.Component<__Bootstrap.NavbarAttributes, void> {
        render: () => any;
    }
    export class OverlayTrigger extends __React.Component<__Bootstrap.OverlayTriggerAttributes, void> {
        render: () => any;
    }
    export class PageHeader extends __React.Component<__Bootstrap.PageHeaderAttributes, void> {
        render: () => any;
    }
    export class PageItem extends __React.Component<__Bootstrap.PageItemAttributes, void> {
        render: () => any;
    }
    export class Pager extends __React.Component<__Bootstrap.PagerAttributes, void> {
        render: () => any;
    }
    export class Pagination extends __React.Component<__Bootstrap.PaginationAttributes, void> {
        render: () => any;
    }
    export class Panel extends __React.Component<__Bootstrap.PanelAttributes, void> {
        render: () => any;
    }
    export class Position extends __React.Component<__Bootstrap.PositionAttributes, void> {
        render: () => any;
    }
    export class PanelGroup extends __React.Component<__Bootstrap.PanelGroupAttributes, void> {
        render: () => any;
    }
    export class Popover extends __React.Component<__Bootstrap.PopoverAttributes, void> {
        render: () => any;
    }
    export class Portal extends __React.Component<__Bootstrap.PortalAttributes, void> {
        render: () => any;
    }
    export class ProgressBar extends __React.Component<__Bootstrap.ProgressBarAttributes, void> {
        render: () => any;
    }
    export class Row extends __React.Component<__Bootstrap.RowAttributes, void> {
        render: () => any;
    }
    export class SplitButton extends __React.Component<__Bootstrap.SplitButtonAttributes, void> {
        render: () => any;
    }
    export class SubNav extends __React.Component<__Bootstrap.SubNavAttributes, void> {
        render: () => any;
    }
    export class TabPane extends __React.Component<__Bootstrap.TabPaneAttributes, void> {
        render: () => any;
    }
    export class TabbedArea extends __React.Component<__Bootstrap.TabbedAreaAttributes, void> {
        render: () => any;
    }
    export class Table extends __React.Component<__Bootstrap.TableAttributes, void> {
        render: () => any;
    }
    export class Tooltip extends __React.Component<__Bootstrap.TooltipAttributes, void> {
        render: () => any;
    }
    export class Thumbnail extends __React.Component<__Bootstrap.ThumbnailAttributes, void> {
        render: () => any;
    }
    export class Well extends __React.Component<__Bootstrap.WellAttributes, void> {
        render: () => any;
    }
}

declare module __Bootstrap {
    export interface ButtonAttributes extends __React.Props<any> {
        active?: boolean;
        block?: boolean;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        /**
         * You can use a custom element for this component
         */
        componentClass?: string;
        disabled?: boolean;
        href?: string;
        navDropdown?: boolean;
        navItem?: boolean;
        target?: string;
        /**
         * Defines HTML button type Attribute ("button", "reset", "submit")
         */
        type?: string;

        onClick?: (event?: Event, href?: string, target?: any) => void;
    }

    export interface ButtonGroupAttributes extends __React.Props<any> {
        /**     
         * Display block buttons, only useful when used with the "vertical" prop.
         */
        block?: boolean;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        justified?: boolean;
        vertical?: boolean;
    }

    export interface DropdownButtonAttributes extends __React.Props<any> {
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        buttonClassName?: string;
        children?: any;
        className?: string;
        dropup?: boolean;
        href?: string;
        id?: string;
        navItem?: boolean;
        noCaret?: boolean;
        onClick?: (key?: string) => void;
        onSelect?: (key?: string) => void;
        pullRight?: boolean;
        title?: any;
    }

    export interface SplitButtonAttributes extends __React.Props<any> {
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        children?: any;
        className?: string;
        disabled?: boolean;
        dropdownTitle?: string;
        dropup?: boolean;
        href?: string;
        id?: string;
        onClick?: (event?: Event, href?: string, target?: any) => void;
        onSelect?: (key?: string) => void;
        pullRight?: boolean;
        target?: string;
        title?: any;
    }

    export interface MenuItemAttributes extends __React.Props<any> {
        active?: boolean;
        disabled?: boolean;
        divider?: boolean;
        eventKey?: any;
        header?: boolean;
        href?: string;
        onSelect?: (eventKey?: any, href?: string, target?: any) => void;
        target?: string;
        title?: string;
    }

    export interface CollapsibleAttributes extends __React.Props<any> {
        collapsable?: boolean;
        defaultExpanded?: boolean;
        expanded?: boolean;
    }

    export interface PanelAttributes extends __React.Props<any> {
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        eventKey?: string; 
        footer: any;
        header: any;
        id: string;
        onSelect: (key?: string) => void;

        collapsable?: boolean;
        defaultExpanded?: boolean;
        expanded?: boolean;
    }

    export interface PanelGroupAttributes extends __React.Props<any> {
        accordion?: boolean;
        activeKey?: string;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        className?: string;
        defaultActiveKey?: any;
        onSelect?: (key?: string) => void;
    }

    export interface ModalAttributes  extends __React.Props<any> {
        /**
         * Open and close the Modal with a slide and fade animation.
         */
        animation?: boolean;

        /**
         * When true The modal will automatically shift focus to itself when it
         * opens, and replace it to the last focused element when it closes.
         * Generally this should never be set to false as it makes the Modal
         * less accessible to assistive technologies, like screen-readers.
         */
        autoFocus?: boolean

        /**
         * Include a backdrop component. Specify 'static' for a backdrop that doesn't
         * trigger an "onHide" when clicked. ("static", true, false)
         */
        backdrop?: string | boolean;

        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        /**
         * The DOM Node that the Component will render it's children into
         */
        container?: any;

        /**
         * A css class to apply to the Modal dialog DOM node.
         */
        dialogClassName?: string

        /**
         * When true The modal will prevent focus from leaving the Modal while open.
         * Consider leaving the default value here, as it is necessary to make the
         * Modal work well with assistive technologies, such as screen readers.
         */
        enforceFocus?: boolean;

        /**
         * Close the modal when escape key is pressed
         */
        keyboard?: boolean

        onHide: () => void;

        show?: boolean;
    }

    export interface ModalTriggerAttributes extends OverlayAttributes, __React.Props<any> {
        modal: any;
        container: any;
        onBlur: () => void;
        onFocus: () => void;
        onMouseOut: () => void;
        onMouseOver: () => void;
    }

    export interface ModalHeaderAttributes  extends __React.Props<any> {
        /**
         * Specify whether the Component should contain a close button
         */
        closeButton?: boolean;

        /**
         * A css class applied to the Component
         * 'modal-header' by default
         */
        modalClassName?: string;

        /**
         * A Callback fired when the close button is clicked.
         * If used directly inside a Modal component, the onHide will
         * automatically be propagated up to the parent Modal onHide.
         */
        onHide?: () => void;

        /**
         * The 'aria-label' attribute is used to define a string that labels
         * the current element. It is used for Assistive Technology when the
         * label text is not visible on screen.
         */
        'aria-label'?: string;
    }

    export interface ModalBodyAttributes extends __React.Props<any> {
        /**
         * A css class applied to the Component
         * 'modal-title' by default
         */
        modalClassName?: string;
    }

    export interface ModalTitleAttributes extends __React.Props<any> {
        /**
         * A css class applied to the Component
         * 'modal-body' by default
         */
        modalClassName?: string;
    }

    export interface ModalFooterAttributes extends __React.Props<any> {
        /**
         * A css class applied to the Component
         * 'modal-footer' by default
         */
        modalClassName?: string;
    }

    export interface OverlayTriggerAttributes extends __React.Props<any> {
        /**
         * Use animation
         */
        animation?: boolean | any;

        /**
         * The DOM Node that the Component will render it's children into
         */
        container?: any;

        /**
         * Minimum spacing in pixels between container border and component border
         */
        containerPadding?: number;

        /**
         * The initial visibility state of the Overlay, for more nuanced visibility
         * controll consider using the Overlay component directly.
         */
        defaultOverlayShown?: boolean

        /**
         * A millisecond delay amount to show and hide the Overlay once triggered
         */
        delay?: number;

        /**
         * A millisecond delay amount before hiding the Overlay once triggered.
         */
        delayHide?: number;

        /**
         * A millisecond delay amount before showing the Overlay once triggered.
         */
        delayShow?: number;

        /**
         * Callback fired before the Overlay transitions in
         */
        onEnter?: () => void;

        /**
         * Callback fired after the Overlay finishes transitioning in
         */
        onEntered?: () => void;

        /**
         * Callback fired as the Overlay begins to transition in
         */
        onEntering?: () => void;

        /**
         * Callback fired right before the Overlay transitions out
         */
        onExit?: () => void;

        /**
         * Callback fired after the Overlay finishes transitioning out
         */
        onExited?: () => void;

        /**
         * Callback fired as the Overlay begins to transition out
         */
        onExiting?: () => void;

        /**
         * An element or text to overlay next to the target.
         */
        overlay?: string | any;

        /**
         * How to position the component relative to the target
         * ('top', 'right', 'bottom', or 'left')
         */
        placement?: string;

        /**
         * Specify whether the overlay should trigger onHide when
         * the user clicks outside the overlay
         */
        rootClose?: boolean;

        /**
         * Specify which action or actions trigger Overlay visibility
         *
         * one of: 'click', 'hover', 'focus' |
         * or array<one of: 'click', 'hover', 'focus'>
         */
        trigger?: string | string[];
    }

    export interface TooltipAttributes extends __React.Props<any> {
        /**
         * The "left" position value for the Tooltip arrow.
         */
        arrowOffsetLeft: number | string;

        /**
         * The "top" position value for the Tooltip arrow.
         */
        arrowOffsetTop?: number | string

        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        /**
         * An html id attribute, necessary for accessibility
         */
        id: string;

        /**
         * Sets the direction the Tooltip is positioned towards.
         */
        placement?: string;

        /**
         * The "left" position value for the Tooltip.
         */
        positionLeft?: number;

        /**
         * The "top" position value for the Tooltip.
         */
        positionTop?: number;

        /**
         * Title text
         */
        title?: any;
    }

    export interface PopoverAttributes extends __React.Props<any> {
        /**
         * The "left" position value for the Popover arrow.
         */
        arrowOffsetLeft?: number | string;

        /**
         * The "top" position value for the Popover arrow.
         */
        arrowOffsetTop?: number | string

        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        /**
         * An html id attribute, necessary for accessibility
         */
        id: string;

        /**
         * Sets the direction the Popover is positioned towards.
         *
         * one of: 'top', 'right', 'bottom', 'left'
         */
        placement?: string;

        /**
         * The "left" position value for the Popover.
         */
        positionLeft?: number;

        /**
         * The "top" position value for the Popover.
         */
        positionTop?: number;

        /**
         * Title text
         */
        title?: any;
    }

    export interface OverlayAttributes extends __React.Props<any> {
        /**
         * Use animation
         */
        animation?: boolean | any;

        /**
         * The DOM Node that the Component will render it's children into
         */
        container?: any;

        /**
         * Minimum spacing in pixels between container border and component border
         */
        containerPadding?: number;

        /**
         * Callback fired before the Overlay transitions in
         */
        onEnter?: () => void;

        /**
         * Callback fired after the Overlay finishes transitioning in
         */
        onEntered?: () => void;

        /**
         * Callback fired as the Overlay begins to transition in
         */
        onEntering?: () => void;

        /**
         * Callback fired right before the Overlay transitions out
         */
        onExit?: () => void;

        /**
         * Callback fired after the Overlay finishes transitioning out
         */
        onExited?: () => void;

        /**
         * Callback fired as the Overlay begins to transition out
         */
        onExiting?: () => void;

        /**
         * A Callback fired by the Overlay when it wishes to be hidden.
         */
        onHide?: () => void;

        /**
         * How to position the component relative to the target
         * 
         * one of: 'top', 'right', 'bottom', 'left'
         */
        placement?: string;

        /**
         * Specify whether the overlay should trigger onHide when the user
         * clicks outside the overlay
         */
        rootClose?: boolean;

        /**
         * Set the visibility of the Overlay
         */
        show?: boolean;

        /**
         * Function mapping props to DOM node the component is positioned next to
         */
        target?: (props: string) => any;
    }

    export interface ProgressBarAttributes extends __React.Props<any> {
        active?: boolean;

        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        className?: string;
        interpolateClass?: string;
        node?: any;
        isChild?: boolean;
        label?: any;
        max?: number;
        min?: number;
        now?: number
        srOnly?: boolean;
        striped?: boolean;
    }

    export interface NavAttributes extends __React.Props<any> {
        activeHref?: string
        activeKey?: any
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string

        /**
         * one of: 'tabs', 'pills', "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string
        /**
         * CSS classes for the wrapper nav element
         */
        className?: string

        collapsible?: boolean
        expanded?: boolean

        eventKey?: any
        /**
         * HTML id for the wrapper nav element
         */
        id?: string

        justified?: boolean
        navbar?: boolean
        onSelect?: (eventKey: string, href: string, target: any) => void
        pullRight?: boolean
        right?: boolean
        stacked?: boolean
        /**
         * CSS classes for the inner ul element
         */
        ulClassName?: string

        /**
         * HTML id for the inner ul element
         */
        ulId?: string
    }

    export interface NavItemAttributes extends __React.Props<any> {
        active?: boolean;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        
        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        disabled?: boolean;
        eventKey?: any;
        href?: string;
        linkId?: string;
        onSelect?: (key?: string, href?: string) => void;
        role?: string;
        target?: string;
        title?: any;
        'aria-controls'?: string;
    }

    export interface NavbarAttributes extends __React.Props<any> {
        brand?: any;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        /**
         * You can use a custom element for this component
         */
        componentClass?: string;

        defaultNavExpanded?: boolean
        fixedBottom?: boolean
        fixedTop?: boolean
        fluid?: boolean
        inverse?: boolean
        navExpanded?: boolean
        onToggle?: () => void;
        role?: string
        staticTop?: boolean
        toggleButton?: any;
        toggleNavKey?: string | number
    }

    export interface TabbedAreaAttributes extends __React.Props<any> {
        activeKey?: any;
        animation?: boolean;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: 'tabs', 'pills', "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        defaultActiveKey?: any;
        id?: string;
        onSelect?: (key?: string) => void;
    }
    export interface TabPaneAttributes extends __React.Props<any> {
        active?: boolean
        animation?: boolean;
        disabled?: boolean;
        onAnimateOutEnd?: () => void;
    }

    export interface PagerAttributes extends __React.Props<any> {
        onSelect: () => void;
    }
    export interface PageItemAttributes extends __React.Props<any> {
        disabled?: boolean;
        eventKey?: any;
        href?: string;
        next?: boolean;
        onSelect?: (key?: string, href?: string) => void;
        previous?: boolean;
        target?: string;
        title?: string;
    }

    export interface PaginationAttributes extends __React.Props<any> {
        activePage?: number;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        ellipsis?: boolean;
        first?: boolean;
        items?: number;
        last?: boolean;
        maxButtons?: number;
        next?: boolean;
        onSelect: (eventKey: string | number, href: string, target: any) => void;
        prev?: boolean;
    }

    export interface AlertAttributes extends __React.Props<any> {
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        closeLabel?: string;
        onDismiss?: (e?:__React.MouseEvent) => void;
        dismissAfter?: number;
    }

    export interface CarouselAttributes extends __React.Props<any> {
        activeIndex?: number;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        controls?: boolean;
        defaultActiveIndex?: number;
        /**
         * one of: 'prev', 'next'
         */
        direction?: string;
        indicators?: boolean;
        /**
         * Like 5000
         */
        interval?: number;
        /**
         * Like <Glyphicon glyph="chevron-right" />
         */
        nextIcon?: any;
        onSelect?: (index?: string, direction?: string) => void;
        onSlideEnd?: () => void;
        pauseOnHover?: boolean;
        /**
         * Like <Glyphicon glyph="chevron-left" />
         */
        prevIcon?: any;
        slide?: boolean
        wrap?: boolean;
    }

    export interface CarouselItemAttributes extends __React.Props<any> {
        active?: boolean;
        animateIn?: boolean;
        animateOut?: boolean;
        caption?: any;
        /**
         * one of: 'prev', 'next'
         */
        direction?: string;
        index?: number;
        onAnimateOutEnd?: (index: string) => void;
    }

    export interface GridAttributes extends __React.Props<any> {
        /**
         * Turn any fixed-width grid layout into a full-width layout by this property.
         * Adds container-fluid class.
         */
        fluid?: boolean;

        /**
         * You can use a custom element for this component
         */
        compenentClass?: string;
    }

    export interface RowAttributes extends __React.Props<any> {
        /**
         * You can use a custom element for this component
         */
        componentClass?: string;
    }

    export interface ColAttributes extends __React.Props<any> {
        /**
         * You can use a custom element for this component
         */
        componentClass?: string;

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
    }

    export interface ThumbnailAttributes extends __React.Props<any> {
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;

        alt?: string;
        href?: string;
        src?: string;
    }

    export interface ListGroupAttributes extends __React.Props<any> {
        className?: string;
        id?: string;
    }
    export interface ListGroupItemAttributes extends __React.Props<any> {
        active?: any;
        /**
         * one of: "xsmall", "small", "medium", "large"
         */
        bsSize?: string;

        /**
         * one of: 'danger', 'info', 'success', 'warning', "warning", "danger", "link"
         */
        bsStyle?: string;
        className?: string
        disabled?: any
        eventKey?: any
        header?: any
        href?: string
        listItem?: boolean
        onClick?: (key: string, href: string) => void;
        target?: string
    }

    export interface LabelAttributes extends __React.Props<any> {
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         **/
        bsStyle?: string;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
    }

    export interface BadgeAttributes extends __React.Props<any> {
        pullRight?: boolean;
    }

    export interface JumbotronAttributes extends __React.Props<any> {
        /**
         * You can use a custom element for this component
         */
        componentClass?: string;
    }

    export interface PageHeaderAttributes extends __React.Props<any> {
    }

    export interface WellAttributes extends __React.Props<any> {
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         **/
        bsStyle?: string;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
    }

    export interface GlyphiconAttributes extends __React.Props<any> {
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         **/
        bsStyle?: string;
        /**
         * "xsmall", "small", "medium", "large"
         */
        bsSize?: string;
        glyph?: string;
    }

    export interface TableAttributes extends __React.Props<any> {
        bordered?: boolean;
        condensed?: boolean;
        hover?: boolean;
        responsive?: boolean;
        striped?: boolean;
    }

    export interface InputAttributes extends __React.Props<any> {
        addonAfter?: any;
        addonBefore?: any;
        /**
         * one of: 'small', 'medium', 'large'
         */
        bsSize?: string;
        /**
         * one of: 'success', 'warning', 'error'
         */
        bsStyle?: string;
        buttonAfter?: any;
        buttonBefore?: any;
        disabled?: boolean;
        groupClassName?: string;
        hasFeedback?: boolean;
        help?: any;
        id?: string;
        label?: any;
        labelClassName?: string;
        multiple?: boolean;
        placeholder?: string;
        /**
         * Defines HTML button type Attribute ("button", "reset", "submit")
         */
        type?: string;
        value?: any;
        wrapperClassName?: string;
    }

    export interface PortalAttributes extends __React.Props<any> {
        container?: any;
    }

    export interface PositionAttributes extends __React.Props<any> {
        target?: (props: any) => any;
        placement?: string;
        containerPadding?: number;
        container?: any;
    }

    export interface SubNavAttributes extends __React.Props<any> {
        onSelect?: (key?: string, href?: string) => void;
        active?: boolean;
        activeHref?: string;
        activeKey?: number | string;
        disabled?: boolean;
        eventKey?: number | string;
        href?: string;
        title?: string;
        text?: any;
        target?: string;
    }

    export interface InterpolateAttributes extends __React.Props<any> {
        component?: any;
        format?: string;
        unsafe?: boolean;
    }

    export interface DropdownMenuAttributes extends __React.Props<any> {
        pullRight?: boolean;
        onSelect?: (key: string | number) => void;
    }

    export interface CollapsibleNavAttributes extends __React.Props<any> {
        onSelect?: (key?: string) => void;
        activeHref?: string
        activeKey?: any
        collapsible?: boolean
        expanded?: boolean
        eventKey?: string | number;
    }

    export interface ButtonInputAttributes extends __React.Props<any> {
        /**
         * Defines HTML button type Attribute ("button", "reset", "submit")
         */
        type?: any;
        /**
         * "default", "primary", "success", "info", "warning", "danger", "link"
         */
        bsStyle?: string;
        value?: any;
    }

    export interface ReactBootstrapAttributes extends __React.Props<any> {
            /**
             * 'default','primary','success','info','warning','danger',
             *	'link','inline',
             *	'tabs','pills'
             **/
            bsStyle?: string;
            /**
             * 'large','medium','small','xsmall'
             */
            bsSize?: string;
    }

    export interface AffixAttributes extends __React.Props<any> {
        offset?: number;
        offsetTop?: number;
        offsetBottom?: number;
    }
}
