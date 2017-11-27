declare const tabStyles: {
    help: {
        left: number;
        opacity: 0;
        pointerEvents: string;
        position: "absolute";
        top: number;
        transition: string;
        zIndex: 1;
    };
    helpVisible: {
        opacity: 1;
        pointerEvents: string;
    };
    insert: {
        ':hover': {
            backgroundColor: string;
        };
        backgroundColor: string;
        borderColor: string;
        borderRadius: string;
        borderWidth: string;
        boxShadow: string;
        color: string;
        cursor: string;
        fontSize: number;
        height: number;
        width: string;
    };
    lyPreview: {
        backgroundColor: string;
        borderRadius: string;
        height: number;
        marginBottom: number;
        overflow: "scroll";
        padding: number;
    };
    outputOptions: {
        fontSize: number;
        position: "absolute";
        right: number;
        top: number;
    };
    paletteSml: {
        fontSize: number;
    };
    radioGroup: {
        marginLeft: number;
    };
    resetFont: {
        fontSize: string;
    };
    section: {
        ':first-of-type': {
            marginTop: number;
        };
        marginTop: number;
        position: "relative";
    };
    selectableDescription: {
        backgroundColor: string;
        bottom: number;
        color: string;
        fontSize: number;
        height: number;
        left: number;
        lineHeight: string;
        position: "absolute";
        right: number;
        textAlign: string;
    };
    selectableList: {
        display: string;
        flexWrap: "wrap";
    };
    selectableOption: {
        ':hover': {
            backgroundColor: string;
        };
        border: string;
        borderRadius: number;
        color: string;
        cursor: string;
        display: string;
        margin: number;
        overflow: "hidden";
        position: "relative";
        width: number;
    };
    selectableSelected: {
        backgroundColor: string;
        cursor: string;
    };
    spacer: {
        flexGrow: 1;
    };
    tool: {
        boxSizing: string;
        display: string;
        flexDirection: "column";
        height: string;
        overflowX: "hidden";
        overflowY: "scroll";
        padding: string;
    };
    toolHeading: {
        fontSize: number;
        margin: number;
    };
};
export default tabStyles;
