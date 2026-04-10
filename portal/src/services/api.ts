const BASE_URL = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  type: string;
  state: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  signal: number;
  security: string;
  frequency: number;
}

export interface WifiStatus {
  connected: boolean;
  ssid?: string;
  signal?: number;
  ip?: string;
}

export const networkApi = {
  interfaces: async (): Promise<NetworkInterface[]> => {
    return request<NetworkInterface[]>('/api/network/interfaces');
  },
  wifiScan: async (): Promise<WifiNetwork[]> => {
    return request<WifiNetwork[]>('/api/network/wifi/scan');
  },
  wifiConnect: async (ssid: string, password?: string): Promise<void> => {
    await request('/api/network/wifi/connect', {
      method: 'POST',
      body: JSON.stringify({ ssid, password }),
    });
  },
  wifiStatus: async (): Promise<WifiStatus> => {
    return request<WifiStatus>('/api/network/wifi/status');
  },
};

export const systemApi = {
  getDeviceIp: async (): Promise<string> => {
    const data = await request<{ ip: string }>('/api/system/device-ip');
    return data.ip;
  },
};
