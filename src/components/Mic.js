import React, {Component} from 'react';
import { ReactMic } from 'react-mic';

export default class Mic extends Component {

    render () {
        let { onSave, isRecording } = this.props;
        return (
            <div>
                <ReactMic
                    className="App-mic"
                    onStop={onSave}
                    backgourndColor="#FF4081"
                    record={isRecording}
                    audioBitsPerSecond={128000}
                />
            </div>
        )
    }
}

Mic.defaultProps = {
    onSave: () => {
        console.log("These is onPause")
    },
    record: false,
    isRecording: false
}