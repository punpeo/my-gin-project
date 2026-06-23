package v1_service

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"
)

// Greet 打招呼的业务逻辑
// name：要打招呼的人名
// 返回拼接好的问候语
// 定义需要保留的文件后缀（Gin 项目常用）
var allowedExts = map[string]bool{
	".go":   true,
	".yaml": true,
	".yml":  true,
	".toml": true,
	".env":  true,
	".md":   true,
	".txt":  true,
	".html": true,
	".js":   true,
	".css":  true,
}

func Greet(name string) string {
	// 简单的业务逻辑：拼接问候语
	if name == "" {
		return "你好！陌生人 😊"
	}
	return "你好！" + name + " 😊"
}

// GetFilesNames 获取指定目录下符合后缀的所有文件路径
// 返回值：符合条件的文件路径列表
func GetFilesNames() []string {
	// 修正路径格式（Windows/Linux 通用，建议用 filepath.Join 更规范）
	root := filepath.Join("E:", "go-gin")
	// 定义切片用于收集符合条件的文件名
	var fileNames []string

	// 遍历目录
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// 跳过隐藏目录（比如 .git、.vscode）
		if d.IsDir() && strings.HasPrefix(filepath.Base(path), ".") {
			return fs.SkipDir
		}

		// 只处理文件，跳过目录（目录无需收集，只打印提示即可）
		if !d.IsDir() {
			ext := filepath.Ext(path)
			if allowedExts[ext] {
				// 将符合条件的文件路径添加到切片中
				fileNames = append(fileNames, path)
				// 可选：打印文件路径（方便调试）
				fmt.Printf("📄 %s\n", path)
			}
		} else {
			// 可选：打印目录（方便查看结构）
			fmt.Printf("📁 %s/\n", path)
		}
		return nil
	})

	if err != nil {
		fmt.Printf("遍历目录失败：%v\n", err)
		// 出错时返回空切片，而非 nil，避免调用方 panic
		return []string{}
	}

	// 返回收集到的文件名列表
	return fileNames
}
