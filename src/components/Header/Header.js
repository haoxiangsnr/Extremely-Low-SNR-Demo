import {Layout, Icon, Menu} from 'antd';
import {Link} from 'dva/router'
import styles from './Header.module.less'

function Header({selectedKeys, children}) {
    return (
        <Layout>
            <Layout.Header theme="light" className={styles.header}>
                <div className={styles.title}><Icon type="api"/>Speech Process</div>
                <Menu
                    className={styles.menu}
                    mode="horizontal"
                    selectedKeys={selectedKeys}>
                    {/* <Menu.Item key="1"><Link to={""}>ASR online (Mandarin)</Link></Menu.Item> */}
                    <Menu.Item key="2"><Link to={"speechEnhancement"}>Speech Enhancement</Link></Menu.Item>
                </Menu>
            </Layout.Header>
        </Layout>
    );
}

export default Header;