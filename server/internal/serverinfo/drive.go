package serverinfo

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Drive kinds attached to filesystem and disk-I/O rows so the UI can show
// whether a volume lives on NVMe, SATA flash or a spinning disk.
const (
	DriveNVMe = "nvme"
	DriveSSD  = "ssd"
	DriveHDD  = "hdd"
)

var (
	winDriveCache     map[string]string
	winDriveCacheOnce sync.Once
)

type winPhysDisk struct {
	DeviceId     string `json:"DeviceId"`
	FriendlyName string `json:"FriendlyName"`
	MediaType    int    `json:"MediaType"` // 3 = HDD, 4 = SSD
	BusType      int    `json:"BusType"`   // 17 = NVMe, 11 = SATA
}

type winPartition struct {
	DriveLetter string `json:"DriveLetter"`
	DiskNumber  int    `json:"DiskNumber"`
}

func initWindowsDrives() map[string]string {
	result := make(map[string]string)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-Command",
		`Get-CimInstance -ClassName MSFT_PhysicalDisk -Namespace Root\Microsoft\Windows\Storage | Select-Object DeviceId, FriendlyName, MediaType, BusType | ConvertTo-Json -Compress; `+
			`Get-Partition | Where-Object DriveLetter | Select-Object DriveLetter, DiskNumber | ConvertTo-Json -Compress`)
	out, err := cmd.Output()
	if err != nil {
		return result
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	diskKinds := make(map[int]string)

	if len(lines) >= 1 && strings.HasPrefix(strings.TrimSpace(lines[0]), "[") || strings.HasPrefix(strings.TrimSpace(lines[0]), "{") {
		var disks []winPhysDisk
		first := strings.TrimSpace(lines[0])
		if strings.HasPrefix(first, "{") {
			var single winPhysDisk
			if json.Unmarshal([]byte(first), &single) == nil {
				disks = append(disks, single)
			}
		} else {
			_ = json.Unmarshal([]byte(first), &disks)
		}

		for _, d := range disks {
			kind := DriveSSD
			nameLower := strings.ToLower(d.FriendlyName)
			if d.BusType == 17 || strings.Contains(nameLower, "nvme") {
				kind = DriveNVMe
			} else if d.MediaType == 3 || strings.Contains(nameLower, "hdd") {
				kind = DriveHDD
			}
			if id, err := strconv.Atoi(d.DeviceId); err == nil {
				diskKinds[id] = kind
				result[strconv.Itoa(id)] = kind
				result["PhysicalDrive"+strconv.Itoa(id)] = kind
			}
		}
	}

	if len(lines) >= 2 {
		var parts []winPartition
		second := strings.TrimSpace(lines[1])
		if strings.HasPrefix(second, "{") {
			var single winPartition
			if json.Unmarshal([]byte(second), &single) == nil {
				parts = append(parts, single)
			}
		} else {
			_ = json.Unmarshal([]byte(second), &parts)
		}

		for _, p := range parts {
			if p.DriveLetter != "" {
				driveUpper := strings.ToUpper(p.DriveLetter) + ":"
				if k, ok := diskKinds[p.DiskNumber]; ok {
					result[driveUpper] = k
				}
			}
		}
	}

	return result
}

func windowsDriveKind(dev string) string {
	if runtime.GOOS != "windows" {
		return ""
	}
	winDriveCacheOnce.Do(func() {
		winDriveCache = initWindowsDrives()
	})
	clean := strings.ToUpper(strings.TrimRight(strings.TrimSpace(dev), "\\/"))
	if len(clean) >= 2 && clean[1] == ':' {
		clean = clean[:2]
	}
	if k, ok := winDriveCache[clean]; ok && k != "" {
		return k
	}
	for k, v := range winDriveCache {
		if strings.EqualFold(k, dev) {
			return v
		}
	}
	return ""
}

// driveKind classifies a device path such as "/dev/nvme0n1p2", "sda1", "C:",
// "/dev/mapper/vg-root" or "dm-0".
func driveKind(device string) string {
	name := strings.TrimPrefix(strings.TrimSpace(device), "/dev/")
	if name == "" {
		return ""
	}
	if runtime.GOOS == "windows" {
		if k := windowsDriveKind(device); k != "" {
			return k
		}
	}
	lower := strings.ToLower(name)
	if strings.Contains(lower, "nvme") {
		return DriveNVMe
	}
	if strings.Contains(lower, "ssd") {
		return DriveSSD
	}
	if strings.HasPrefix(name, "mapper/") {
		return mapperKind(strings.TrimPrefix(name, "mapper/"))
	}
	for _, cand := range driveCandidates(name) {
		if k := sysfsKind(cand, 0); k != "" {
			return k
		}
	}
	return ""
}

// driveCandidates returns the device name and then its de-partitioned parent,
// because partitions ("nvme0n1p3", "sda1") have no queue directory of their
// own while their parent devices do.
func driveCandidates(name string) []string {
	out := []string{name}
	if parent := trimPartition(name); parent != name {
		out = append(out, parent)
	}
	return out
}

// trimPartition strips a trailing partition suffix: nvme0n1p3 → nvme0n1,
// sda1 → sda, xvda3 → xvda. Whole-disk names (sda) and pseudo devices (md0,
// dm-0) are returned unchanged.
func trimPartition(name string) string {
	if strings.HasPrefix(name, "nvme") || strings.HasPrefix(name, "mmcblk") {
		if i := strings.LastIndex(name, "p"); i > 0 && isDigits(name[i+1:]) {
			return name[:i]
		}
		return name
	}
	trimmed := strings.TrimRight(name, "0123456789")
	if trimmed == "" || trimmed == name {
		return name
	}
	// Only sd*/vd*/xvd* style names carry a numeric partition suffix; md0 and
	// dm-0 are full device names that merely end in a digit.
	if last := trimmed[len(trimmed)-1]; last < 'a' || last > 'z' {
		return name
	}
	return trimmed
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// sysfsKind reads <dev>/queue/rotational (0 = flash, 1 = spinning) and follows
// one level of device-mapper slaves so an LVM or LUKS root reports the
// physical drive underneath it.
func sysfsKind(name string, depth int) string {
	if name == "" || depth > 2 {
		return ""
	}
	base := filepath.Join("/sys/block", name)
	if b, err := os.ReadFile(filepath.Join(base, "queue", "rotational")); err == nil {
		switch strings.TrimSpace(string(b)) {
		case "0":
			if strings.HasPrefix(name, "nvme") {
				return DriveNVMe
			}
			return DriveSSD
		case "1":
			return DriveHDD
		}
	}
	if entries, err := os.ReadDir(filepath.Join(base, "slaves")); err == nil {
		for _, e := range entries {
			if k := sysfsKind(e.Name(), depth+1); k != "" {
				return k
			}
		}
	}
	return ""
}

// mapperKind resolves "/dev/mapper/<name>" by matching the LVM name against
// /sys/block/dm-N/dm/name, then classifying the dm device and its slaves.
func mapperKind(alias string) string {
	if alias == "" {
		return ""
	}
	// LVM doubles literal dashes in sysfs (vg-root is stored as vg--root).
	escaped := strings.ReplaceAll(alias, "-", "--")
	entries, err := os.ReadDir("/sys/block")
	if err != nil {
		return ""
	}
	for _, e := range entries {
		if !strings.HasPrefix(e.Name(), "dm-") {
			continue
		}
		b, err := os.ReadFile(filepath.Join("/sys/block", e.Name(), "dm", "name"))
		if err != nil {
			continue
		}
		if name := strings.TrimSpace(string(b)); name == alias || name == escaped {
			return sysfsKind(e.Name(), 0)
		}
	}
	return ""
}
