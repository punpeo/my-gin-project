package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// ========== 关键修改：从 AppConfig 改为 *AppConfig（指针类型） ==========
var GlobalConfig *AppConfig // ✅ 指针类型，支持 == nil 比较

// AppConfig 应用总配置结构体
type AppConfig struct {
	Server       ServerConfig       `yaml:"server"`        // 新增：服务器配置
	StockCleanup StockCleanupConfig `yaml:"stock_cleanup"` // 库存清理配置
}

// ServerConfig 服务器配置（补充，匹配你的 main.go 中的 addr）
type ServerConfig struct {
	Addr string `yaml:"addr"` // 服务监听地址，如 ":8080"
}

// StockCleanupConfig 库存清理定时任务配置
type StockCleanupConfig struct {
	Enable         bool   `yaml:"enable"`          // 是否启用定时清理任务
	CronExpression string `yaml:"cron_expression"` // cron 表达式
	BasePath       string `yaml:"base_path"`       // 默认清理目录
	BaseFileName   string `yaml:"base_file_name"`  // 基准文件名
}

// LoadConfig 加载配置文件（保持不变，注意返回的是指针）
func LoadConfig() error {
	// 读取配置文件（建议指定配置文件路径，比如 "./config/app.yaml"）
	content, err := os.ReadFile("./config/app.yaml")
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %v", err)
	}

	// 解析 YAML 到结构体（注意用 & 取地址，赋值给指针）
	var appConfig AppConfig
	if err := yaml.Unmarshal(content, &appConfig); err != nil {
		return fmt.Errorf("解析 YAML 失败: %v", err)
	}

	// 赋值给全局指针变量
	GlobalConfig = &appConfig // ✅ 将值类型的地址赋值给指针

	// 校验关键配置
	if GlobalConfig.StockCleanup.CronExpression == "" {
		return fmt.Errorf("stock_cleanup.cron_expression 不能为空")
	}
	if GlobalConfig.StockCleanup.BasePath == "" {
		return fmt.Errorf("stock_cleanup.base_path 不能为空")
	}
	if GlobalConfig.Server.Addr == "" {
		GlobalConfig.Server.Addr = ":8080" // 兜底默认端口
	}

	return nil
}
