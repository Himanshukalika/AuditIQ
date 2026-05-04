import axios from 'axios'

// ── Axios instance ────────────────────────────────────────
// Python FastAPI backend localhost:8080 pe chal raha hai
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — auth token attach karo ──────────
api.interceptors.request.use(
  config => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auditiq_token')
      : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// ── Response interceptor — errors handle karo ────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired — logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auditiq_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── API functions ─────────────────────────────────────────

// Clients
export const clientsApi = {
  list:   (search?: string) => api.get('/clients', { params: { search } }),
  get:    (id: string)      => api.get(`/clients/${id}`),
  create: (data: unknown)       => api.post('/clients', data),
  update: (id: string, data: unknown) => api.put(`/clients/${id}`, data),
  delete: (id: string)      => api.delete(`/clients/${id}`),
}

// Tally
export const tallyApi = {
  testConnection: ()             => api.get('/tally/test-connection'),
  sync:           (clientId: string) => api.post(`/tally/sync/${clientId}`),
  entries:        (clientId: string, params?: Record<string, unknown>) =>
    api.get(`/tally/entries/${clientId}`, { params }),
}

// Bank
export const bankApi = {
  upload:  (clientId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/bank/upload/${clientId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  entries: (clientId: string) => api.get(`/bank/entries/${clientId}`),
}

// Reconciliation
export const reconApi = {
  start:   (clientId: string) => api.post(`/recon/start/${clientId}`),
  results: (clientId: string, params?: Record<string, unknown>) =>
    api.get(`/recon/results/${clientId}`, { params }),
  summary: (clientId: string) => api.get(`/recon/summary/${clientId}`),
  review:  (reconId: string, data: unknown) =>
    api.put(`/recon/review/${reconId}`, data),
}

// AI Observations
export const aiApi = {
  analyze:      (clientId: string) => api.post(`/ai/analyze/${clientId}`),
  observations: (clientId: string) => api.get(`/ai/observations/${clientId}`),
  review:       (obsId: string, data: unknown) =>
    api.put(`/ai/observations/${obsId}/review`, data),
}

// Reports
export const reportsApi = {
  generate: (clientId: string) => api.post(`/reports/generate/${clientId}`),
  download: (reportId: string, format: 'pdf' | 'excel') =>
    api.get(`/reports/download/${reportId}`, {
      params: { format },
      responseType: 'blob',
    }),
}