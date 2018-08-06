import React from 'react';
import { Router, Route, Switch } from 'dva/router';
import IndexPage from './routes/IndexPage/IndexPage';
import MultiUser from './routes/MultiUser/MultiUser';

function RouterConfig({ history }) {
  return (
    <Router history={history}>
      <Switch>
          <Route path="/multiUser" exact component={MultiUser} />
          <Route path="/" exact component={IndexPage} />
      </Switch>
    </Router>
  );
}

export default RouterConfig;
