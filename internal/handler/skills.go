package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/model"
)

// skills 缓存
var (
	skillsCache     []model.SkillDefinition
	skillsCacheTime time.Time
	skillsCacheMu   sync.RWMutex
)

const skillsCacheTTL = 10 * time.Minute // 缓存 10 分钟

// 本地缓存文件路径
const skillsCacheFile = "/Users/scott/.openclaw/.skills_cache.json"

// GetSkillsList 获取技能列表
func GetSkillsList(c *gin.Context) {
	skills := getSkillsFromCLI()

	if skills == nil {
		c.JSON(http.StatusOK, []model.SkillDefinition{})
		return
	}

	c.JSON(http.StatusOK, skills)
}

// getSkillsFromCLI 执行 openclaw skills list --json 获取技能列表（带缓存）
func getSkillsFromCLI() []model.SkillDefinition {
	skillsCacheMu.RLock()
	if skillsCache != nil && time.Since(skillsCacheTime) < skillsCacheTTL {
		defer skillsCacheMu.RUnlock()
		return skillsCache
	}
	skillsCacheMu.RUnlock()

	// 缓存过期或为空，优先从本地缓存文件读取
	if skills := loadSkillsFromCacheFile(); skills != nil {
		skillsCacheMu.Lock()
		skillsCache = skills
		skillsCacheTime = time.Now()
		skillsCacheMu.Unlock()
		return skills
	}

	// 本地缓存也没有，执行 CLI 获取
	cmd := exec.Command("openclaw", "skills", "list", "--json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		// CLI 失败也尝试读本地缓存
		if skills := loadSkillsFromCacheFile(); skills != nil {
			skillsCacheMu.Lock()
			skillsCache = skills
			skillsCacheTime = time.Now()
			skillsCacheMu.Unlock()
			return skills
		}
		return nil
	}

	skills := parseSkillsJSONOutput(string(output))

	skillsCacheMu.Lock()
	skillsCache = skills
	skillsCacheTime = time.Now()
	skillsCacheMu.Unlock()

	// 异步写入本地缓存文件
	go saveSkillsToCacheFile(skills)

	return skills
}

// loadSkillsFromCacheFile 从本地文件加载技能缓存
func loadSkillsFromCacheFile() []model.SkillDefinition {
	data, err := os.ReadFile(skillsCacheFile)
	if err != nil {
		return nil
	}

	// 先尝试直接解析为 SkillDefinition 数组（新格式）
	var skills []model.SkillDefinition
	if err := json.Unmarshal(data, &skills); err == nil && len(skills) > 0 {
		// 验证新格式：检查是否有有效的 ID（computed field）
		if len(skills[0].ID) > 0 {
			return skills
		}
		// 否则是旧格式，需要转换
	}

	// 兼容旧格式：直接解析 openclaw JSON 输出
	var jsonOut openclawJSONOutput
	if err := json.Unmarshal(data, &jsonOut); err != nil {
		return nil
	}

	result := make([]model.SkillDefinition, 0, len(jsonOut.Skills))
	for _, s := range jsonOut.Skills {
		skill := model.SkillDefinition{
			ID:           strings.ToLower(strings.ReplaceAll(s.Name, " ", "-")),
			Name:         s.Name,
			Description:  s.Description,
			Icon:         getSkillEmoji(s.Name),
			Source:       mapSource(s.Source),
			Installed:    s.Eligible,
			Enabled:      s.Eligible && !s.Disabled,
			ConfigFields: []model.SkillConfigField{},
			ConfigValues: make(map[string]interface{}),
			DocsURL:      nil,
			Category:     strPtr(getCategory(s.Name)),
		}
		result = append(result, skill)
	}
	return result
}

// saveSkillsToCacheFile 保存技能列表到本地缓存文件
func saveSkillsToCacheFile(skills []model.SkillDefinition) {
	if skills == nil {
		return
	}
	data, err := json.Marshal(skills)
	if err != nil {
		return
	}
	os.WriteFile(skillsCacheFile, data, 0644)
}

// invalidateSkillsCache 使技能缓存失效（安装/卸载/配置操作后调用）
func invalidateSkillsCache() {
	skillsCacheMu.Lock()
	skillsCache = nil
	skillsCacheTime = time.Time{}
	skillsCacheMu.Unlock()
}

// openclawJSONSkill 是 openclaw skills list --json 输出的内部结构
type openclawJSONSkill struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Eligible    bool   `json:"eligible"`
	Disabled    bool   `json:"disabled"`
	Source      string `json:"source"`
	Bundled     bool   `json:"bundled"`
}

type openclawJSONOutput struct {
	Skills []openclawJSONSkill `json:"skills"`
}

// parseSkillsJSONOutput 解析 openclaw skills list --json 输出
func parseSkillsJSONOutput(output string) []model.SkillDefinition {
	// 过滤掉 ANSI 颜色代码并找到 JSON 开始位置
	cleaned := removeANSICodes(output)

	// 找到 JSON 开始位置（第一个 '{'）
	startIdx := strings.Index(cleaned, "{")
	if startIdx == -1 {
		return nil
	}
	cleaned = cleaned[startIdx:]

	var jsonOut openclawJSONOutput
	if err := json.Unmarshal([]byte(cleaned), &jsonOut); err != nil {
		return nil
	}

	skills := make([]model.SkillDefinition, 0, len(jsonOut.Skills))
	for _, s := range jsonOut.Skills {
		skill := model.SkillDefinition{
			ID:           strings.ToLower(strings.ReplaceAll(s.Name, " ", "-")),
			Name:         s.Name,
			Description:  s.Description,
			Icon:         getSkillEmoji(s.Name),
			Source:       mapSource(s.Source),
			Installed:    s.Eligible,
			Enabled:      s.Eligible && !s.Disabled,
			ConfigFields: []model.SkillConfigField{},
			ConfigValues: make(map[string]interface{}),
			DocsURL:      nil,
			Category:     strPtr(getCategory(s.Name)),
		}
		skills = append(skills, skill)
	}

	return skills
}

// removeANSICodes 移除 ANSI 颜色代码
func removeANSICodes(s string) string {
	ansi := regexp.MustCompile(`\x1b\[[0-9;]*m`)
	return ansi.ReplaceAllString(s, "")
}

// mapSource 将 JSON source 映射到 ui source 类型
func mapSource(source string) string {
	switch {
	case strings.Contains(source, "openclaw-bundled"):
		return "builtin"
	case strings.Contains(source, "clawhub"):
		return "clawhub"
	case strings.Contains(source, "openclaw-extra"):
		return "official"
	case strings.Contains(source, "agents-skills"):
		return "community"
	default:
		return "custom"
	}
}

// getSkillEmoji 根据技能名称返回默认 emoji 图标
func getSkillEmoji(name string) string {
	emojiMap := map[string]string{
		"feishu-bitable":       "📊",
		"feishu-calendar":      "📅",
		"feishu-channel-rules":  "📌",
		"feishu-create-doc":    "📄",
		"feishu-fetch-doc":     "📖",
		"feishu-im-read":       "💬",
		"feishu-task":          "✅",
		"feishu-troubleshoot":  "🔧",
		"feishu-update-doc":   "✏️",
		"1password":            "🔐",
		"apple-notes":           "📝",
		"apple-reminders":      "⏰",
		"bear-notes":            "🐻",
		"blogwatcher":           "📰",
		"blucli":                "📡",
		"bluebubbles":           "💬",
		"camsnap":               "📷",
		"clawhub":               "🦞",
		"coding-agent":          "💻",
		"discord":               "🎮",
		"eightctl":              "🎯",
		"gemini":                "✨",
		"gh-issues":             "🐙",
		"gifgrep":               "🔍",
		"github":               "🐙",
		"gog":                   "🎮",
		"goplaces":              "📍",
		"healthcheck":           "❤️",
		"himalaya":              "📧",
		"imsg":                  "💬",
		"mcporter":              "🎵",
		"model-usage":           "🤖",
		"nano-pdf":              "📄",
		"node-connect":          "🔗",
		"notion":                "📓",
		"obsidian":              "💎",
		"openai-whisper":        "🎤",
		"openhue":               "💡",
		"oracle":                "🔮",
		"ordercli":              "📦",
		"peekaboo":              "👀",
		"sag":                   "🎯",
		"session-logs":          "📜",
		"sherpa-onnx-tts":       "🔊",
		"skill-creator":         "🛠️",
		"slack":                 "💬",
		"songsee":               "🎵",
		"sonoscli":              "🔊",
		"spotify-player":        "🎧",
		"summarize":             "📝",
		"things-mac":            "✅",
		"tmux":                  "🖥️",
		"trello":                "📋",
		"video-frames":          "🎬",
		"voice-call":            "📞",
		"wacli":                 "💬",
		"weather":               "🌤️",
		"xurl":                  "🔗",
	}
	if emoji, ok := emojiMap[name]; ok {
		return emoji
	}
	return "📦" // 默认包图标
}

// parseSkillsOutput 解析 openclaw skills list 输出（文本格式，仅作备用）
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
	invalidateSkillsCache()
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
	invalidateSkillsCache()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Skill " + skillID + " uninstalled"})
}

// SaveSkillConfig 保存技能配置
func SaveSkillConfig(c *gin.Context) {
	var req model.SkillSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	invalidateSkillsCache()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Skill config saved"})
}

// InstallCustomSkill 安装自定义技能
func InstallCustomSkill(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": false, "message": "Use openclaw skills install <slug> to install custom skills"})
}
