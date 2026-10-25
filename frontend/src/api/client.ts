import axios from 'axios';
import type {
  User,
  Application,
  DocumentItem,
  ValidationReport,
  DashboardStats,
  RiskDistributionItem,
  AlertItem,
  ActivityItem,
  ComplianceRule,
  ComplianceEvaluation,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor for JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aicte_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login-json', credentials);
    return res.data;
  },
  register: async (userData: any) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const applicationsApi = {
  list: async (params?: { status?: string; category?: string; search?: string }): Promise<Application[]> => {
    const res = await api.get('/applications', { params });
    return res.data;
  },
  get: async (id: string): Promise<Application> => {
    const res = await api.get(`/applications/${id}`);
    return res.data;
  },
  create: async (data: { category: string; academic_year: string; institution_name?: string }): Promise<Application> => {
    const res = await api.post('/applications', data);
    return res.data;
  },
  updateStatus: async (id: string, status: string, verdict_notes?: string): Promise<Application> => {
    const res = await api.patch(`/applications/${id}/status`, { status, verdict_notes });
    return res.data;
  },
};

export const documentsApi = {
  upload: async (formData: FormData): Promise<DocumentItem> => {
    const res = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  get: async (id: string): Promise<DocumentItem> => {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },
  getExtractedData: async (id: string) => {
    const res = await api.get(`/documents/${id}/extracted-data`);
    return res.data;
  },
};

export const validationApi = {
  trigger: async (appId: string) => {
    const res = await api.post(`/validation/trigger/${appId}`);
    return res.data;
  },
  getReport: async (appId: string): Promise<ValidationReport> => {
    const res = await api.get(`/validation/report/${appId}`);
    return res.data;
  },
};

export const verificationApi = {
  trigger: async (docId: string, authority?: string) => {
    const res = await api.post(`/verification/trigger/${docId}`, null, {
      params: { authority },
    });
    return res.data;
  },
  getStatus: async (docId: string) => {
    const res = await api.get(`/verification/status/${docId}`);
    return res.data;
  },
};

export const infrastructureApi = {
  analyze: async (formData: FormData) => {
    const res = await api.post('/infrastructure/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const complianceApi = {
  getRules: async (): Promise<ComplianceRule[]> => {
    const res = await api.get('/compliance/rules');
    return res.data;
  },
  check: async (appId: string): Promise<ComplianceEvaluation> => {
    const res = await api.get(`/compliance/check/${appId}`);
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
  getRiskDistribution: async (): Promise<RiskDistributionItem[]> => {
    const res = await api.get('/dashboard/risk-distribution');
    return res.data;
  },
  getAlerts: async (): Promise<AlertItem[]> => {
    const res = await api.get('/dashboard/alerts');
    return res.data;
  },
  getRecentActivity: async (): Promise<ActivityItem[]> => {
    const res = await api.get('/dashboard/recent-activity');
    return res.data;
  },
};

export const auditApi = {
  getAppLogs: async (appId: string) => {
    const res = await api.get(`/audit/${appId}`);
    return res.data;
  },
  getSystemLogs: async () => {
    const res = await api.get('/audit/system/recent');
    return res.data;
  },
};

export default api;
