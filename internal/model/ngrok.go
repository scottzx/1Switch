package model

// NgrokStatus ngrok 状态
type NgrokStatus struct {
	Installed bool   `json:"installed"`
	Running   bool   `json:"running"`
	PublicURL string `json:"public_url,omitempty"`
	PID       int    `json:"pid,omitempty"`
	Error     string `json:"error,omitempty"`
}

// NgrokInstallResult ngrok 安装结果
type NgrokInstallResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
