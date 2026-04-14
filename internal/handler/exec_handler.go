package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"iclaw-admin-api/internal/service"
)

// ExecHandler 处理命令执行相关请求
type ExecHandler struct {
	// 正在运行的命令映射
	runningCmds sync.Map
}

// ExecTask 代表一个正在执行的命令
type ExecTask struct {
	Cmd    *exec.Cmd
	KillFn func()
}

// NewExecHandler 创建 ExecHandler
func NewExecHandler() *ExecHandler {
	return &ExecHandler{}
}

// StreamCommand SSE 流式执行命令
// GET /api/exec/stream?cmd=<command>
func (h *ExecHandler) StreamCommand(c *gin.Context) {
	cmdStr := c.Query("cmd")
	if cmdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cmd parameter is required"})
		return
	}

	// 设置 SSE Headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")

	// 创建任务ID
	taskID := fmt.Sprintf("%d", time.Now().UnixNano())

	// 用于等待输出 goroutines 完成
	var wg sync.WaitGroup
	var outputErr int32 = 0

	// 异步执行命令
	go func() {
		// 构建命令
		cmd := exec.Command("bash", "-c", cmdStr)

		// 创建管道捕获 stdout
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			log.Printf("[EXEC] stdout pipe error: %v", err)
			atomic.StoreInt32(&outputErr, 1)
			return
		}

		// 创建管道捕获 stderr
		stderr, err := cmd.StderrPipe()
		if err != nil {
			log.Printf("[EXEC] stderr pipe error: %v", err)
			atomic.StoreInt32(&outputErr, 1)
			return
		}

		// 存储命令以便可以终止
		task := &ExecTask{Cmd: cmd}
		h.runningCmds.Store(taskID, task)

		// 启动命令
		if err := cmd.Start(); err != nil {
			h.runningCmds.Delete(taskID)
			log.Printf("[EXEC] command start error: %v", err)
			atomic.StoreInt32(&outputErr, 1)
			return
		}

		// 发送状态事件
		sendSSEEvent(c, "status", fmt.Sprintf(`{"status":"running","pid":%d}`, cmd.Process.Pid))

		// 使用 goroutine 读取 stdout
		wg.Add(1)
		go func() {
			defer wg.Done()
			buf := make([]byte, 1024)
			for {
				n, err := stdout.Read(buf)
				if n > 0 {
					line := string(buf[:n])
					lines := strings.Split(strings.TrimRight(line, "\n"), "\n")
					for _, l := range lines {
						if l != "" {
							sendSSEEvent(c, "output", fmt.Sprintf(`{"type":"stdout","content":%s}`, escapeJSON(l)))
						}
					}
				}
				if err != nil {
					break
				}
			}
		}()

		// 使用 goroutine 读取 stderr
		wg.Add(1)
		go func() {
			defer wg.Done()
			buf := make([]byte, 1024)
			for {
				n, err := stderr.Read(buf)
				if n > 0 {
					line := string(buf[:n])
					lines := strings.Split(strings.TrimRight(line, "\n"), "\n")
					for _, l := range lines {
						if l != "" {
							sendSSEEvent(c, "output", fmt.Sprintf(`{"type":"stderr","content":%s}`, escapeJSON(l)))
						}
					}
				}
				if err != nil {
					break
				}
			}
		}()

		// 等待命令完成
		log.Printf("[EXEC] Stream waiting for cmd.Wait(), pid=%s", taskID)
		err = cmd.Wait()
		log.Printf("[EXEC] Stream cmd.Wait() returned, pid=%s", taskID)
		h.runningCmds.Delete(taskID)

		// 等待所有输出 goroutines 完成
		log.Printf("[EXEC] Stream waiting for wg.Wait(), pid=%s", taskID)
		wg.Wait()
		log.Printf("[EXEC] Stream wg.Wait() done, sending done, pid=%s", taskID)

		// 发送完成事件
		exitCode := 0
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				exitCode = exitErr.ExitCode()
			} else {
				exitCode = -1
			}
		}
		sendSSEEvent(c, "done", fmt.Sprintf(`{"status":"done","exitCode":%d}`, exitCode))
		log.Printf("[EXEC] Stream done sent, pid=%s, exitCode=%d", taskID, exitCode)
	}()

	// 保持连接直到完成（通过 context 取消）
	<-c.Request.Context().Done()
}

// KillCommand 终止正在执行的命令
// POST /api/exec/kill
func (h *ExecHandler) KillCommand(c *gin.Context) {
	taskID := c.Query("id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id parameter is required"})
		return
	}

	val, ok := h.runningCmds.Load(taskID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "command not found or already finished"})
		return
	}

	task := val.(*ExecTask)
	if task.Cmd != nil && task.Cmd.Process != nil {
		task.Cmd.Process.Kill()
		c.JSON(http.StatusOK, gin.H{"message": "command killed"})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "process not found"})
	}
}

// Exec 同步执行命令并返回结果
// POST /api/exec
func (h *ExecHandler) Exec(c *gin.Context) {
	var req struct {
		Cmd string `json:"cmd"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[EXEC] BadRequest: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "cmd is required"})
		return
	}

	log.Printf("[EXEC] Executing: %s", req.Cmd)
	cmd := exec.Command("bash", "-c", req.Cmd)
	output, err := cmd.CombinedOutput()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}
	log.Printf("[EXEC] Done: exitCode=%d, output=%s", exitCode, string(output))

	c.JSON(http.StatusOK, gin.H{
		"output":   string(output),
		"exitCode": exitCode,
	})
}

// ExecCommand 执行指定命令并返回结果（用于 service start/stop/restart）
// 这个函数会被现有的 service handler 调用
func ExecuteCommandWithOutput(cmdStr string, outputChan chan string) error {
	cmd := exec.Command("bash", "-c", cmdStr)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	// 读取 stdout
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				line := string(buf[:n])
				lines := strings.Split(strings.TrimRight(line, "\n"), "\n")
				for _, l := range lines {
					if l != "" && outputChan != nil {
						outputChan <- l
					}
				}
			}
			if err != nil {
				break
			}
		}
	}()

	// 读取 stderr
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				line := string(buf[:n])
				lines := strings.Split(strings.TrimRight(line, "\n"), "\n")
				for _, l := range lines {
					if l != "" && outputChan != nil {
						outputChan <- "[ERR] " + l
					}
				}
			}
			if err != nil {
				break
			}
		}
	}()

	err = cmd.Wait()
	return err
}

// StartServiceWithOutput 启动服务并实时输出
func StartServiceWithOutput(outputChan chan string) (string, error) {
	// 检查是否已经运行
	status, err := service.GetServiceStatus()
	if err != nil {
		return "", err
	}
	if status.Running {
		return "", fmt.Errorf("服务已在运行中")
	}

	// 检查 openclaw 命令是否存在
	if !service.IsOpenClawInstalled() {
		return "", fmt.Errorf("找不到 openclaw 命令，请先通过 npm install -g openclaw 安装")
	}

	// 后台启动 gateway
	configDir := service.GetConfigDir()
	logDir := configDir + "/logs"
	os.MkdirAll(logDir, 0755)

	cmdStr := fmt.Sprintf(`nohup openclaw gateway > %s/gateway.log 2> %s/gateway.err.log &`, logDir, logDir)

	if outputChan != nil {
		outputChan <- "正在启动 openclaw gateway..."
	}

	if err := ExecuteCommandWithOutput(cmdStr, outputChan); err != nil {
		return "", fmt.Errorf("启动服务失败: %v", err)
	}

	// 等待端口开始监听
	for i := 1; i <= 30; i++ {
		time.Sleep(time.Second)
		if service.CheckPortInUse(service.ServicePort) {
			pids := service.GetPidsOnPort(service.ServicePort)
			if len(pids) > 0 {
				msg := fmt.Sprintf("服务已启动，PID: %d", pids[0])
				if outputChan != nil {
					outputChan <- msg
				}
				return msg, nil
			}
			msg := "服务已启动"
			if outputChan != nil {
				outputChan <- msg
			}
			return msg, nil
		}
		if outputChan != nil {
			outputChan <- fmt.Sprintf("等待服务启动... (%d/30)", i)
		}
	}

	return "", fmt.Errorf("服务启动超时（30秒），请检查 openclaw 日志")
}

// StopServiceWithOutput 停止服务并实时输出
func StopServiceWithOutput(outputChan chan string) (string, error) {
	pids := service.GetPidsOnPort(service.ServicePort)
	if len(pids) == 0 {
		return "服务未在运行", nil
	}

	if outputChan != nil {
		outputChan <- "正在停止服务..."
	}

	// 优雅终止
	for _, pid := range pids {
		service.KillProcess(pid, false)
	}
	time.Sleep(2 * time.Second)

	// 检查是否已停止
	remaining := service.GetPidsOnPort(service.ServicePort)
	if len(remaining) == 0 {
		if outputChan != nil {
			outputChan <- "服务已停止"
		}
		return "服务已停止", nil
	}

	// 强制终止
	if outputChan != nil {
		outputChan <- "强制终止中..."
	}
	for _, pid := range remaining {
		service.KillProcess(pid, true)
	}
	time.Sleep(time.Second)

	stillRunning := service.GetPidsOnPort(service.ServicePort)
	if len(stillRunning) == 0 {
		if outputChan != nil {
			outputChan <- "服务已停止"
		}
		return "服务已停止", nil
	}

	return "", fmt.Errorf("无法停止服务，仍有进程: %v", stillRunning)
}

// RestartServiceWithOutput 重启服务并实时输出
func RestartServiceWithOutput(outputChan chan string) (string, error) {
	if outputChan != nil {
		outputChan <- "=== 正在重启服务 ==="
	}

	_, _ = StopServiceWithOutput(outputChan)
	time.Sleep(time.Second)
	return StartServiceWithOutput(outputChan)
}

// sendSSEEvent 发送 SSE 事件
func sendSSEEvent(c *gin.Context, event string, data string) {
	log.Printf("[SSE] event=%s data=%s", event, data)
	fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, data)
	c.Writer.Flush()
}

// escapeJSON 转义 JSON 字符串
func escapeJSON(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
