package handler

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// GetIdentity 读取 IDENTITY.md
func GetIdentity(c *gin.Context) {
	workspace := c.Query("workspace")

	// 如果没有提供 workspace，使用默认的
	if workspace == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		workspace = filepath.Join(home, ".openclaw", "workspace")
	}

	// 展开 ~ 为实际路径
	workspace = expandHome(workspace)

	identityPath := filepath.Join(workspace, "IDENTITY.md")
	content, err := os.ReadFile(identityPath)
	if err != nil {
		// 文件不存在时返回空
		if os.IsNotExist(err) {
			c.JSON(200, gin.H{"content": ""})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"content": string(content)})
}

// SaveIdentity 保存 IDENTITY.md
func SaveIdentity(c *gin.Context) {
	var req model.ProfileSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	workspace := req.Workspace
	if workspace == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		workspace = filepath.Join(home, ".openclaw", "workspace")
	}

	// 展开 ~ 为实际路径
	workspace = expandHome(workspace)

	identityPath := filepath.Join(workspace, "IDENTITY.md")

	// 确保目录存在
	dir := filepath.Dir(identityPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if err := os.WriteFile(identityPath, []byte(req.Content), 0644); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Identity saved"})
}

// expandHome 展开 ~ 为用户主目录路径
func expandHome(path string) string {
	if strings.HasPrefix(path, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return home + path[1:]
	}
	return path
}
