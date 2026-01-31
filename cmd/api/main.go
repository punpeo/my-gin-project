package main

import (
	"go-gin/config"
	"go-gin/internal/service" // 新增：数据库初始化包
	"go-gin/pkg/logger"       // 项目日志组件（统一替换原生log）
	"go-gin/routes"
)

func main() {
	if err := config.LoadConfig(); err != nil {
		logger.Fatalf("配置加载失败: %v", err)
	}

	logger.InitLogger(config.GlobalConfig.Log.Level)

	if err := service.StartCleanupCronJob(); err != nil {
		logger.Warnf("启动定时清理任务失败：%v", err)
	}

	r := routes.SetupRouter()

	addr := config.GlobalConfig.Server.Addr
	logger.Infof("服务启动成功，监听地址: %s", addr)
	if err := r.Run(addr); err != nil {
		logger.Fatalf("服务启动失败: %v", err)
	}
}
