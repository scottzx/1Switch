import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface FrpStatus {
  installed: boolean;
  connected: boolean;
  server: string | null;
  remote_port: number | null;
  local_port: number | null;
  token: string | null;
  link: string | null;
  command: string | null;
  error: string | null;
}

export interface FrpConnectRequest {
  serial: string;
  local_port: number;
}

export interface FrpConnectResponse {
  success: boolean;
  server?: string;
  port?: number;
  remote_port?: number;
  local_port?: number;
  token?: string;
  link?: string;
  command?: string;
  message?: string;
  error?: string;
}

export interface FrpInstallResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const frpApi = {
  status: () => api.get<FrpStatus>('/frp/status'),
  serial: () => api.get<{ serial: string }>('/frp/serial'),
  connect: (data: FrpConnectRequest) => api.post<FrpConnectResponse>('/frp/connect', data),
  deployConfig: (data: FrpConnectRequest) => api.post<{ success: boolean; message?: string; error?: string }>('/frp/deploy-config', data),
  disconnect: () => api.post<{ success: boolean }>('/frp/disconnect'),
  install: () => api.post<FrpInstallResult>('/frp/install'),
};
