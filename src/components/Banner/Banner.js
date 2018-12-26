import { Row, Col, List} from 'antd';
import styles from './Banner.module.less'


export default function Banner ({children, header, dataSource}) {
    // const dataSource = [
    //     "1. 请使用最新版谷歌浏览器（Chrome Web Browser）或火狐浏览器（Firefox Web Browser）。",
    //     "2. 正常启动会提示 “初始化成功” 字样，若未出现提示，请检查麦克风是否正常，并使用推荐的浏览器。",
    // ];
    return (
        <Row className={styles.banner}>
            <Col span={14} offset={5}>
                <List
                    dataSource={dataSource}
                    size={"small"}
                    bordered={true}
                    header={header}
                    renderItem={item => (<List.Item> {item} </List.Item>)}
                />
            </Col>
        </Row>
    );
}
