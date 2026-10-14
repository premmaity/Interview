import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    interview_turns: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
    checks: ['rate>0.99'],
  },
};

const base = __ENV.BASE_URL || 'http://localhost:8000';

function csrf(jar) {
  const cookies = jar.cookiesForURL(base);
  return decodeURIComponent(cookies.im_csrf?.[0] || '');
}

export default function () {
  const jar = http.cookieJar();
  const identity = `${__VU}-${__ITER}-${Date.now()}`;
  const email = `load-${identity}@example.invalid`;
  const password = 'Load-Test-Password-42';
  http.post(`${base}/api/v1/auth/register`, JSON.stringify({ email, username: `u${identity}`, password }), { headers: { 'Content-Type': 'application/json' } });
  const login = http.post(`${base}/api/v1/auth/login`, JSON.stringify({ email, password }), { headers: { 'Content-Type': 'application/json' }, jar });
  check(login, { 'login succeeds': (response) => response.status === 200 });
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf(jar) };
  const created = http.post(`${base}/api/v1/interviews`, JSON.stringify({ target_role: 'Backend engineer', seniority: 'senior', round_type: 'technical', difficulty: 'medium', question_count: 2, input_mode: 'text' }), { headers, jar });
  check(created, { 'session created': (response) => response.status === 201 });
  if (created.status !== 201) return;
  const session = created.json();
  const started = http.post(`${base}/api/v1/interviews/${session.id}/start`, null, { headers, jar });
  check(started, { 'session started': (response) => response.status === 200 });
  const active = started.json();
  const requestId = `${identity}-answer`;
  const body = JSON.stringify({ question_id: active.current_question.id, client_request_id: requestId, text: 'I use an idempotency key, a unique constraint, a transaction, and response replay.', source_mode: 'text' });
  const answer = http.post(`${base}/api/v1/interviews/${session.id}/answers`, body, { headers, jar });
  const duplicate = http.post(`${base}/api/v1/interviews/${session.id}/answers`, body, { headers, jar });
  check(answer, { 'answer accepted': (response) => response.status === 200 });
  check(duplicate, { 'duplicate safely replayed': (response) => response.status === 200 && response.json().answers.length === 1 });
  check(http.get(`${base}/api/v1/interviews?limit=20`, { jar }), { 'history paginated': (response) => response.status === 200 });
  sleep(0.2);
}
