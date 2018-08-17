import {queryText} from "../services/text";
import _ from "lodash";
import request from "../utils/request"

function fetchPost (formData) {
    const POST_URL = `https://haoxiang.tech/post`;
    const option = {
        method: "post",
        body: formData
    };
    return request(POST_URL, option);
}

export default {
    namespace: "timeStamp",
    state: [],
    reducers: {
        'add'(state, {payload: {timeStamp, text}}) {
            return state.concat({
                timestamp: timeStamp,
                text: text
            });
        },
    },
    effects: {
        *fetchText({payload: formData}, {call, put}) {
            const result = yield call(fetchPost, formData);
            yield put({
                type: 'add', payload: {
                    timeStamp: result.timestamp,
                    text: result.content
                }
            });
        }
    }
}
