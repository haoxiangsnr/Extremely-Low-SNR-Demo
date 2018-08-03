import { connect } from 'dva';
import React, { Component } from 'react';
import { Button, Row, Col, Layout, notification  } from 'antd'
import Header from '../components/Header'
import Banner from '../components/Banner'
import Recorder from 'recorder-js'
import request from '../utils/request'
import randomNum from '../utils/randomNum'
import FetchTextPage from './FetchTextPage'
import styles from './IndexPage.module.less'

/*CONST*/
const POST_URL = `http://183.175.14.88:8080/post`
const USER_ID = randomNum(20);

const isEmpty = (arr) => {
    if (arr.length) {
        if (Object.keys(arr[0]).length) {
            return true;
        }
    }
    return false;
};


class IndexPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            record: false, // 打开或关闭录音机
            recording: false, // 是否正在录音，与recorder不同
            cyclicTrans: false,
            timer: 0
        }
    }

    openNotificationWithIcon = (type, mess, des) => {
        notification[type]({
            message: mess,
            description: des,
        });
    };

    timeFormatting = (timestamp) => {
        return String(timestamp).slice(0, 10);
    };

    componentDidMount = () => {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
            this.audio_context = new AudioContext();
            this.openNotificationWithIcon("success", "初始化成功！");
        }
        catch (e) {
            this.openNotificationWithIcon("error", "未识别到浏览器录音设备，请检查相关设置！")
        }

        this.recorder = new Recorder(this.audio_context);
        navigator.mediaDevices.getUserMedia({
            audio: true
        })
        .then( stream => this.recorder.init(stream))
        .catch( e => {
                this.openNotificationWithIcon('error', `创建语音流失败，请联系开发人员，错误信息： ${e}`);
        });
    };

    stopCyclicTransTimer = () => {
        this.setState({
            cyclicTrans: true
        });
        if (this.CyclicTransTimer) {
            clearInterval(this.CyclicTransTimer);
        }
    };

    handleRecord = () => {
        let { record, recording } = this.state;


        if (record && recording) {
            this.stopCyclicTransTimer();
            this.clearTimer();
            this.stopRecording(Date.now());
            this.setState({
                recording: false,
                record: true,
            });
        }

        if (!recording) {
            // 修改为100ms发一次
            this.setState({
                record:true,
                recording: true,
            });
            this.CyclicTransTimer = setInterval( () => {
                if (this.state.cyclicTrans) {
                    this.stopRecording(Date.now());
                }
                this.recorder.start()
                .then(() => {
                    this.setState({
                        cyclicTrans: true
                    })
                })
            }, 1000);
        }
    };

    stopRecording = (timeStamp) => {
        const {dispatch} = this.props;

        this.recorder.stop()
        .then(({blob}) => {
            console.log(this.props.timeStamps)
            this.getAndSendBlobOfBase64(blob, timeStamp);
            dispatch({
                type: "timeStamp/add",
                payload: {
                    timeStamp: this.timeFormatting(timeStamp),
                    userId: USER_ID,
                    text: ''
                }
            });
        })
    };

    getAndSendBlobOfBase64 = (blob, timeStamp) => {
        let reader = new FileReader();
        reader.addEventListener("load", (e) => {

            request(POST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userid: USER_ID,
                    timestamp: this.timeFormatting(timeStamp),
                    content: e.target.result
                })
            });
        });
        reader.readAsDataURL(blob);
    };

    clearTimer = () => {
        if (this.timer) {
            clearInterval(this.timer);
        }
    };

    handleFinish = () => {
        this.stopCyclicTransTimer();
        this.clearTimer();
        this.stopRecording(Date.now());
        this.setState({
            recording: false,
            record: false
        });
    };


    render() {
        let { timer, record, recording } = this.state;
        let signalWord;

        if (record && recording) {
            signalWord = `暂停`;
        }
        else if (record && !recording) {
            signalWord = `继续`
        }
        else {
            signalWord = `开始`
        }
/*        while (isEmpty(this.props.timeStamps)) {
           this.props.dispatch({
               type: 'timeStamp/fetch_text',
               payload: {

               }
           })
        }*/

        return (
            <div className="App">
                <Header selectedKeys={['1']}/>

                <Banner />

                <Layout className={styles.content}>
                    <Row>
                        <Col span={12} style={{padding: 20, textAlign: 'center'}}>
                            <Button type='primary' onClick={this.handleRecord}>{signalWord}翻译</Button>
                        </Col>
                        <Col span={12} style={{padding: 20, textAlign: 'center'}}>
                            <Button type="primary" onClick={this.handleFinish} disabled={!record}>结束翻译</Button>
                        </Col>
                    </Row>
                </Layout>

                <Layout className={styles.content}>
                    <Row>
                        <Col span={14} offset={5}>
                            <FetchTextPage start={record} USER_ID={USER_ID}/>
                        </Col>
                    </Row>
                </Layout>
           </div>);
    }
}

IndexPage.propTypes = {
};

export default connect((state) => {
    return {timeStamps: state.timeStamp}
})(IndexPage);
