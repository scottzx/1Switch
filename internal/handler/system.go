package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/service"
)

// GetSystemInfo 获取系统信息
// @Summary 获取系统信息
// @Tags System
// @Produce json
// @Success 200 {object} model.SystemInfo
// @Router /api/system/info [get]
func GetSystemInfo(c *gin.Context) {
	info, err := service.GetSystemInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// GetDeviceIP 获取设备 IP 地址
// @Summary 获取设备 IP 地址
// @Tags System
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/system/device-ip [get]
func GetDeviceIP(c *gin.Context) {
	ip, err := service.GetDeviceIP()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ip": ip})
}
