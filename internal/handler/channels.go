package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// GetChannelsConfig 获取渠道配置
func GetChannelsConfig(c *gin.Context) {
	channels, err := service.GetChannelsConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, channels)
}

// SaveChannelConfig 保存渠道配置
func SaveChannelConfig(c *gin.Context) {
	var req model.ChannelSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := service.SaveChannelConfig(req.ChannelType, req.Enabled, req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Channel config saved"})
}

// ClearChannelConfig 清除渠道配置
func ClearChannelConfig(c *gin.Context) {
	channelType := c.Param("type")
	err := service.ClearChannelConfig(channelType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Channel " + channelType + " config cleared"})
}
