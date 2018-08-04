import { connect } from 'dva';
import React, { Component } from 'react';
import { Button, Row, Card,Col, Layout, notification  } from 'antd'
import Header from '../components/Header'
import Banner from '../components/Banner'
import Recorder from 'recorder-js'
import fetch from 'dva/fetch'
import randomNum from '../utils/randomNum'
import styles from './IndexPage.module.less'
import _ from 'lodash'
/*CONST*/
const POST_URL = `http://183.175.14.88:8080/post`;
const USER_ID = randomNum(20);

class IndexPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            record: false, // 打开或关闭录音机
            recording: false, // 是否正在录音，与recorder不同
            cyclicTrans: false,
            dataSource: []
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
            }, 3000);
        }
    };

    stopRecording = (timeStamp) => {
        this.recorder.stop()
        .then(({blob}) => {
            this.getAndSendBlobOfBase64(blob, timeStamp);
        });
    };

    parseJSON = (response) => {
        return response.json();
    };

    checkStatus = (response) => {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
        const error = new Error(response.statusText);
        error.response = response;
        throw error;
    };

    sortedByTimeStamp = (objList) => {
        return _.sortBy(objList, 'timeStamp');
    };

    getAndSendBlobOfBase64 = (blob, timeStamp) => {
        let reader = new FileReader();
        reader.addEventListener("load", (e) => {
            fetch(POST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userid: USER_ID,
                    timestamp: this.timeFormatting(timeStamp),
                    content: e.target.result
                })
            })
                .then(this.checkStatus)
                .then(this.parseJSON)
                .then(data => {
                    const {dataSource} = this.state;
                    console.log('dataSource', dataSource);
                    this.setState({
                       dataSource: this.sortedByTimeStamp(dataSource.concat({
                           timeStamp: data.timestamp,
                           text: data.content
                       }))
                    });
                })
                .catch( err => ({ err }));
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
        let { record, dataSource, recording } = this.state;
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
                            <Card title={'语音转换结果'}>
                                {dataSource.map( (e, i) => {
                                    return (
                                        <span key={e.timeStamp}>{e.text}</span>
                                    )
                                })}
                            </Card>
                        </Col>
                    </Row>
                </Layout>
           </div>);
    }
}

IndexPage.propTypes = {
};

export default connect()(IndexPage);
