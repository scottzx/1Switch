package handler

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// RunSecurityScan 运行安全扫描
func RunSecurityScan(c *gin.Context) {
	cmd := exec.Command("openclaw", "security", "audit", "--json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// 如果 JSON 输出失败，尝试文本输出
		cmd = exec.Command("openclaw", "security", "audit")
		output, err = cmd.CombinedOutput()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": string(output)})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "output": string(output)})
		return
	}

	// 解析 JSON 输出
	var auditResult struct {
		Findings []struct {
			ID          string `json:"id"`
			Severity    string `json:"severity"`
			Title       string `json:"title"`
			Description string `json:"description"`
			Category    string `json:"category"`
			Fixable     bool   `json:"fixable"`
			AutoFix     bool   `json:"autoFix"`
		} `json:"findings"`
	}

	if err := json.Unmarshal(output, &auditResult); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "raw": string(output)})
		return
	}

	issues := make([]model.SecurityIssue, 0, len(auditResult.Findings))
	for _, f := range auditResult.Findings {
		issue := model.SecurityIssue{
			ID:          f.ID,
			Title:       f.Title,
			Description: f.Description,
			Severity:    f.Severity,
			Fixable:     f.Fixable,
			Fixed:       false,
			Category:    f.Category,
		}
		issues = append(issues, issue)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "issues": issues})
}

// FixSecurityIssues 修复安全问题
func FixSecurityIssues(c *gin.Context) {
	var req model.SecurityFixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cmd := exec.Command("openclaw", "security", "audit", "--fix")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// 检查输出中是否有成功信息
		if strings.Contains(string(output), "fixed") || strings.Contains(string(output), "Fixed") {
			c.JSON(http.StatusOK, gin.H{"success": true, "message": string(output)})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": false, "message": string(output)})
		return
	}

	result := model.SecurityFixResult{
		Success:  true,
		Message:  "Security issues fixed",
		FixedIDs: req.IssueIDs,
	}
	c.JSON(http.StatusOK, result)
}
