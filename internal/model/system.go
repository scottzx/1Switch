package model

// SystemHardwareInfo 系统硬件信息
type SystemHardwareInfo struct {
	Hostname    string `json:"hostname"`
	OS          string `json:"os"`
	Kernel      string `json:"kernel"`
	Uptime      int64  `json:"uptime"`
	CPUModel    string `json:"cpu_model"`
	CPUCores    int    `json:"cpu_cores"`
	MemoryTotal uint64 `json:"memory_total"`
	MemoryUsed  uint64 `json:"memory_used"`
}

// SystemMonitorStatus 系统状态监控
type SystemMonitorStatus struct {
	Services []ServiceMonitorStatus `json:"services"`
}

// ServiceMonitorStatus 服务监控状态
type ServiceMonitorStatus struct {
	Name    string `json:"name"`
	Active  bool   `json:"active"`
	Running bool   `json:"running"`
	PID     int    `json:"pid"`
}

// SystemResourceUsage 系统资源使用情况
type SystemResourceUsage struct {
	CPUPercent    float64 `json:"cpu_percent"`
	MemoryPercent float64 `json:"memory_percent"`
	MemoryUsed    uint64  `json:"memory_used"`
	MemoryTotal   uint64  `json:"memory_total"`
	DiskPercent   float64 `json:"disk_percent"`
	DiskTotal     uint64  `json:"disk_total"`
	DiskUsed      uint64  `json:"disk_used"`
}
