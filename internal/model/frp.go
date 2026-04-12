package model

// FrpStatus FRP 连接状态
type FrpStatus struct {
	Installed  bool   `json:"installed"`
	Connected  bool   `json:"connected"`
	Server     string `json:"server,omitempty"`
	RemotePort int    `json:"remote_port,omitempty"`
	LocalPort  int    `json:"local_port,omitempty"`
	Token     string `json:"token,omitempty"`
	Link      string `json:"link,omitempty"`
	Command   string `json:"command,omitempty"`
	Error     string `json:"error,omitempty"`
}

// FrpInstallResult FRP 安装结果
type FrpInstallResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// FrpConnectRequest FRP 连接请求
type FrpConnectRequest struct {
	Serial    string `json:"serial"`
	LocalPort int    `json:"local_port"`
}

// FrpConnectResponse FRP 连接响应
type FrpConnectResponse struct {
	Success    bool   `json:"success"`
	Server     string `json:"server,omitempty"`
	RemotePort int   `json:"remote_port,omitempty"`
	LocalPort  int   `json:"local_port,omitempty"`
	Token      string `json:"token,omitempty"`
	Link       string `json:"link,omitempty"`
	Command    string `json:"command,omitempty"`
	Error      string `json:"error,omitempty"`
}
