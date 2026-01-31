package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

var GlobalConfig *AppConfig

type AppConfig struct {
	Server       ServerConfig       `yaml:"server"`
	StockCleanup StockCleanupConfig `yaml:"stock_cleanup"`
	Log          LogConfig          `yaml:"log"`
	ProductDB    ProductDBConfig    `yaml:"product_db"`
}

type ProductDBConfig struct {
	DSN             string `yaml:"dsn"`
	LogLevel        int    `yaml:"log_level"`
	MaxIdleConns    int    `yaml:"max_idle_conns"`
	MaxOpenConns    int    `yaml:"max_open_conns"`
	ConnMaxLifetime int    `yaml:"conn_max_lifetime"`
}
type ServerConfig struct {
	Addr string `yaml:"addr"`
}

type StockCleanupConfig struct {
	Enable         bool   `yaml:"enable"`
	CronExpression string `yaml:"cron_expression"`
	BasePath       string `yaml:"base_path"`
	BaseFileName   string `yaml:"base_file_name"`
}

type LogConfig struct {
	Level string `yaml:"level"`
}

func LoadConfig() error {
	content, err := os.ReadFile("./config/app.yaml")
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %v", err)
	}

	var appConfig AppConfig
	if err := yaml.Unmarshal(content, &appConfig); err != nil {
		return fmt.Errorf("解析 YAML 失败: %v", err)
	}

	GlobalConfig = &appConfig

	if GlobalConfig.StockCleanup.CronExpression == "" {
		return fmt.Errorf("stock_cleanup.cron_expression 不能为空")
	}
	if GlobalConfig.StockCleanup.BasePath == "" {
		return fmt.Errorf("stock_cleanup.base_path 不能为空")
	}
	if GlobalConfig.Server.Addr == "" {
		GlobalConfig.Server.Addr = ":8080"
	}
	if GlobalConfig.Log.Level == "" {
		GlobalConfig.Log.Level = "info"
	}

	return nil
}
