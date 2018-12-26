import React from 'react';
import { Router, Route, Switch } from 'dva/router';
import IndexPage from './routes/IndexPage/IndexPage';
import speechEnhancement from './routes/SpeechEnhancement/SpeechEnhancement';

function RouterConfig({ history }) {
  return (
    <Router history={history}>
      <Switch>
          {/* <Route path="/speechEnhancement" exact component={speechEnhancement} /> */}
          <Route path="/" exact component={speechEnhancement} />
      </Switch>
    </Router>
  );
}

export default RouterConfig;
