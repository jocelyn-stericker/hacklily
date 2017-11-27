import { IModel, ILayout } from "./document";
/**
 * Registers Proxy in the factory structure passed in.
 */
declare function Export(constructors: {
    [key: number]: any;
}): void;
declare module Export {
    interface IProxyModel extends IModel {
    }
    interface IProxyLayout extends ILayout {
        model: IProxyModel;
    }
}
export default Export;
