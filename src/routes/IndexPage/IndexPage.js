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
import randomNum from '../../utils/randomNum'; // 随机数
import styles from './IndexPage.module.less';
import _ from 'lodash';

const POST_URL = `https://haoxiang.tech/post`;
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
        return _.sortBy(objList, 'timeStamp');
    };

    openNotificationWithIcon = (type, mess, des) => {
        notification[type]({
            message: mess,
            description: des,
        });
    };

    writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    floatTo16BitPCM = (output, offset, input) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    };

    encodeWAV = (samples) => {
        let buffer = new ArrayBuffer(44 + samples.length * 2);
        let view = new DataView(buffer);

        /* RIFF identifier */
        this.writeString(view, 0, 'RIFF');
        /* RIFF chunk length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        this.writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        this.writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, 1, true);
        /* sample rate */
        view.setUint32(24, 16000, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, 16000 * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, 1 * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        this.writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        this.floatTo16BitPCM(view, 44, samples);

        return view;
    };

    downSample = (array) => {
        let tmp = 0;
        let arr = [];
        array.forEach((subE, subI) => {
            if (subI === 0 || subI % 3 !== 0) {
                tmp += subE;
            }
            else {
                arr.push(tmp / 3);
                tmp = 0;
            }
        });
        return arr;
    };


    getSum = (arr, i, j) => {
        // console.log(`本次求和起始和终止位置 ${i}, ${j}`);
        let sum = 0;
        i = i || 0;
        j = j || arr.length;

        if (i >= j)  return -1;
        while (i < j) {
            sum += arr[i] > 0 ? arr[i] : -arr[i];
            ++i
        }
        console.log(`求和结果如下：${sum}`);
        return sum;
    };

    findEffectiveBuffer = (originBuffer) => {
        /*
        * input: OriginBuffer:[...]
        * return: {
        *     Container: [[effectiveBuffer1], [2], ...],
        *     prevTailArray: [...]
        * */
        const JudgedEffectiveBufferStore = [];
        const residualJudgedEffectiveBuffer = [];
        const { energyThreshold, intervalThreshold }= this.props;
        let i = 0, effectiveState = false;
        let effectiveBuffer = [];

        effectiveBuffer.push([...this.RESIDUAL.judgedEffectiveBuffer]);
        let concatenatedBuffer = [...this.RESIDUAL.noJudgedBuffer, ...originBuffer];
        const concatenatedBufferLen = concatenatedBuffer.length;

        while (i + intervalThreshold < concatenatedBufferLen) {
            /*
            * 本次覆盖的范围为有效范围, 如果继续移动，范围终点就会超过concatenatedBufferLen，决策不进行下次移动
            * 设置残余了buffer，停止循环。
            * */
            // console.log("当前轮次的起始位置：", i);
            let sumOfArrayInterval = this.getSum(concatenatedBuffer, i, i + intervalThreshold);

            if (sumOfArrayInterval > energyThreshold) {
                // console.log("超过阈值");
                effectiveState = true;
                effectiveBuffer.push(...concatenatedBuffer.slice(i, i + intervalThreshold));
                i += intervalThreshold;
            }
            else {
                if (effectiveState) {
                    // console.log("没超过阈值，但是受到上一次的影响");
                    effectiveBuffer.push(...concatenatedBuffer.slice(i, i + intervalThreshold));
                    JudgedEffectiveBufferStore.push(effectiveBuffer);
                    effectiveState = false;
                    effectiveBuffer = []; // 识别一段语音结束
                    i += intervalThreshold;
                }
                ++i;
            }
        }

        if (effectiveBuffer.length !== 0) {
            /*
            * 当结尾时均为有效语音时，无法执行effectiveState=false语句，这个部分语音应当被下一段拼接。
            * */
            residualJudgedEffectiveBuffer.push(...effectiveBuffer);
        }

        return {
            judgedEffectiveBufferStore: JudgedEffectiveBufferStore,
            residual: {
                judgedEffectiveBuffer: residualJudgedEffectiveBuffer,
                noJudgedBuffer: concatenatedBuffer.slice(i)
            }
        };
    };

    transformBufferToWAV = (effectiveBuffer) => {
        let dataSample = this.setBuffer(effectiveBuffer);
        this.exportWAV(dataSample);
    };

    setBuffer = (e) => {
        let result = new Float32Array(e.length);
        result.set(e, 0);
        return result;
    };

    exportWAV = (sample) => {
        let dataview = this.encodeWAV(sample);
        let audioBlob = new Blob([dataview], {type: 'audio/wav'});

        /*
            打印base64录音编码处
        */
        let reader = new FileReader();
        reader.addEventListener("load", (e) => {
            console.log(e.target.result);
        });
        reader.readAsDataURL(audioBlob);
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
        const {dispatch} = this.props;
        dispatch({
            type: 'fetchText',
            payload: formData
        });
    };

    resampleBlobData = (blob) => {
        const file = new File(blob, `${Date.now()}.wav`);
        return new Promise((resolve) => {
            // resampler(file, 16000, e => {
            //     e.getBlob(e => {
            //         resolve(e);
            //         /*
            //             打印base64录音编码处
            //         */
            //         // let reader = new FileReader();
            //         // reader.addEventListener("load", (e) => {
            //         //     console.log(e.target.result);
            //         // });
            //         // reader.readAsDataURL(e);
            //     });
            // });
        })
    };

    componentDidMount = () => {
        this.openNotificationWithIcon("success", "资源加载成功，当浏览器提示需要使用麦克风时请点击“确定”。");
        this.chunks = [];
        this.RESIDUAL = {
            judgedEffectiveBuffer: [],
            noJudgedBuffer: []
        };
        this.buffers = [];
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
    };

    handleStart = () => {
        const mediaConstraints = {audio: true};
        this.setState({
            record: true
        });
        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(stream => {
            this.audioContext = new AudioContext();
            let input = this.audioContext.createMediaStreamSource(stream);
            this.node = this.audioContext.createScriptProcessor(this.props.bufferLen, 1, 1);
            this.node.onaudioprocess = (e) => {

                if (!this.state.record) return;
                let inputBuffers = e.inputBuffer.getChannelData(0);
                this.buffers.push(...inputBuffers);

                /*
                * 此处为分段点，每个分段点处理一次
                * */
                if (this.buffers.length >= 48 * this.props.bufferLen) {
                    this.setState({
                        record: false
                    }, () => {
                        let originBuffer = this.buffers;

                        let {judgedEffectiveBufferStore, residual} = this.findEffectiveBuffer(originBuffer);

                        judgedEffectiveBufferStore.forEach( buffer => {
                            this.transformBufferToWAV(buffer);
                        });

                        this.RESIDUAL = residual;
                        console.log("结束了", this.RESIDUAL);
                    });
                }


            };
            input.connect(this.node);
            this.node.connect(this.audioContext.destination);
        })
        .catch(e => {
            this.handleRecordError(e);
        });
    };

    handleFinish = () => {
        this.setState({
            record: false
        });
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
                                    onClick={this.handleStart}>{signalWord}翻译</Button>
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
