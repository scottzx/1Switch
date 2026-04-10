package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/router"
	"iclaw-admin-api/internal/service"
)

const Version = "v2026.3.23-9"

func main() {
	// Check version flag
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		println("iClaw Admin API version", Version)
		os.Exit(0)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "1420" // 前端端口
	}

	// 静态文件目录 - 优先使用 dist 目录（前端构建产物）
	staticDir := "dist"
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		// 如果 dist 不存在，使用可执行文件所在目录
		execDir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
		staticDir = execDir
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Version check
	r.GET("/api/version", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"version": Version,
			"name":    "iClaw Admin API",
		})
	})

	// Setup API routes (router.SetupRouter already creates /api group)
	// 初始化系统信息缓存
	service.InitSystemInfoCache()
	router.SetupRouter(r)

	// Serve ngrok app static files
	ngrokStaticDir := "app/ngrok/dist"
	if _, err := os.Stat(ngrokStaticDir); err == nil {
		appGroup := r.Group("/app/ngrok")
		appGroup.GET("", func(c *gin.Context) {
			c.File(filepath.Join(ngrokStaticDir, "index.html"))
		})
		appGroup.GET("/*path", func(c *gin.Context) {
			requestedPath := c.Param("path")
			staticPath := filepath.Join(ngrokStaticDir, requestedPath)
			if _, err := os.Stat(staticPath); err == nil {
				c.File(staticPath)
			} else {
				c.File(filepath.Join(ngrokStaticDir, "index.html"))
			}
		})
		log.Printf("Serving ngrok app from: %s", ngrokStaticDir)
	}

	// Serve static files from same directory as executable
	if _, err := os.Stat(staticDir); err == nil {
		r.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(staticDir, "index.html"))
		})
		r.Static("/assets", filepath.Join(staticDir, "assets"))
		r.Static("/icons", filepath.Join(staticDir, "icons"))
		// PWA static files
		r.StaticFile("/manifest.json", filepath.Join(staticDir, "manifest.json"))
		r.StaticFile("/sw.js", filepath.Join(staticDir, "sw.js"))
		r.StaticFile("/registerSW.js", filepath.Join(staticDir, "registerSW.js"))
		r.StaticFile("/workbox-78ef5c9b.js", filepath.Join(staticDir, "workbox-78ef5c9b.js"))
		r.StaticFile("/claw.svg", filepath.Join(staticDir, "claw.svg"))
		// SPA fallback - only non-API routes serve index.html
		r.NoRoute(func(c *gin.Context) {
			if !strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.File(filepath.Join(staticDir, "index.html"))
			}
		})
		log.Printf("Serving static files from: %s", staticDir)
	}

	log.Printf("iClaw Admin API starting on port %s", port)
	r.Run("0.0.0.0:" + port)
}
