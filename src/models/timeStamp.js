import {queryText} from "../services/text";
import _ from "lodash";

export default {
    namespace: "timeStamp",
    state: [],
    reducers: {
        'add'(state, action) {
            return state.concat({
                timestamp: action.payload.timeStamp,
                userId: action.payload.userId,
                text: ''
            });
        },
        'addText'(state, action) {
            const index = _.findIndex(state, ['timeStamp', action.payload.timeStamp]);
            return state[index].text = action.payload.text;
        }
    },
    effects: {
        *fetch_text(action, {call, put}) {
            const {timeStamp, userId} = action.payload;
            const data = call(queryText(timeStamp, userId));
            put({
                type: 'addText', payload: {
                    timeStamp: timeStamp,
                    text: data
                }
            });
        }
    }
}
