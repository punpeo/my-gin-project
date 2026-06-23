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
	SalesExport  SalesExportConfig  `yaml:"sales_export"`
	ExcelMerge   ExcelMergeConfig   `yaml:"excel_merge"`
}

type ExcelMergeConfig struct {
	SourceDir string `yaml:"source_dir"` // 源文件目录 E:\V4\excel_merge\data
	OutputDir string `yaml:"output_dir"` // 结果输出目录 E:\V4\excel_merge\output_data
}

type SalesExportConfig struct {
	SourceDir string `yaml:"source_dir"`
	Template  string `yaml:"template"`
	OutputDir string `yaml:"output_dir"`
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

	// stock_cleanup 校验
	if GlobalConfig.StockCleanup.CronExpression == "" {
		return fmt.Errorf("stock_cleanup.cron_expression 不能为空")
	}
	if GlobalConfig.StockCleanup.BasePath == "" {
		return fmt.Errorf("stock_cleanup.base_path 不能为空")
	}

	// sales_export 校验
	if GlobalConfig.SalesExport.SourceDir == "" {
		return fmt.Errorf("sales_export.source_dir 数据源目录不能为空")
	}
	if GlobalConfig.SalesExport.Template == "" {
		return fmt.Errorf("sales_export.template 模板文件名不能为空")
	}
	if GlobalConfig.SalesExport.OutputDir == "" {
		return fmt.Errorf("sales_export.output_dir 结果输出目录不能为空")
	}

	// excel_merge 目录必填校验
	if GlobalConfig.ExcelMerge.SourceDir == "" {
		return fmt.Errorf("excel_merge.source_dir 源文件目录不能为空")
	}
	if GlobalConfig.ExcelMerge.OutputDir == "" {
		return fmt.Errorf("excel_merge.output_dir 输出目录不能为空")
	}

	// 默认值
	if GlobalConfig.Server.Addr == "" {
		GlobalConfig.Server.Addr = ":8080"
	}
	if GlobalConfig.Log.Level == "" {
		GlobalConfig.Log.Level = "info"
	}

	return nil
}
