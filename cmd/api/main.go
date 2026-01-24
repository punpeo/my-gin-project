package main

import (
	"go-gin/config"
	"go-gin/internal/service"
	"go-gin/pkg/logger"
	"go-gin/routes"
	"log"
)

func main() {
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("配置加载失败: ", err)
	}
	// 修复：调用无参数版本的 StartCleanupCronJob
	if err := service.StartCleanupCronJob(); err != nil {
		log.Printf("启动定时清理任务失败：%v", err)
	}
	r := routes.SetupRouter()

	addr := config.GlobalConfig.Server.Addr
	logger.Info("服务启动成功，监听地址: ", addr)
	if err := r.Run(addr); err != nil {
		logger.Fatal("服务启动失败: ", err)
	}
}
