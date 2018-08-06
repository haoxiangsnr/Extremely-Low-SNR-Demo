import {List} from 'antd';
import React, {Component} from 'react'

export default class FetchTextPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            search: false
        }
    }

    render () {
        const { data } = this.state;
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
