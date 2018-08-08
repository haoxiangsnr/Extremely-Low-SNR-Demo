import {connect} from 'dva';
import React, {Component} from 'react';
import {Button, Card, Col, Icon, Layout, notification, Row} from 'antd'
import Header from '../../components/Header/Header'
import Banner from '../../components/Banner/Banner'
import fetch from 'dva/fetch'
import randomNum from '../../utils/randomNum'
import styles from './IndexPage.module.less'
import _ from 'lodash'
import Recorder from 'opus-recorder'
/*CONST*/

const POST_URL = `http://183.175.14.88:8080/post`;
// const POST_URL = `http://202.207.12.156:8000/asr`;
// const POST_URL = `http://localhost:5000/`;
const USER_ID = randomNum(20);

class IndexPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            record: false, // 打开或关闭录音机
            recording: false, // 是否正在录音，与recorder不同
            cyclicTrans: false, // cyclic transfer
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
        if (Recorder.isRecordingSupported()) {
            this.openNotificationWithIcon("success", "初始化成功！");
        }
        else {
            this.openNotificationWithIcon("error", "插耳机了吗？换最新版浏览器了吗？反正我无法挽救！")
        }
        this.recorder = new Recorder({
            numberOfChannels: 1,
            encoderPath: 'waveWorker.min.js',
            encoderSampleRate: 16000,
            originalSampleRateOverride: 16000
        });

        this.recorder.ondataavailable = (buffer) => {
            let dataBlob = new Blob([buffer], {type: "audio/wav"});
            console.log("结束录音，并准备编码数据并发送", Date.now(), dataBlob);
            this.getAndSendBlobOfBase64(dataBlob, Date.now());
        }
    };

    setTimer = () => {
        this.setState({
            cyclicTrans: true
        }, () => {
            this.recorder.start()
                .then( () => {
                    console.log("开始录音");
                    this.timer = setTimeout(this.cyclicTransform, 3000);
                })
                .catch(e => {
                    console.log("请联系程序员", e);
                })
        });
    };

    cyclicTransform = () => {
        if (this.state.cyclicTrans) {
            this.setState({
                cyclicTrans: false
            });
            clearTimeout(this.timer);
            this.stopRecording()
                .then(() => {
                    this.setTimer();
                })
        }
        else {
            this.setTimer();
        }
    };

    handleRecord = () => {
        let { record, recording } = this.state;

        if (record && recording) {
            this.stopRecording();
            this.setState({
                recording: false,
                record: true,
            });
        }

        if (!recording) {
            this.setState({
                record:true,
                recording: true,
            });
            this.cyclicTransform();
        }
    };

    stopRecording = () => {
        let pro = new Promise((resolve) => {
            clearTimeout(this.timer);
            this.recorder.stop();
            resolve();
        });
        return pro;
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
        let formData = new FormData();
        formData.append('userid', USER_ID);
        formData.append('timestamp', this.timeFormatting(timeStamp));
        formData.append('content', blob);
        // formData.append('wave', blob);
        // formData.append('fs', 48000);
        fetch(POST_URL, {
            method: 'POST',
            body: formData
        })
            .then(this.checkStatus)
            .then(this.parseJSON)
            .then(data => {
                const {dataSource} = this.state;
                this.setState({
                    dataSource: this.sortedByTimeStamp(dataSource.concat({
                        timeStamp: data.timestamp,
                        text: data.content
                    }))
                });
            })
            .catch( err => {
                console.log(err)
            });
    };

    handleFinish = () => {
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

                <Layout.Header className={styles.controlBar}>
                    <Row>
                        <Col span={8} style={{textAlign: 'right'}}>
                            <Button type='primary' onClick={this.handleRecord}>{signalWord}翻译</Button>
                        </Col>
                        <Col offset={8} span={8} style={{ textAlign: 'left'}}>
                            <Button type="primary" onClick={this.handleFinish} disabled={!record}>结束翻译</Button>
                        </Col>
                    </Row>
                </Layout.Header>

                <Banner />

                <Layout className={styles.content}>
                    <Row>
                        <Col span={14} offset={5}>
                            <Card title={
                                    <Row>
                                        <Col span={12} style={{textAlign: 'left'}}>
                                            语音转换结果
                                        </Col>
                                        <Col span={12} style={{textAlign: 'right'}}>
                                            { recording ? <Icon type={"loading"} style={{color: '#40a9ff'}} /> : ''}
                                        </Col>
                                    </Row>
                            } bodyStyle={{overflowY: 'scroll', height: 400}}>
                                <div className={styles.texts}>
                                    {dataSource.map( (e, i) => {
                                        return (
                                            <span key={e.timeStamp}>{e.text}</span>
                                        )
                                    })}
                                </div>
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
