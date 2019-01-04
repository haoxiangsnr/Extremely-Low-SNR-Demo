import React from "react";
import Header from "../../components/Header/Header"
import { Layout, Button, Upload, Icon, message, Row, Col, notification } from "antd"
import styles from './SpeechEnhancement.module.less';
import Banner from "../../components/Banner/Banner";
import reqwest from 'reqwest';


const SPEECH_ENHANCEMENT_URL = "http://202.207.12.159:5000";

class SpeechEnhancement extends React.Component {
    state = {
        file: {},
        uploading: false,
        downloadURL: ""
    };

    openNotificationWithIcon = (type, mess, des) => {
        notification[type]({
            message: mess,
            description: des,
        });
    };

    handleChange = (info) => {
        if (info.file.size <= 2000000) {
            if (info.file.name.slice(-3) === "wav") {
                this.setState({
                    file: info.file
                });
            }
            else {
                this.openNotificationWithIcon("error", "Wrong file format", "The uploaded file should be in wav format. Please try again.")
            }
        }
        else {
            this.openNotificationWithIcon("error", "File size exceeds limit", "Uploaded files should be less than 2M, please try again.")
        }

    };

    handleUpload = () => {
        const { file } = this.state;
        const formData = new FormData();

        formData.append('noisy_speech', file);

        this.setState({
            uploading: true,
        });

        reqwest({
            url: SPEECH_ENHANCEMENT_URL + "/" + "enhancement",
            method: "post",
            processData: false,
            data: formData,
            success: (resp) => {
                this.setState({
                    file: {},
                    uploading: false,
                    downloadURL: SPEECH_ENHANCEMENT_URL + "/" + resp.deno_wav
                });
                message.success('upload successfully.');
            },
            error: () => {
                this.setState({
                    uploading: false,
                });
                message.error('upload failed.');
            }
        });
    }

    render() {
        const { uploading, file, downloadURL } = this.state;
        let fileList = [];
        let downloadElement = null;
        if (Object.keys(file).length !== 0) {
            fileList = [file]
        }
        else {
            fileList = [];
        }

        if (downloadURL) {
            downloadElement = (
                <Button style={{ marginTop: 16 }}>
                    <Icon type="upload" />
                    <a href={downloadURL} target="blank"> Download enhanced speech</a>
                </Button>
            );
        }

        const props = {
            fileList: fileList,
            onChange: this.handleChange,
            beforeUpload: () => {
                return false;
            },
            onRemove: () => {
                this.setState((state) => {
                    this.setState({
                        file: {}
                    });
                });
            },
        };

        const BannerDataSource = [
            (<div>1. The size of the uploaded file is 2MB or less, and the format is required to be wav format. The recommended sampling rate is 44100Hz. According to <a href="https://github.com/haoxiangsnr/low_snr_demo/blob/demo/README.md#model-characteristics">the characteristics of the model</a>, the recommended SNR of the noisy speech is -5~-15dB.</div>),
            (<div>2. You can use <a href="https://github.com/mpariente/pystoi">STOI</a> (Short-Time Objective Intelligibility) and <a href="https://www.itu.int/rec/T-REC-P.862">PESQ</a> (Perceptual evaluation of speech quality) as measures to evaluate the quality and intelligibility of the enhanced speech separately.</div>),
            (<div>3. Please use the latest version of modern browsers, such as the latest version of <a href="https://www.google.com/chrome/">Google Chrome</a> and <a href="https://www.mozilla.org/en-US/firefox/new/">Firefox</a>.</div>)
        ];
        

        return (
            <div>
                <Header selectedKeys={["2"]} />
                <Layout.Header className={styles.header}/>
                <Banner header={"Notification"} className={styles.banner} dataSource={BannerDataSource} />
                <Layout className={styles.content}>
                    <Row>
                        <Col span={14} offset={5}>
                            <Upload {...props}>
                                <Button><Icon type="upload" />Select noisy speech</Button>
                            </Upload>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={14} offset={5}>
                            <Button
                                type="primary"
                                onClick={this.handleUpload}
                                disabled={fileList.length === 0}
                                loading={uploading}
                                style={{ marginTop: 16 }}>
                                {uploading ? 'Waiting' : 'Start Enhancement'}
                            </Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={14} offset={5}>
                            {downloadElement}
                        </Col>
                    </Row>
                </Layout>
            </div>
        );
    }

}


export default SpeechEnhancement;
