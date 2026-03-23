package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
	"iclaw-admin-api/internal/service"
)

// GetAgentsList 获取 Agent 列表
func GetAgentsList(c *gin.Context) {
	agents, err := service.GetAgentsList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, agents)
}

// SaveAgent 保存 Agent
func SaveAgent(c *gin.Context) {
	var req model.AgentSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := service.SaveAgent(&req.Agent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Agent saved"})
}

// DeleteAgent 删除 Agent
func DeleteAgent(c *gin.Context) {
	agentID := c.Param("id")
	err := service.DeleteAgent(agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Agent " + agentID + " deleted"})
}

// SetDefaultAgent 设置默认 Agent
func SetDefaultAgent(c *gin.Context) {
	agentID := c.Param("id")
	err := service.SetDefaultAgent(agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Agent " + agentID + " set as default"})
}
