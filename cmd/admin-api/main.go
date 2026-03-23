package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/router"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "1420" // 前端端口
	}

	// 获取可执行文件所在目录
	execDir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
	// 静态文件在可执行文件同级目录
	staticDir := execDir

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

	// Setup API routes (router.SetupRouter already creates /api group)
	router.SetupRouter(r)

	// Serve static files from same directory as executable
	if _, err := os.Stat(staticDir); err == nil {
		r.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(staticDir, "index.html"))
		})
		r.Static("/assets", filepath.Join(staticDir, "assets"))
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
