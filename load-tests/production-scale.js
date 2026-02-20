import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp to 20 users
    { duration: '1m', target: 20 },  // Stay at 20
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api';

export default function () {
  const payload = JSON.stringify({
    prompt: 'A viral video about automated scalable video generation',
    contentType: 'video',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Health Check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'status was 200': (r) => r.status === 200 });

  // 2. Metrics Endpoint Check (simulating monitoring scraping)
  const metricsRes = http.get(`${BASE_URL}/monitoring/metrics`);
  // Note: Metrics endpoint might need to be exposed or auth protected
  
  sleep(1);
}
