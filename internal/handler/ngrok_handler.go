package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/service"
)

// NgrokHandler ngrok 处理器
type NgrokHandler struct {
	svc *service.NgrokService
}

// NewNgrokHandler 创建 ngrok 处理器
func NewNgrokHandler(svc *service.NgrokService) *NgrokHandler {
	return &NgrokHandler{svc: svc}
}

// GetStatus 获取 ngrok 状态
// @Summary 获取 ngrok 状态
// @Tags Ngrok
// @Produce json
// @Success 200 {object} model.NgrokStatus
// @Router /api/ngrok/check [get]
func (h *NgrokHandler) GetStatus(c *gin.Context) {
	status := h.svc.GetStatus(c.Request.Context())
	c.JSON(http.StatusOK, status)
}

// Start 启动 ngrok 隧道
// @Summary 启动 ngrok 隧道
// @Tags Ngrok
// @Produce json
// @Success 200 {object} model.NgrokStatus
// @Router /api/ngrok/start [post]
func (h *NgrokHandler) Start(c *gin.Context) {
	status, err := h.svc.Start(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// Stop 停止 ngrok 隧道
// @Summary 停止 ngrok 隧道
// @Tags Ngrok
// @Produce json
// @Success 200 {object} model.NgrokStatus
// @Router /api/ngrok/stop [post]
func (h *NgrokHandler) Stop(c *gin.Context) {
	status, err := h.svc.Stop(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// Install 安装 ngrok
// @Summary 安装 ngrok
// @Tags Ngrok
// @Produce json
// @Success 200 {object} model.NgrokInstallResult
// @Router /api/ngrok/install [post]
func (h *NgrokHandler) Install(c *gin.Context) {
	result, err := h.svc.Install(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
