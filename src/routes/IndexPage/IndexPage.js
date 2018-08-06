import {connect} from 'dva';
import React, {Component} from 'react';
import {Button, Card, Col, Affix, Icon, Layout, notification, Row} from 'antd'
import Footer from '../../components/Footer/Footer'
import Header from '../../components/Header/Header'
import Banner from '../../components/Banner/Banner'
import Recorder from 'recorder-js'
import fetch from 'dva/fetch'
import randomNum from '../../utils/randomNum'
import styles from './IndexPage.module.less'
import _ from 'lodash'
import utf8 from 'utf8'
/*CONST*/
const POST_URL = `http://183.175.14.88:8080/post`;
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
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
            this.audio_context = new AudioContext();
            this.openNotificationWithIcon("success", "初始化成功！");
        }
        catch (e) {
            this.openNotificationWithIcon("error", "换最新版浏览器了吗？你的浏览器弱爆了，我无法挽救！")
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

    handleRecord = () => {
        let { record, recording } = this.state;

        if (record && recording) {
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

            this.setTimer = () => {
                this.setState({
                    cyclicTrans: true
                }, () => {
                    this.recorder.start()
                        .then( () => {
                            this.timer = setTimeout(this.cyclicTransform, 2000);
                        });
                });
            };

            this.cyclicTransform = () => {
                if (this.state.cyclicTrans) {
                    this.setState({
                        cyclicTrans: false
                    });
                    console.log(1);
                    clearTimeout(this.timer);
                    this.stopRecording(Date.now())
                        .then(() => {
                            this.setTimer();
                        })
                }
                else {
                    this.setTimer();
                }
            };
            this.cyclicTransform();
        }
    };

    stopRecording = (timeStamp) => {
        let pro = new Promise((resolve, reject) => {
            clearTimeout(this.timer);
            this.recorder.stop()
                .then(({blob}) => {
                    console.log("停止了，现在是:", Date.now());
                    resolve();
                    console.log(blob);
                    this.getAndSendBlobOfBase64(blob, timeStamp);
                });
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
                this.setState({
                   dataSource: this.sortedByTimeStamp(dataSource.concat({
                       timeStamp: data.timestamp,
                       text: decodeURIComponent(escape(data.content))
                   }))
                });
            })
            .catch( err => ({ err }));
        });
        reader.readAsDataURL(blob);
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

                <Affix>
                    <Layout.Header className={styles.controlBar}>
                        <Row>
                            <Col span={8} style={{textAlign: 'right'}}>
                                <Button type='primary' onClick={this.handleRecord}>{signalWord}翻译</Button>
                            </Col>
                            <Col style={{ textAlign: "center", fontSize: 20}} span={8}>
                                { recording ? <Icon type={"loading"} /> : ''}
                            </Col>
                            <Col span={8} style={{ textAlign: 'left'}}>
                                <Button type="primary" onClick={this.handleFinish} disabled={!record}>结束翻译</Button>
                            </Col>
                        </Row>
                    </Layout.Header>
                </Affix>

                <Banner />

                <Layout className={styles.content}>
                    <Row>
                        <Col span={14} offset={5}>
                            <Card title={'语音转换结果'}>
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
                <Footer />
           </div>);
    }
}

IndexPage.propTypes = {
};

export default connect()(IndexPage);
