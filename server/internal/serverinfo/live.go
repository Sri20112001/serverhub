package serverinfo

import (
	"math"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// Live is an instant host reading for the telemetry page's live mode. It stays
// cheap enough to poll every few seconds — unlike GetDetail, which walks every
// process — and mirrors the snapshot schema so the client can feed the same
// gauges from either source.
//
// Network and disk fields are cumulative counters, exactly like the history
// endpoint: the client derives per-second rates from consecutive readings.
type Live struct {
	Ts             int64   `json:"ts"`
	CPUPercent     float64 `json:"cpuPercent"`
	MemUsedMB      float64 `json:"memUsedMB"`
	MemTotalMB     float64 `json:"memTotalMB"`
	MemPercent     float64 `json:"memPercent"`
	DiskUsedGB     float64 `json:"diskUsedGB"`
	DiskTotalGB    float64 `json:"diskTotalGB"`
	DiskPercent    float64 `json:"diskPercent"`
	NetRxBytes     uint64  `json:"netRxBytes"`
	NetTxBytes     uint64  `json:"netTxBytes"`
	DiskReadBytes  uint64  `json:"diskReadBytes"`
	DiskWriteBytes uint64  `json:"diskWriteBytes"`
}

var (
	cpuSamplerOnce sync.Once
	// cpuBusyBits holds the latest busy percentage as float64 bits. NaN until
	// the first two-second interval has elapsed.
	cpuBusyBits atomic.Uint64
)

// StartCPUSampler keeps a rolling two-second CPU average in memory for live
// mode. It derives the percentage from cpu.Times deltas rather than calling
// cpu.Percent, because cpu.Percent keeps global last-call state that the 60s
// snapshot loop also uses — two callers would corrupt each other's deltas.
func StartCPUSampler() {
	cpuSamplerOnce.Do(func() {
		cpuBusyBits.Store(math.Float64bits(math.NaN()))
		go func() {
			prev, _ := cpu.Times(false)
			ticker := time.NewTicker(2 * time.Second)
			defer ticker.Stop()
			for range ticker.C {
				cur, err := cpu.Times(false)
				if err != nil || len(cur) == 0 || len(prev) == 0 {
					continue
				}
				// iowait counts as idle for a utilisation reading.
				idle := (cur[0].Idle - prev[0].Idle) + (cur[0].Iowait - prev[0].Iowait)
				total := cur[0].Total() - prev[0].Total()
				if total > 0 {
					busy := 100 * (total - idle) / total
					cpuBusyBits.Store(math.Float64bits(math.Max(0, math.Min(100, busy))))
				}
				prev = cur
			}
		}()
	})
}

// GetLive samples the host once. Missing metrics degrade to zero, matching the
// rest of the package.
func GetLive() Live {
	l := Live{Ts: time.Now().Unix()}
	if bits := cpuBusyBits.Load(); bits != 0 {
		if pct := math.Float64frombits(bits); !math.IsNaN(pct) {
			l.CPUPercent = pct
		}
	}
	if m, err := mem.VirtualMemory(); err == nil {
		l.MemUsedMB = b2mb(m.Used)
		l.MemTotalMB = b2mb(m.Total)
		l.MemPercent = m.UsedPercent
	}
	rootPath := "/"
	if d, err := disk.Usage(rootPath); err == nil {
		l.DiskUsedGB = b2gb(d.Used)
		l.DiskTotalGB = b2gb(d.Total)
		l.DiskPercent = d.UsedPercent
	} else {
		// Fallback for Windows or systems where "/" is not a valid mount
		if dWin, errWin := disk.Usage("C:"); errWin == nil {
			l.DiskUsedGB = b2gb(dWin.Used)
			l.DiskTotalGB = b2gb(dWin.Total)
			l.DiskPercent = dWin.UsedPercent
		}
	}
	if counters, err := net.IOCounters(false); err == nil {
		for _, c := range counters {
			if c.Name == "lo" || strings.HasPrefix(c.Name, "Loopback") {
				continue
			}
			l.NetRxBytes += c.BytesRecv
			l.NetTxBytes += c.BytesSent
		}
	}
	if ioCounters, err := disk.IOCounters(); err == nil {
		for name, c := range ioCounters {
			if strings.HasPrefix(name, "loop") {
				continue
			}
			l.DiskReadBytes += c.ReadBytes
			l.DiskWriteBytes += c.WriteBytes
		}
	}
	return l
}
