import {connect} from 'dva';
import React, {Component} from 'react';
import {Button, Card, Col, Icon, Layout, notification, Row} from 'antd'
import Header from '../../components/Header/Header'
import Banner from '../../components/Banner/Banner'
import fetch from 'dva/fetch'
import randomNum from '../../utils/randomNum'
import styles from './IndexPage.module.less'
import _ from 'lodash'
import Recorder from '../../utils/recorder'
import resampler from '../../utils/resampler'
/*CONST*/

const POST_URL = `https://haoxiang.tech/post`;
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
        this.openNotificationWithIcon("success", "初始化成功，当浏览器提示需要使用麦克风时请点击“确定”。");

        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
        }
        catch (e) {
            this.openNotificationWithIcon("error", "浏览器太旧了，请使用推荐浏览器！", e.toString());
        }

        this.recorder = new Recorder({
            numberOfChannels: 1,
            encoderPath: 'waveWorker.min.js',
        });

        this.recorder.ondataavailable = (buffer) => {
            let dataBlob = new Blob([buffer], {type: "audio/wav"});
            // console.info(`结束并开始上传录音标识-----${new Date().toLocaleString()}`);
            this.getAndSendBlob(dataBlob, Date.now());
        }
    };

    handleRecordError = (e) => {
        if (e.name === "NotAllowedError") {
            this.openNotificationWithIcon("error", "浏览器未被允许使用麦克风，请修改浏览器设置并重试！", e.toString());
        }
        else if (e.name === "NotFoundError") {
            this.openNotificationWithIcon("error", "浏览器未发现麦克风，请插入麦克风并允许浏览器使用麦克风功能！", e.toString());
        }
        else {
            this.openNotificationWithIcon("error", "网络出现错误了，如果其他网页你都可以正常访问，请尽快联系程序员接锅！", e.toString());
        }
    };

    setTimer = () => {
        this.setState({
            cyclicTrans: true
        }, () => {
            this.recorder.start()
                .then( () => {
                    // console.info(`开始录音标识-----${new Date().toLocaleString()}`);
                    this.timer = setTimeout(this.cyclicTransform, 3000);
                })
                .catch(e => {
                    this.handleRecordError(e)
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

    sendBlob = (formData) => {

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

    getAndSendBlob = (blob, timeStamp) => {
        let arrayBufferReader = new FileReader();
        arrayBufferReader.onload = (e) => {
            console.log(e.target.result);
        }
        arrayBufferReader.readAsArrayBuffer(blob);

        let file = new File([blob], `${timeStamp}.wav`);

        resampler(file, 16000, e => {
            e.getFile(e => {
                let formData = new FormData();
                formData.append('userid', USER_ID);
                formData.append('timestamp', this.timeFormatting(timeStamp));
                formData.append('content', e);
                this.sendBlob(formData);
                /*
                * 打印base64录音编码处
                * */
                // let reader = new FileReader();
                // reader.addEventListener("load", (e) => {
                //     console.log(e.target.result);
                // });
                // reader.readAsDataURL(e);
            })
        })
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
