import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prompts
export const prompts = {
  getAll: () => api.get('/prompts'),
  getActive: () => api.get('/prompts/active'),
  getById: (id) => api.get(`/prompts/${id}`),
  create: (data) => api.post('/prompts', data),
  update: (id, data) => api.put(`/prompts/${id}`, data),
  activate: (id) => api.post(`/prompts/${id}/activate`),
  delete: (id) => api.delete(`/prompts/${id}`),
  compare: (id1, id2) => api.get(`/prompts/compare/${id1}/${id2}`),
  generate: () => api.post('/prompts/generate'),
  autoImprove: (data) => api.post('/prompts/auto-improve', data),
};

// Test Cases
export const testCases = {
  getAll: () => api.get('/test-cases'),
  getById: (id) => api.get(`/test-cases/${id}`),
  create: (data) => api.post('/test-cases', data),
  update: (id, data) => api.put(`/test-cases/${id}`, data),
  delete: (id) => api.delete(`/test-cases/${id}`),
  getResults: (id) => api.get(`/test-cases/${id}/results`),
  bulkImport: (testCases) => api.post('/test-cases/bulk', { testCases }),
};

// Knowledge Base
export const knowledgeBase = {
  getAll: () => api.get('/knowledge-base'),
  getByCategory: (category) => api.get(`/knowledge-base/category/${category}`),
  upsert: (data) => api.post('/knowledge-base', data),
  bulkUpsert: (entries) => api.post('/knowledge-base/bulk', { entries }),
  delete: (id) => api.delete(`/knowledge-base/${id}`),
  deleteCategory: (category) => api.delete(`/knowledge-base/category/${category}`),
  getWizardProgress: () => api.get('/knowledge-base/wizard/progress'),
  updateWizardProgress: (data) => api.post('/knowledge-base/wizard/progress', data),
};

// Generator
export const generator = {
  run: (data) => api.post('/generator/run', data),
  quickTest: (data) => api.post('/generator/quick-test', data),
  runSuite: (promptVersionId) => api.post('/generator/run-suite', { promptVersionId }),
};

// Evaluator
export const evaluator = {
  getRules: () => api.get('/evaluator/rules'),
  createRule: (data) => api.post('/evaluator/rules', data),
  updateRule: (id, data) => api.put(`/evaluator/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/evaluator/rules/${id}`),
  evaluate: (data) => api.post('/evaluator/evaluate', data),
  getResults: () => api.get('/evaluator/results'),
  getSummary: (promptVersionId) => api.get(`/evaluator/summary/${promptVersionId}`),
  compare: (id1, id2) => api.get(`/evaluator/compare/${id1}/${id2}`),
};

// Health
export const health = {
  check: () => api.get('/health'),
};

export default api;
