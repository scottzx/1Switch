import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface NgrokStatus {
  installed: boolean;
  running: boolean;
  public_url: string | null;
  error: string | null;
}

export interface NgrokInstallResult {
  success: boolean;
  message: string;
}

export const ngrokApi = {
  check: () => api.get<NgrokStatus>('/ngrok/check'),
  start: () => api.post<NgrokStatus>('/ngrok/start'),
  stop: () => api.post<NgrokStatus>('/ngrok/stop'),
  install: () => api.post<NgrokInstallResult>('/ngrok/install'),
};
