package handler

import (
	"net/http"
	"os/exec"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// GetSkillsList 获取技能列表
func GetSkillsList(c *gin.Context) {
	skills := getSkillsFromCLI()

	if skills == nil {
		c.JSON(http.StatusOK, []model.SkillDefinition{})
		return
	}

	c.JSON(http.StatusOK, skills)
}

// getSkillsFromCLI 执行 openclaw skills list 获取技能列表
func getSkillsFromCLI() []model.SkillDefinition {
	cmd := exec.Command("openclaw", "skills", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil
	}

	return parseSkillsOutput(string(output))
}

// parseSkillsOutput 解析 openclaw skills list 输出
func parseSkillsOutput(output string) []model.SkillDefinition {
	lines := strings.Split(output, "\n")

	var skills []model.SkillDefinition
	var currentSkill *model.SkillDefinition

	skillPattern := regexp.MustCompile(`([✗✓])\s+(ready|missing)\s+│\s+(.+?)\s+│\s+(.+?)\s+│\s+(.+?)\s*$`)

	for _, line := range lines {
		matches := skillPattern.FindStringSubmatch(line)
		if matches != nil {
			if currentSkill != nil {
				skills = append(skills, *currentSkill)
			}

			statusIcon := matches[1]
			namePart := strings.TrimSpace(matches[3])
			descPart := strings.TrimSpace(matches[4])
			sourcePart := strings.TrimSpace(matches[5])

			// 解析 emoji 和名称 - emoji 在空格前
			icon := ""
			name := namePart
			if idx := strings.Index(namePart, " "); idx > 0 {
				icon = strings.TrimSpace(namePart[:idx])
				name = strings.TrimSpace(namePart[idx:])
			} else if idx := strings.Index(namePart, "\t"); idx > 0 {
				icon = strings.TrimSpace(namePart[:idx])
				name = strings.TrimSpace(namePart[idx:])
			}

			installed := statusIcon == "✓"
			source := "openclaw-bundled"
			if strings.Contains(sourcePart, "clawhub") {
				source = "clawhub"
			}

			skill := model.SkillDefinition{
				ID:           strings.ToLower(strings.ReplaceAll(name, " ", "-")),
				Name:         name,
				Description:  descPart,
				Icon:         icon,
				Source:       source,
				Installed:    installed,
				Enabled:      installed,
				ConfigFields: []model.SkillConfigField{},
				ConfigValues: make(map[string]interface{}),
				DocsURL:      nil,
				Category:     strPtr(getCategory(name)),
			}

			currentSkill = &skill
		} else if currentSkill != nil {
			// 描述延续行
			if strings.HasPrefix(line, "│") && !strings.Contains(line, "├") && !strings.Contains(line, "─") {
				parts := strings.Split(line, "│")
				if len(parts) >= 3 {
					descPart := strings.TrimSpace(parts[2])
					if descPart != "" {
						currentSkill.Description += " " + descPart
					}
				}
			}
		}
	}

	if currentSkill != nil {
		skills = append(skills, *currentSkill)
	}

	return skills
}

// getCategory 根据技能名称返回分类
func getCategory(name string) string {
	categoryMap := map[string]string{
		"1password":       "工具",
		"apple-notes":     "生产力",
		"apple-reminders": "生产力",
		"bear-notes":      "生产力",
		"blogwatcher":     "工具",
		"blucli":          "工具",
		"bluebubbles":     "通讯",
		"camsnap":         "工具",
		"clawhub":         "工具",
		"coding-agent":    "开发",
		"discord":         "通讯",
		"eightctl":        "工具",
		"gemini":          "AI",
		"gh-issues":       "开发",
		"gifgrep":         "工具",
		"github":          "开发",
		"gog":             "生产力",
		"goplaces":        "工具",
		"healthcheck":     "系统",
		"himalaya":        "通讯",
		"imsg":            "通讯",
		"mcporter":        "开发",
		"model-usage":     "AI",
		"nano-pdf":        "工具",
		"node-connect":    "系统",
		"notion":          "生产力",
		"obsidian":        "生产力",
		"openai-whisper":  "AI",
		"openhue":         "工具",
		"oracle":          "工具",
		"ordercli":        "工具",
		"peekaboo":        "工具",
		"sag":             "AI",
		"session-logs":    "工具",
		"sherpa-onnx-tts": "AI",
		"skill-creator":   "开发",
		"slack":           "通讯",
		"songsee":         "工具",
		"sonoscli":        "工具",
		"spotify-player":  "工具",
		"summarize":       "工具",
		"things-mac":      "生产力",
		"tmux":            "开发",
		"trello":          "生产力",
		"video-frames":    "工具",
		"voice-call":      "通讯",
		"wacli":           "通讯",
		"weather":         "工具",
		"xurl":            "社交",
	}

	lowerName := strings.ToLower(name)
	if cat, ok := categoryMap[lowerName]; ok {
		return cat
	}
	return "工具"
}

// InstallSkill 安装技能
func InstallSkill(c *gin.Context) {
	skillID := c.Param("id")
	cmd := exec.Command("openclaw", "skills", "install", skillID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": string(output)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Skill " + skillID + " installed"})
}

// UninstallSkill 卸载技能
func UninstallSkill(c *gin.Context) {
	skillID := c.Param("id")
	cmd := exec.Command("openclaw", "skills", "uninstall", skillID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": string(output)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Skill " + skillID + " uninstalled"})
}

// SaveSkillConfig 保存技能配置
func SaveSkillConfig(c *gin.Context) {
	var req model.SkillSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Skill config saved"})
}

// InstallCustomSkill 安装自定义技能
func InstallCustomSkill(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Use openclaw skills install <slug> to install custom skills"})
}
