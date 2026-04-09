// Types from admin-ui for system monitoring and network management

// System types (from admin-ui Dashboard)
export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime: number;
  cpu_model: string;
  cpu_cores: number;
  memory_total: number;
  memory_used: number;
}

export interface ServiceStatusDetail {
  name: string;
  active: boolean;
  running: boolean;
  pid?: number;
}

export interface SystemStatus {
  services: ServiceStatusDetail[];
}

export interface SystemUsage {
  cpu_percent: number;
  memory_percent: number;
  memory_used: number;
  memory_total: number;
  disk_percent: number;
  disk_total: number;
  disk_used: number;
}

// Network types (from admin-ui WifiConfig)
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

export interface ApStatus {
  active: boolean;
  ssid?: string;
  ip?: string;
}
