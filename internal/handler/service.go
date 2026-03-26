package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/service"
)

// GetServiceStatus 获取服务状态
// @Summary 获取服务状态
// @Tags Service
// @Produce json
// @Success 200 {object} model.ServiceStatus
// @Router /api/service/status [get]
func GetServiceStatus(c *gin.Context) {
	status, err := service.GetServiceStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// StartService 启动服务
// @Summary 启动服务
// @Tags Service
// @Produce json
// @Success 200 {string} string
// @Router /api/service/start [post]
func StartService(c *gin.Context) {
	result, err := service.StartService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": result})
}

// StopService 停止服务
// @Summary 停止服务
// @Tags Service
// @Produce json
// @Success 200 {string} string
// @Router /api/service/stop [post]
func StopService(c *gin.Context) {
	result, err := service.StopService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": result})
}

// RestartService 重启服务
// @Summary 重启服务
// @Tags Service
// @Produce json
// @Success 200 {string} string
// @Router /api/service/restart [post]
func RestartService(c *gin.Context) {
	result, err := service.RestartService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": result})
}

// GetLogs 获取日志
// @Summary 获取日志
// @Tags Service
// @Produce json
// @Param lines query int false "日志行数"
// @Success 200 {array} string
// @Router /api/service/logs [get]
func GetLogs(c *gin.Context) {
	linesStr := c.DefaultQuery("lines", "100")
	lines, err := strconv.ParseUint(linesStr, 10, 32)
	if err != nil {
		lines = 100
	}

	logs, err := service.GetLogs(uint32(lines))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}
