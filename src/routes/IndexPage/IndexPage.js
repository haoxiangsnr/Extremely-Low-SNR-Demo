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
import hark from 'hark'
import randomNum from '../../utils/randomNum'; // 随机数
import styles from './IndexPage.module.less';
import _ from 'lodash';
import Recorder from '../../utils/recorder';

const UPLOAD_URL = `https://upload.haoxiang.tech`;
const USER_ID = randomNum(20);

class IndexPage extends Component {

    static defaultProps = {
        bufferLen: 4096,
        energyThreshold: 100,
        intervalThreshold: 4096*5
    };

    constructor(props) {
        super(props);
        this.state = {
            record: false, // 打开或关闭录音机
            recording: false, // 是否正在录音，与recorder不同
            cyclicTrans: false, // cyclic transfer
            dataSource: [],
            buffers: [],
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
        };

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
        return _.sortBy(objList, [(o) => {return -o.timestamp}]);
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

    postToServer = (blob) => {
        const formData = new FormData();
        formData.append("user_id", USER_ID.toString());
        formData.append("timestamp", Date.now().toString());
        formData.append("origin_audio", blob);

        const options =  {
            method: 'POST',
            body: formData
        };

        fetch(UPLOAD_URL, options)
        .then(this.checkStatus)
        .then(this.parseJSON)
        .then(data => {
            const { timestamp, text } = data;
            const { dataSource } = this.state;
            let addedDataSource = dataSource.concat({
                timestamp: timestamp,
                text: text
            });
            this.setState({
                dataSource: this.sortedByTimeStamp(addedDataSource)
            });
        })
        .catch(e => this.openNotificationWithIcon("error", e.toString()));
    };

    componentDidMount = () => {
        const config = {
            encoderSampleRate: 16000,
            originalSampleRateOverride: 16000,
            resampleQuality: 10
        };

        const options = {
            audio: true
        };

        this.openNotificationWithIcon("success","加载页面成功", "即将初始化翻译功能，若浏览器询问是否开启麦克风权限，请您点击确定！");

        navigator.mediaDevices.getUserMedia(options)
            .then(stream => {
                this.openNotificationWithIcon("success", "初始化成功", "请您点击页面中开始翻译的蓝色按钮！");
                this.SPEENCH_EVENTS = hark(stream, {threshold: -50});
                this.SPEENCH_EVENTS.on('stopped_speaking', this.handleInterruption);
                this.SPEENCH_EVENTS.on('speaking', () => {
                    console.log("开始录音事件", Date.now())
                });

                this.REC = new Recorder(config);
                this.REC_STATE = {
                    RECORD: false,
                };
                this.REC.ondataavailable = this.handleDataAvailable;
            })
            .catch(e => {
                this.openNotificationWithIcon("error", `创建语音流失败:${e}`);
            });
    };

    handleInterruption = () => {
        if (this.REC_STATE.RECORD) {
            console.log("一句话结束");
            this.REC.stop();
            this.REC.start();
        }
    };

    handleDataAvailable = (arrayBuffer) => {
        const blob = new Blob([arrayBuffer], {type: "audio/wav"});
        this.postToServer(blob);
 
        // const fileReader = new FileReader();
        // fileReader.onload = (e) => {
        //     console.log(e.target.result);
        // }
        // fileReader.readAsDataURL(blob);
    };

    handleStart = () => {
        this.REC.start();
        this.REC_STATE.RECORD = true;
        this.setState({
            record: true
        });
    };

    handleFinish = () => {
        this.REC.stop();
        this.REC_STATE.RECORD = false;
        this.setState({
            record: false
        })
    };

    render() {
        let {record, dataSource, recording} = this.state;

        const cardTitle = (
            <Row>
                <Col span={12} style={{textAlign: 'left'}}>
                    语音转换结果
                </Col>
                <Col span={12} style={{textAlign: 'right'}}>
                    {recording ? <Icon type={'loading'} style={{color: '#40a9ff'}}/> : ''}
                </Col>
            </Row>
        );

        const renderListItem = (item) => {
            return (
                <List.Item key={item.timestamp} className={styles.listItem}>

                    <div className={styles.listTitle}>
                        {this.timeConverter(item.timestamp)}
                    </div>

                    <div className={styles.listText} tabIndex={"0"}>
                        {item.text} &nbsp;
                        <CopyToClipboard text={item.text}>
                            <Popover trigger="click" title="已复制" content={`${item.text}`}>
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
                                    onClick={this.handleStart} disabled={record}>开始翻译</Button>
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
function mapStatetoProps(state) {
    return {dataSource: state.fetchText};
}

export default connect(mapStatetoProps)(IndexPage);
