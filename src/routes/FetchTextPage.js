import { Layout, Menu, List} from 'antd';
import styles from './FetchTextPage.module.less'
import React, {Component} from 'react'
import request from '../utils/request'
const GET_TEXT_URL = `http://183.175.14.88:8080/get`;

export default class FetchTextPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            search: false
        }
    }
    // componentDidUpdate = () => {
    //     const {record, USERID} = this.props;
    //     if (record) {
    //         request(GET_TEXT_URL, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json'
    //             },
    //             body: {
    //                 'userid': USERID
    //             }
    //         })
    //     }
    //

    // componentDidUpdate = () => {
    //     const {dispatch, record, USER_ID} = this.props;
    //     dispatch({
    //         type: 'timeStamp/search'
    //     });
    //     // if (record)
    // }

    render () {
        const { data } = this.state;
        const { USERID } = this.props;
        return (
            <List
                dataSource={data}
                header={(<div>语音转换结果</div>)}
                bordered={true}
                size={"small"}
                locale={{emptyText: '暂无结果显示'}}
                renderItem={ ({timeStamp, content}) => {
                    return (
                        <List.Item>{content}</List.Item>
                    );
                }}
            />
        );
    }
}
