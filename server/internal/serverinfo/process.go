package serverinfo

import (
	"errors"
	"os"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v3/process"
)

// DetailedProcess holds comprehensive forensic details about an OS process.
type DetailedProcess struct {
	Pid         int32   `json:"pid"`
	PPid        int32   `json:"ppid"`
	Name        string  `json:"name"`
	Cmdline     string  `json:"cmdline"`
	Exe         string  `json:"exe"`
	Cwd         string  `json:"cwd"`
	Username    string  `json:"username"`
	Status      string  `json:"status"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemMB       float64 `json:"memMB"`
	MemPct      float32 `json:"memPct"`
	CreateTime  int64   `json:"createTime"`
	NumThreads  int32   `json:"numThreads"`
	IsProtected bool    `json:"isProtected"`
}

// IsProtectedProcess returns true if terminating this PID would crash the OS
// or ServerHub itself.
func IsProtectedProcess(pid int32) bool {
	if pid <= 1 {
		return true
	}
	// ServerHub's own PID
	if pid == int32(os.Getpid()) {
		return true
	}
	// Windows System process (PID 4)
	if runtime.GOOS == "windows" && pid == 4 {
		return true
	}
	return false
}

// GetProcessDetail queries gopsutil for deep runtime metrics of a single process.
func GetProcessDetail(pid int32) (*DetailedProcess, error) {
	p, err := process.NewProcess(pid)
	if err != nil {
		return nil, err
	}

	name, _ := p.Name()
	cmdline, _ := p.Cmdline()
	exe, _ := p.Exe()
	cwd, _ := p.Cwd()
	username, _ := p.Username()
	ppid, _ := p.Ppid()
	threads, _ := p.NumThreads()
	createTime, _ := p.CreateTime()

	statuses, _ := p.Status()
	status := "other"
	if len(statuses) > 0 {
		status = procStatusLabel(statuses[0])
	}

	var memMB float64
	var memPct float32
	if mi, err := p.MemoryInfo(); err == nil && mi != nil {
		memMB = b2mb(mi.RSS)
	}
	if pct, err := p.MemoryPercent(); err == nil {
		memPct = pct
	}

	cpuPct, _ := p.CPUPercent()

	return &DetailedProcess{
		Pid:         pid,
		PPid:        ppid,
		Name:        name,
		Cmdline:     cmdline,
		Exe:         exe,
		Cwd:         cwd,
		Username:    username,
		Status:      status,
		CPUPercent:  cpuPct,
		MemMB:       memMB,
		MemPct:      memPct,
		CreateTime:  createTime,
		NumThreads:  threads,
		IsProtected: IsProtectedProcess(pid),
	}, nil
}

// KillProcess terminates a process by PID. If force is true, it issues a SIGKILL
// (or TerminateProcess on Windows). Otherwise it issues a graceful SIGTERM.
func KillProcess(pid int32, force bool) error {
	if IsProtectedProcess(pid) {
		return errors.New("refusing to terminate protected system process")
	}

	p, err := process.NewProcess(pid)
	if err != nil {
		return err
	}

	if force {
		return p.Kill()
	}

	// Try graceful termination; if Windows or unsupported, fallback to kill
	if err := p.Terminate(); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "not implemented") || runtime.GOOS == "windows" {
			return p.Kill()
		}
		return err
	}
	return nil
}
