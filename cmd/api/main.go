package main

import (
	"go-gin/config"
	"go-gin/internal/model"                 // 新增：导入模型包，用于表结构自动迁移
	v1_service "go-gin/internal/service/v1" // 业务服务层：定时任务所属包
	"go-gin/pkg/db"
	"go-gin/pkg/logger" // 项目日志组件（统一替换原生log）
	"go-gin/routes"
)

func main() {
	// 步骤1：加载全局配置（所有组件的配置基础，最先执行）
	if err := config.LoadConfig(); err != nil {
		// 此时日志未初始化，只能用原生log应急（仅这一处）
		logger.Info("配置加载失败: %v", err)
	}

	// 步骤2：初始化日志组件（所有后续操作的日志基础，仅次于配置）
	logger.InitLogger(config.GlobalConfig.Log.Level)
	logger.Info("全局配置加载完成，日志组件初始化成功")

	// 步骤3：初始化商品数据库（依赖配置+日志，定时任务/业务的DB基础）
	dbConfig := config.GlobalConfig.ProductDB
	logger.Infof("开始初始化商品数据库，DSN: %s", dbConfig.DSN)
	if err := db.Init(dbConfig); err != nil {
		logger.Fatalf("商品数据库初始化失败: %v", err)
	}
	// 注册数据库连接优雅关闭（main函数退出时执行，释放资源）
	defer func() {
		if err := db.Close(); err != nil {
			logger.Errorf("关闭数据库连接失败: %v", err)
		} else {
			logger.Info("数据库连接已安全关闭")
		}
	}()
	logger.Info("商品数据库初始化成功")

	// 步骤4：GORM模型自动迁移（关键！同步model.ProductInfo的新增字段到数据库）
	gormDB := db.GetDB()
	if err := gormDB.AutoMigrate(&model.ProductInfo{}); err != nil {
		logger.Fatalf("商品表product_info结构迁移失败: %v", err)
	}
	logger.Info("商品表product_info结构迁移成功（已同步创建/更新时间字段）")

	// 步骤5：测试数据库连接（验证DB可用，失败则终止服务，避免带病启动）
	if err := db.TestConnection(); err != nil {
		logger.Fatalf("数据库连接测试失败，服务终止: %v", err)
	}
	logger.Info("数据库连接测试成功，数据库可用")

	// 步骤6：启动定时清理任务（依赖数据库初始化完成，避免DB nil panic）
	if err := v1_service.StartCleanupCronJob(); err != nil {
		logger.Warnf("启动定时清理任务失败：%v", err)
	} else {
		logger.Info("定时清理任务启动成功")
	}

	// 步骤7：初始化Gin路由（无强依赖，可在最后阶段初始化）
	r := routes.SetupRouter()
	logger.Info("Gin路由初始化完成")

	// 步骤8：启动Gin服务，开始监听请求
	addr := config.GlobalConfig.Server.Addr
	logger.Infof("服务即将启动，监听地址: %s", addr)
	if err := r.Run(addr); err != nil {
		logger.Fatalf("服务启动失败: %v", err)
	}
}
