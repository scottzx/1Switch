package handler

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// ProfileFile 档案文件信息
type ProfileFile struct {
	Name        string `json:"name"`         // 文件名如 IDENTITY.md
	ChineseName string `json:"chineseName"` // 中文名称
	Description string `json:"description"` // 文件描述
	Exists      bool   `json:"exists"`       // 文件是否存在
}

// 档案文件列表定义
var profileFiles = []ProfileFile{
	{Name: "IDENTITY.md", ChineseName: "身份档案", Description: "龙虾的名字、形象、emoji 和头像"},
	{Name: "SOUL.md", ChineseName: "灵魂契约", Description: "核心价值观、行为准则和个性风格"},
	{Name: "TOOLS.md", ChineseName: "工具备注", Description: "本地工具配置：相机、SSH、TTS 等"},
	{Name: "AGENTS.md", ChineseName: "工作手册", Description: "工作空间规则、内存管理、群聊礼仪"},
	{Name: "USER.md", ChineseName: "用户资料", Description: "用户信息、时区偏好、上下文"},
	{Name: "BOOTSTRAP.md", ChineseName: "初始化向导", Description: "首次启动引导（配置完成后会自动删除）"},
	{Name: "HEARTBEAT.md", ChineseName: "心跳任务", Description: "周期性后台检查任务"},
}

// getWorkspace 获取工作空间路径
func getWorkspace(workspace string) string {
	if workspace == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return filepath.Join(os.Getenv("HOME"), ".openclaw", "workspace")
		}
		workspace = filepath.Join(home, ".openclaw", "workspace")
	}
	return expandHome(workspace)
}

// GetProfileFiles 获取所有档案文件列表
func GetProfileFiles(c *gin.Context) {
	workspace := getWorkspace(c.Query("workspace"))

	files := make([]ProfileFile, len(profileFiles))
	for i, pf := range profileFiles {
		filePath := filepath.Join(workspace, pf.Name)
		exists := false
		if _, err := os.Stat(filePath); err == nil {
			exists = true
		}
		files[i] = ProfileFile{
			Name:        pf.Name,
			ChineseName: pf.ChineseName,
			Description: pf.Description,
			Exists:      exists,
		}
	}

	c.JSON(200, gin.H{"files": files})
}

// GetProfileFile 读取单个档案文件
func GetProfileFile(c *gin.Context) {
	workspace := getWorkspace(c.Query("workspace"))
	fileName := c.Param("name")

	// 验证文件名
	validName := false
	for _, pf := range profileFiles {
		if pf.Name == fileName {
			validName = true
			break
		}
	}
	if !validName {
		c.JSON(400, gin.H{"error": "无效的档案文件名"})
		return
	}

	filePath := filepath.Join(workspace, fileName)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(200, gin.H{"content": "", "exists": false})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"content": string(content), "exists": true})
}

// SaveProfileFile 保存单个档案文件
func SaveProfileFile(c *gin.Context) {
	var req model.ProfileSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	workspace := getWorkspace(req.Workspace)
	fileName := c.Param("name")

	// 验证文件名
	validName := false
	for _, pf := range profileFiles {
		if pf.Name == fileName {
			validName = true
			break
		}
	}
	if !validName {
		c.JSON(400, gin.H{"error": "无效的档案文件名"})
		return
	}

	filePath := filepath.Join(workspace, fileName)

	// 确保目录存在
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "档案已保存"})
}

// GetIdentity 读取 IDENTITY.md (兼容旧接口)
func GetIdentity(c *gin.Context) {
	workspace := getWorkspace(c.Query("workspace"))

	identityPath := filepath.Join(workspace, "IDENTITY.md")
	content, err := os.ReadFile(identityPath)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(200, gin.H{"content": ""})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"content": string(content)})
}

// SaveIdentity 保存 IDENTITY.md (兼容旧接口)
func SaveIdentity(c *gin.Context) {
	var req model.ProfileSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	workspace := getWorkspace(req.Workspace)
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
