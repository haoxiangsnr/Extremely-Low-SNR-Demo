import request from '../utils/request';

export function queryText(timeStamp, USER_ID) {
  return request('/get', {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      },
      body: {
          userid: USER_ID,
          timestamp: timeStamp
      }
  });
}
