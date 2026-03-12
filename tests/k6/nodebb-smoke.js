import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4567';

export default function () {
  const res = http.get(`${BASE_URL}/`, { timeout: '5s' });
  console.log(`status=${res.status}`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}