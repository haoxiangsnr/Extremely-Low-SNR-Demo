import {connect} from 'dva';
import React, {Component} from 'react';
import {
    Button,
    Card,
    Col,
    Icon,
    Layout,
    List,
    notification,
    Popover,
    Row,
} from 'antd';
import Header from '../../components/Header/Header';
import Banner from '../../components/Banner/Banner';
import {CopyToClipboard} from 'react-copy-to-clipboard';
import fetch from 'dva/fetch';
import MediaStreamRecorder from 'msr'; // mediaRecord shim
import hark from 'hark';    // VAD检测
import randomNum from '../../utils/randomNum'; // 随机数
import styles from './IndexPage.module.less';
import _ from 'lodash';
import resampler from 'audio-resampler'; // 降采样

const POST_URL = `https://haoxiang.tech/post`;
const USER_ID = randomNum(20);

class IndexPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            record: false, // 打开或关闭录音机
            recording: false, // 是否正在录音，与recorder不同
            cyclicTrans: false, // cyclic transfer
            dataSource: [],
        };
    }

    timeConverter = (timeStamp) => {
        const a = new Date(Number(timeStamp));
        const month = a.getMonth();
        const date = a.getDate();
        const hour = a.getHours();
        const min = a.getMinutes();
        const sec = a.getSeconds();

        const addZero = (i) => {
           if (i < 10) {
               return `0${i}`
           }
           return i;
        }

        return `${month}月${date}日 ${addZero(hour)}:${addZero(min)}:${addZero(sec)}`;
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

    openNotificationWithIcon = (type, mess, des) => {
        notification[type]({
            message: mess,
            description: des,
        });
    };

    handleRecordError = (e) => {
        let msg;
        switch (e.code || e.name) {
            case "PermissionDeniedError":
            case "PERMISSION_DENIED":
            case "NotAllowedError":
                msg = "您拒绝访问麦克风";
                break;
            case "NOT_SUPPORTED_ERROR":
            case "NotSupportedError":
                msg = "浏览器不支持麦克风";
                break;
            case "MANDATORY_UNSATISFIED_ERROR":
            case "MandatoryUnsatisfiedError":
                msg = "找不到麦克风设备";
                break;
            default:
                msg = "无法打开麦克风，异常信息:" + (e.code || e.name);
                break;
        }
        this.openNotificationWithIcon("error", msg);
    };

    postToServer = (formData) => {
        console.log(`上交前的数据：${formData}`);
        fetch(POST_URL, {
            method: 'POST',
            body: formData,
        })
        .then(this.checkStatus)
        .then(this.parseJSON)
        .then(data => {
            const {dataSource} = this.state;
            this.setState({
                dataSource: this.sortedByTimeStamp(dataSource.concat({
                    timeStamp: data.timestamp,
                    text: data.content,
                })),
            });
        })
        .catch(err => {
            console.log(err);
        });
    };

    resampleBlobData = (blob) => {
        const file = new File(blob, `${Date.now()}.wav`);
        return new Promise((resolve) => {
            resampler(file, 16000, e => {
                e.getBlob(e => {
                    resolve(e);
                    /*
                        打印base64录音编码处
                    */
                    // let reader = new FileReader();
                    // reader.addEventListener("load", (e) => {
                    //     console.log(e.target.result);
                    // });
                    // reader.readAsDataURL(e);
                });
            });
        })
    };

    componentDidMount = () => {
        this.openNotificationWithIcon("success", "资源加载成功，当浏览器提示需要使用麦克风时请点击“确定”。");
        this.chunks = [];
    };

    handleStoppedSpeaking = () => {
        this.setState({
            recording: false
        }, () => {
            console.info("停止讲话，准备收集数据");
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
        });
    };

    handleSpeaking = () => {
        console.info("开始讲话，开始存储数据");
        if (this.mediaRecorder) {
            this.mediaRecorder.start(5000);
        }
        this.setState({
            recording: true
        });
    };

    handleDataAvailable = (blob) => {
        console.log(`这里是blob对象 ${blob}`);
        if (this.state.recording) {
            this.chunks.push(blob);
        }
        else {
            this.chunks.push(blob);
            let formData = new FormData();
            formData.append('userid', USER_ID);
            formData.append('timestamp', Date.now().toString());

            let chunks = this.chunks;
            this.chunks = [];
            this.resampleBlobData(chunks)
            .then(newBlob => {
                formData.append('content', newBlob);
                this.postToServer(formData);
            })
            .catch(e => {
                this.openNotificationWithIcon("error", "降采样失败", e.toString());
            })
        }
    };

    handleRecord = () => {
        const mediaConstraints = {audio: true};

        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
            this.setState({
                record: true
            });
            this.speechEvents = hark(stream, {
                setInterval: 10
            });
            this.mediaRecorder = new MediaStreamRecorder(stream);
            this.mediaRecorder.mimeType = "audio/wav";
            this.mediaRecorder.audioChannels = 1;
            this.mediaRecorder.ondataavailable = this.handleDataAvailable;
            this.speechEvents.on('speaking', this.handleSpeaking);
            this.speechEvents.on('stopped_speaking', this.handleStoppedSpeaking);
        })
        .catch(e => {
            this.handleRecordError(e.data);
        });
    };

    handleFinish = () => {
        this.setState({
            recording: false,
            record: false
        });
        console.log("点击了结束，查验数据");
        console.log("speech", this.speechEvents);
        console.log("mediaRecorder", this.mediaRecorder);
        this.mediaRecorder.stop();
        this.speechEvents.stop();
    };

    render() {
        let {record, dataSource, recording} = this.state;
        let signalWord;

        if (record && recording) {
            signalWord = `暂停`;
        }
        else if (record && !recording) {
            signalWord = `继续`;
        }
        else {
            signalWord = `开始`;
        }

        const cardTitle = (
            <Row>
                <Col span={12} style={{textAlign: 'left'}}>
                    语音转换结果
                </Col>
                <Col span={12} style={{textAlign: 'right'}}>
                    {recording ?
                        <Icon type={'loading'}
                              style={{color: '#40a9ff'}}/> :
                        ''}
                </Col>
            </Row>
        );

        const renderListItem = (item) => {
            return (
                <List.Item key={item.timeStamp} className={styles.listItem}>
                    <div className={styles.listTitle}>{this.timeConverter(item.timeStamp)}</div>
                    <div className={styles.listText}>
                        {item.text} &nbsp;
                        <CopyToClipboard text={item.text}>
                            <Popover trigger="click" title="已复制">
                                <Icon type="copy" style={{color: '#40a9ff'}} />
                            </Popover>
                        </CopyToClipboard>
                    </div>
                </List.Item>
            );
        };

        return (
            <div className="App">
                <Header selectedKeys={['1']}/>

                <Layout.Header className={styles.controlBar}>
                    <Row>
                        <Col span={8} style={{textAlign: 'right'}}>
                            <Button type='primary'
                                    onClick={this.handleRecord}>{signalWord}翻译</Button>
                        </Col>
                        <Col offset={8} span={8} style={{textAlign: 'left'}}>
                            <Button type="primary" onClick={this.handleFinish}
                                    disabled={!record}>结束翻译</Button>
                        </Col>
                    </Row>
                </Layout.Header>

                <Banner/>

                <Layout className={styles.content}>
                    <Row>
                        <Col span={14} offset={5}>
                            <Card title={cardTitle} bodyStyle={{overflowY: 'scroll', height: 400}}>
                                <List
                                    dataSource={dataSource}
                                    renderItem={renderListItem}
                                    className={styles.texts}
                                    locale={{emptyText: "暂无翻译结果"}}
                                />
                            </Card>
                        </Col>
                    </Row>
                </Layout>
            </div>);
    }
}

IndexPage.propTypes = {};

export default connect()(IndexPage);
