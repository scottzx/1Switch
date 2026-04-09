package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// SessionHandler 会话处理器
type SessionHandler struct{}

// NewSessionHandler 创建会话处理器
func NewSessionHandler() *SessionHandler {
	return &SessionHandler{}
}

// ListSessions 列出所有会话
func (h *SessionHandler) ListSessions(c *gin.Context) {
	sessions, err := service.ListSessions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// CreateSession 创建新会话
func (h *SessionHandler) CreateSession(c *gin.Context) {
	var req model.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有请求体，使用默认名称
		req.Name = ""
	}

	port, err := service.CreateSession(req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.CreateSessionResponse{
		Port: port,
		Name: "ttyd-" + strconv.Itoa(port),
	})
}

// DeleteSession 删除会话
func (h *SessionHandler) DeleteSession(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{Error: "会话名称不能为空"})
		return
	}

	if err := service.DeleteSession(name); err != nil {
		c.JSON(http.StatusForbidden, model.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.MessageResponse{Message: "会话已删除"})
}

// GetDefaultSession 获取默认会话
func (h *SessionHandler) GetDefaultSession(c *gin.Context) {
	session, err := service.GetSessionByPort(service.GetDefaultPort())
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"port":   service.GetDefaultPort(),
			"name":   "default",
			"status": "running",
		})
		return
	}
	c.JSON(http.StatusOK, session)
}
