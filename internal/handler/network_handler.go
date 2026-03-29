package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// NetworkHandler 网络处理器
type NetworkHandler struct {
	svc *service.NetworkService
}

// NewNetworkHandler 创建网络处理器
func NewNetworkHandler(svc *service.NetworkService) *NetworkHandler {
	return &NetworkHandler{svc: svc}
}

// GetInterfaces 获取网络接口列表
// @Summary 获取网络接口列表
// @Tags Network
// @Produce json
// @Success 200 {array} model.NetworkInterface
// @Router /api/network/interfaces [get]
func (h *NetworkHandler) GetInterfaces(c *gin.Context) {
	interfaces, err := h.svc.GetInterfaces(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, interfaces)
}

// ScanWifi 扫描 WiFi 网络
// @Summary 扫描 WiFi 网络
// @Tags Network
// @Produce json
// @Success 200 {array} model.WifiNetwork
// @Router /api/network/wifi/scan [get]
func (h *NetworkHandler) ScanWifi(c *gin.Context) {
	networks, err := h.svc.ScanWifi(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, networks)
}

// ConnectWifi 连接 WiFi
// @Summary 连接 WiFi
// @Tags Network
// @Accept json
// @Produce json
// @Param request body model.WifiConnectRequest true "WiFi 连接请求"
// @Success 200 {string} string
// @Router /api/network/wifi/connect [post]
func (h *NetworkHandler) ConnectWifi(c *gin.Context) {
	var req model.WifiConnectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.svc.ConnectWifi(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Connected to " + req.SSID})
}

// GetWifiStatus 获取 WiFi 连接状态
// @Summary 获取 WiFi 连接状态
// @Tags Network
// @Produce json
// @Success 200 {object} model.WifiStatus
// @Router /api/network/wifi/status [get]
func (h *NetworkHandler) GetWifiStatus(c *gin.Context) {
	status, err := h.svc.GetWifiStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// GetApStatus 获取 AP 热点状态
// @Summary 获取 AP 热点状态
// @Tags Network
// @Produce json
// @Success 200 {object} model.ApStatus
// @Router /api/network/ap [get]
func (h *NetworkHandler) GetApStatus(c *gin.Context) {
	status, err := h.svc.GetApStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// StartAp 启动 AP 热点
// @Summary 启动 AP 热点
// @Tags Network
// @Produce json
// @Success 200 {string} string
// @Router /api/network/ap/start [post]
func (h *NetworkHandler) StartAp(c *gin.Context) {
	err := h.svc.StartAp(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "AP started"})
}

// StopAp 停止 AP 热点
// @Summary 停止 AP 热点
// @Tags Network
// @Produce json
// @Success 200 {string} string
// @Router /api/network/ap/stop [post]
func (h *NetworkHandler) StopAp(c *gin.Context) {
	err := h.svc.StopAp(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "AP stopped"})
}
