import React = require("react");
import DAWComponent from "./dawComponent";

@DAWComponent("live.effects.soundfont.Soundfont", 2)
class Soundfont extends React.Component<
    {
        children?: any
    },
    {}> {

    componentDidMount() {
        this.setRemoteState({
            action: "loadSoundfont",
            url: "/Users/josh/ripieno/dragon/vendor/gm/gm.sf2"
        });
    }

    setRemoteState: (remoteState: any) => void;
    
    render() {
        return <span>
            {this.props.children}
        </span>;
    }
};

export default Soundfont;