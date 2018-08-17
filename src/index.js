import dva from 'dva';
// 1. Initialize
const app = dva({
    initialState: {}
});
// 2. Plgins
// app.use({});

// 3. Model
app.model(require('./models/fetchText').default);
// 4. Router
app.router(require('./router').default);

// 5. Start
app.start('#root');
