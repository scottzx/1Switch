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

const Version = "v2026.4.17-2"

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--version" {
		println("iClaw Admin API version", Version)
		os.Exit(0)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	portalStaticDir := "."
	iclawStaticDir := "app/iclaw"
	terminalStaticDir := "app/terminal"

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

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

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.GET("/api/version", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"version": Version,
			"name":    "iClaw Admin API",
		})
	})

	service.InitSystemInfoCache()
	router.SetupRouter(r)

	// Debug: print registered routes
	for _, route := range r.Routes() {
		log.Printf("Route: %s %s", route.Method, route.Path)
	}

	// Serve FRP app static files
	frpStaticDir := "app/frp"
	if _, err := os.Stat(frpStaticDir); err == nil {
		appGroup := r.Group("/app/frp")
		appGroup.GET("", func(c *gin.Context) {
			c.File(filepath.Join(frpStaticDir, "index.html"))
		})
		appGroup.GET("/*path", func(c *gin.Context) {
			requestedPath := c.Param("path")
			staticPath := filepath.Join(frpStaticDir, requestedPath)
			if _, err := os.Stat(staticPath); err == nil {
				c.File(staticPath)
			} else {
				c.File(filepath.Join(frpStaticDir, "index.html"))
			}
		})
		log.Printf("Serving FRP app from: %s", frpStaticDir)
	}

	// Portal 静态文件
	if _, err := os.Stat(portalStaticDir); err == nil {
		r.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(portalStaticDir, "index.html"))
		})
		r.Static("/assets", filepath.Join(portalStaticDir, "assets"))
		log.Printf("Portal serving from: %s", portalStaticDir)
	} else {
		log.Printf("Portal directory not found: %s", portalStaticDir)
	}

	// iclaw 静态文件
	if _, err := os.Stat(iclawStaticDir); err == nil {
		appGroup := r.Group("/app/iclaw")
		appGroup.GET("", func(c *gin.Context) {
			c.File(filepath.Join(iclawStaticDir, "index.html"))
		})
		appGroup.GET("/*path", func(c *gin.Context) {
			requestedPath := c.Param("path")
			staticPath := filepath.Join(iclawStaticDir, requestedPath)
			if _, err := os.Stat(staticPath); err == nil {
				c.File(staticPath)
			} else {
				c.File(filepath.Join(iclawStaticDir, "index.html"))
			}
		})
		log.Printf("iclaw serving from: %s", iclawStaticDir)
	} else {
		log.Printf("iclaw directory not found: %s", iclawStaticDir)
	}

	// terminal 静态文件
	if _, err := os.Stat(terminalStaticDir); err == nil {
		terminalGroup := r.Group("/app/terminal")
		terminalGroup.GET("", func(c *gin.Context) {
			c.File(filepath.Join(terminalStaticDir, "index.html"))
		})
		terminalGroup.GET("/*path", func(c *gin.Context) {
			requestedPath := c.Param("path")
			staticPath := filepath.Join(terminalStaticDir, requestedPath)
			if _, err := os.Stat(staticPath); err == nil {
				c.File(staticPath)
			} else {
				c.File(filepath.Join(terminalStaticDir, "index.html"))
			}
		})
		log.Printf("terminal serving from: %s", terminalStaticDir)
	} else {
		log.Printf("terminal directory not found: %s", terminalStaticDir)
	}

	// SPA fallback - 非 API 路由 fallback 到 portal
	r.NoRoute(func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.File(filepath.Join(portalStaticDir, "index.html"))
		}
	})

	log.Printf("iClaw Admin API starting on port %s", port)
	log.Printf("Portal: http://localhost:%s/", port)
	log.Printf("iclaw: http://localhost:%s/app/iclaw/", port)
	log.Printf("frp: http://localhost:%s/app/frp/", port)
	log.Printf("terminal: http://localhost:%s/app/terminal/", port)
	r.Run("0.0.0.0:" + port)
}
