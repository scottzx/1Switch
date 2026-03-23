package router

import (
	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/handler"
)

// SetupRouter 设置所有路由
func SetupRouter(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Service routes
		service := api.Group("/service")
		{
			service.GET("/status", handler.GetServiceStatus)
			service.POST("/start", handler.StartService)
			service.POST("/stop", handler.StopService)
			service.POST("/restart", handler.RestartService)
			service.GET("/logs", handler.GetLogs)
		}

		// System routes
		system := api.Group("/system")
		{
			system.GET("/info", handler.GetSystemInfo)
			system.GET("/device-ip", handler.GetDeviceIP)
		}

		// Config routes
		config := api.Group("/config")
		{
			config.GET("", handler.GetConfig)
			config.PUT("", handler.SaveConfig)
			config.GET("/env/:key", handler.GetEnvValue)
			config.PUT("/env/:key", handler.SaveEnvValue)
			config.POST("/validate", handler.ValidateConfig)
		}

		// Gateway routes
		gateway := api.Group("/gateway")
		{
			gateway.GET("/token", handler.GetGatewayToken)
			gateway.GET("/dashboard-url", handler.GetDashboardURL)
		}

		// AI routes (placeholder)
		ai := api.Group("/ai")
		{
			ai.GET("/providers/official", handler.GetOfficialProviders)
			ai.GET("/config", handler.GetAIConfig)
			ai.POST("/provider", handler.SaveProvider)
			ai.DELETE("/provider/:name", handler.DeleteProvider)
			ai.POST("/primary-model", handler.SetPrimaryModel)
			ai.POST("/model", handler.AddAvailableModel)
			ai.DELETE("/model/:id", handler.RemoveAvailableModel)
		}

		// Channels routes (placeholder)
		channels := api.Group("/channels")
		{
			channels.GET("", handler.GetChannelsConfig)
			channels.PUT("", handler.SaveChannelConfig)
			channels.DELETE("/:type", handler.ClearChannelConfig)
		}

		// Agents routes (placeholder)
		agents := api.Group("/agents")
		{
			agents.GET("", handler.GetAgentsList)
			agents.POST("", handler.SaveAgent)
			agents.DELETE("/:id", handler.DeleteAgent)
			agents.POST("/default/:id", handler.SetDefaultAgent)
		}

		// Skills routes (placeholder)
		skills := api.Group("/skills")
		{
			skills.GET("", handler.GetSkillsList)
			skills.POST("/install/:id", handler.InstallSkill)
			skills.POST("/uninstall/:id", handler.UninstallSkill)
			skills.PUT("/config", handler.SaveSkillConfig)
			skills.POST("/install-custom", handler.InstallCustomSkill)
		}

		// Diagnostics routes (placeholder)
		diagnostics := api.Group("/diagnostics")
		{
			diagnostics.GET("/doctor", handler.RunDoctor)
			diagnostics.GET("/ai-test", handler.TestAIConnection)
			diagnostics.GET("/channel/:type", handler.TestChannel)
			diagnostics.POST("/channel/:type/send", handler.SendTestMessage)
			diagnostics.GET("/system", handler.GetSystemInfo)
			diagnostics.POST("/channel/:type/login", handler.StartChannelLogin)
		}

		// Security routes (placeholder)
		security := api.Group("/security")
		{
			security.GET("/scan", handler.RunSecurityScan)
			security.POST("/fix", handler.FixSecurityIssues)
		}

		// Install routes (placeholder)
		install := api.Group("/install")
		{
			install.GET("/environment", handler.CheckEnvironment)
			install.POST("/nodejs", handler.InstallNodeJS)
			install.POST("/openclaw", handler.InstallOpenClaw)
			install.POST("/init-config", handler.InitOpenClawConfig)
			install.POST("/terminal/:type", handler.OpenInstallTerminal)
			install.DELETE("/openclaw", handler.UninstallOpenClaw)
			install.GET("/update-check", handler.CheckOpenClawUpdate)
			install.POST("/update", handler.UpdateOpenClaw)
		}
	}
}
