package handlers

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/docker/docker/api/types/container"
	"github.com/gin-gonic/gin"
)

type ContainerFileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	ModTime string `json:"modTime"`
}

// GET /server-hub/api/containers/:id/files?path=/app
// Lists directories and files inside a running container.
func (h *ContainerHandler) ListFiles(c *gin.Context) {
	if !h.Docker.Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "docker unavailable"})
		return
	}

	id := c.Param("id")
	dirPath := path.Clean("/" + strings.TrimSpace(c.DefaultQuery("path", "/")))

	raw, err := h.Docker.Raw()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Check if path exists via ContainerStatPath
	stat, err := raw.ContainerStatPath(ctx, id, dirPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("path not found: %s", dirPath)})
		return
	}

	if !stat.Mode.IsDir() {
		// Single file stat
		c.JSON(http.StatusOK, gin.H{
			"path":  dirPath,
			"isDir": false,
			"stat": ContainerFileEntry{
				Name:    stat.Name,
				Path:    dirPath,
				IsDir:   false,
				Size:    stat.Size,
				Mode:    stat.Mode.String(),
				ModTime: stat.Mtime.Format(time.RFC3339),
			},
			"entries": []ContainerFileEntry{},
		})
		return
	}

	// Exec `ls -lap` to list directory contents
	cmd := fmt.Sprintf(`ls -lap -- "%s" 2>/dev/null || ls -la -- "%s"`, dirPath, dirPath)
	execResp, err := raw.ContainerExecCreate(ctx, id, container.ExecOptions{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"sh", "-c", cmd},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	attach, err := raw.ContainerExecAttach(ctx, execResp.ID, container.ExecAttachOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer attach.Close()

	buf := new(bytes.Buffer)
	_, _ = io.Copy(buf, attach.Reader)

	entries := parseLsOutput(buf.String(), dirPath)
	sort.Slice(entries, func(i, j int) bool {
		// Directories first, then alphabetical
		if entries[i].IsDir != entries[j].IsDir {
			return entries[i].IsDir
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})

	c.JSON(http.StatusOK, gin.H{
		"path":    dirPath,
		"isDir":   true,
		"entries": entries,
	})
}

// GET /server-hub/api/containers/:id/files/read?path=/app/package.json
// Reads up to 2MB of a single file from the container.
func (h *ContainerHandler) ReadFile(c *gin.Context) {
	if !h.Docker.Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "docker unavailable"})
		return
	}

	id := c.Param("id")
	filePath := path.Clean("/" + strings.TrimSpace(c.DefaultQuery("path", "")))
	if filePath == "/" || filePath == "." {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file path"})
		return
	}

	raw, err := h.Docker.Raw()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tarStream, _, err := raw.CopyFromContainer(ctx, id, filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	defer tarStream.Close()

	tr := tar.NewReader(tarStream)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if header.Typeflag == tar.TypeReg || header.Typeflag == tar.TypeRegA {
			const maxLimit = int64(2 * 1024 * 1024) // 2MB
			buf := new(bytes.Buffer)
			n, _ := io.CopyN(buf, tr, maxLimit)
			data := buf.Bytes()
			isText := utf8.Valid(data)

			c.JSON(http.StatusOK, gin.H{
				"name":      path.Base(filePath),
				"path":      filePath,
				"size":      header.Size,
				"bytesRead": n,
				"truncated": header.Size > maxLimit,
				"isText":    isText,
				"content":   string(data),
				"modTime":   header.ModTime.Format(time.RFC3339),
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "file not found in archive"})
}

func parseLsOutput(output, parentDir string) []ContainerFileEntry {
	lines := strings.Split(output, "\n")
	var entries []ContainerFileEntry

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "total ") {
			continue
		}

		fields := strings.Fields(trimmed)
		if len(fields) < 9 {
			continue
		}

		mode := fields[0]
		isDir := strings.HasPrefix(mode, "d")
		size, _ := strconv.ParseInt(fields[4], 10, 64)
		modTime := fmt.Sprintf("%s %s %s", fields[5], fields[6], fields[7])
		name := strings.Join(fields[8:], " ")

		// Trim trailing slash added by -p
		name = strings.TrimSuffix(name, "/")

		// Ignore . and ..
		if name == "." || name == ".." || name == "" {
			continue
		}

		entries = append(entries, ContainerFileEntry{
			Name:    name,
			Path:    path.Join(parentDir, name),
			IsDir:   isDir,
			Size:    size,
			Mode:    mode,
			ModTime: modTime,
		})
	}

	return entries
}
