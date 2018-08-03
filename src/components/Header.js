import { Layout, Menu} from 'antd';
import { Link } from 'dva/router'
import styles from './Header.module.less'

function Header ({selectedKeys,children}) {
    return (
        <Layout>
            <Layout.Header theme="light" className={styles.header}>
                <div className={styles.title}>语音实时翻译</div>
                <Menu
                    className={styles.menu}
                    mode="horizontal"
                    selectedKeys={selectedKeys}>
                    <Menu.Item key="1"><Link to={""}>单用户（Beta）</Link></Menu.Item>
                    <Menu.Item key="2"><Link to={"multiUser"}>多用户（正在开发）</Link></Menu.Item>
                </Menu>
            </Layout.Header>
        </Layout>
    );
}

export default Header;
