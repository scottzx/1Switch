package model

// NetworkInterface 网络接口
type NetworkInterface struct {
	Name  string `json:"name"`
	IP    string `json:"ip"`
	MAC   string `json:"mac"`
	Type  string `json:"type"`
	State string `json:"state"`
}

// WifiNetwork WiFi 网络
type WifiNetwork struct {
	SSID      string `json:"ssid"`
	BSSID     string `json:"bssid"`
	Signal    int    `json:"signal"`
	Security  string `json:"security"`
	Frequency int    `json:"frequency"`
}

// ApStatus AP 热点状态
type ApStatus struct {
	Active bool   `json:"active"`
	SSID   string `json:"ssid,omitempty"`
	IP     string `json:"ip,omitempty"`
}

// WifiStatus WiFi 连接状态
type WifiStatus struct {
	Connected bool   `json:"connected"`
	SSID      string `json:"ssid,omitempty"`
	Signal    int    `json:"signal,omitempty"`
	IP        string `json:"ip,omitempty"`
}
