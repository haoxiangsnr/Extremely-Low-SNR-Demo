import {Layout} from 'antd';
import styles from './footer.module.less'

function Footer ({selectedKeys,children}) {
    return (
        <Layout className={styles.footerContext}>
            <Layout.Footer theme="light" className={styles.footer}>

            </Layout.Footer>
        </Layout>
    );
}

export default Footer;
