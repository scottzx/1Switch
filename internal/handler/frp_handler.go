package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// FrpHandler FRP 处理器
type FrpHandler struct {
	svc *service.FrpService
}

// NewFrpHandler 创建 FRP 处理器
func NewFrpHandler(svc *service.FrpService) *FrpHandler {
	return &FrpHandler{svc: svc}
}

// GetStatus 获取 FRP 状态
// @Summary 获取 FRP 状态
// @Tags FRP
// @Produce json
// @Success 200 {object} model.FrpStatus
// @Router /api/frp/status [get]
func (h *FrpHandler) GetStatus(c *gin.Context) {
	status := h.svc.GetStatus(c.Request.Context())
	c.JSON(http.StatusOK, status)
}

// Connect 连接到 FRP 服务器
// @Summary 连接 FRP 服务器
// @Tags FRP
// @Produce json
// @Param request body model.FrpConnectRequest true "连接请求"
// @Success 200 {object} model.FrpConnectResponse
// @Router /api/frp/connect [post]
func (h *FrpHandler) Connect(c *gin.Context) {
	var req model.FrpConnectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Connect(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Disconnect 断开 FRP 连接
// @Summary 断开 FRP 连接
// @Tags FRP
// @Produce json
// @Success 200 {object} model.FrpConnectResponse
// @Router /api/frp/disconnect [post]
func (h *FrpHandler) Disconnect(c *gin.Context) {
	if err := h.svc.Disconnect(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
