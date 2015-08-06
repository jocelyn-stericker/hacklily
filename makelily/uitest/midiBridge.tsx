import React = require("react");
import DAWComponent from "./dawComponent";

@DAWComponent("live.effects.midiBridge.MidiBridge", 2)
class Soundfont extends React.Component<
    {
        children?: any
    },
    {
        remote?: any
    }> {

    press() {
        this.setRemoteState({
            event: {
                type: "NOTE_ON",
                note: 80,
                velocity: 80,
                channel: 1,
            }
        });
    }

    setRemoteState: (remoteState: any) => void;
    
    render() {
        console.log(this.state);
        return <span>
            <button onClick={() => this.press()}>TEST</button>
            {this.props.children}
        </span>;
    }
};

export default Soundfont;