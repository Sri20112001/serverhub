package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/process"

	"serverhub/internal/audit"
	"serverhub/internal/serverinfo"
)

// GET /server-hub/api/processes/:pid — deep forensic inspection of a process
// (command line, executable path, working dir, user, threads, start time).
func (h *SystemHandler) ProcessDetail(c *gin.Context) {
	pidStr := c.Param("pid")
	pid, err := strconv.Atoi(pidStr)
	if err != nil || pid < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid PID"})
		return
	}

	detail, err := serverinfo.GetProcessDetail(int32(pid))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "process not found or has already terminated"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

// POST /server-hub/api/processes/:pid/kill — terminates a host process by PID.
// Protected system processes (PID 1, init, System, or ServerHub itself) are blocked.
// All termination requests are recorded in the immutable audit log.
func (h *SystemHandler) KillProcess(c *gin.Context) {
	u := c.GetString("user")
	pidStr := c.Param("pid")
	pid, err := strconv.Atoi(pidStr)
	if err != nil || pid < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid PID"})
		return
	}

	var req struct {
		Signal string `json:"signal"` // "SIGTERM" (default) or "SIGKILL"
	}
	_ = c.ShouldBindJSON(&req)
	force := strings.ToUpper(req.Signal) == "SIGKILL" || strings.ToUpper(req.Signal) == "KILL"

	// Fetch process name before termination for auditing
	procName := "unknown"
	if p, err := process.NewProcess(int32(pid)); err == nil {
		if n, err := p.Name(); err == nil && n != "" {
			procName = n
		}
	}

	sigName := "SIGTERM"
	if force {
		sigName = "SIGKILL"
	}

	if err := serverinfo.KillProcess(int32(pid), force); err != nil {
		audit.Write(h.DB, u, "kill-process", "process", strconv.Itoa(pid), "failed", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	audit.Write(h.DB, u, "kill-process", "process", strconv.Itoa(pid), "ok", fmt.Sprintf("%s (%s)", procName, sigName))

	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"message": fmt.Sprintf("Process %s (PID %d) terminated with %s", procName, pid, sigName),
	})
}
