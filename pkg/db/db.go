package db

import (
	"fmt"
	"os"
	"path/filepath"

	"go-gin/pkg/logger"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
	_ "modernc.org/sqlite" // 纯Go SQLite驱动，必须导入
)

var GormDB *gorm.DB

func Init() {
	dataDir := "./data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		logger.Fatalf("创建data目录失败：%v", err)
	}

	dbPath := filepath.Join(dataDir, "product.db")
	logger.Infof("SQLite数据库文件路径：%s", dbPath)

	// 显式使用 modernc.org/sqlite 的 URI 格式，强制 GORM 使用该纯Go驱动
	dsn := fmt.Sprintf("file:%s?cache=shared&mode=rwc", dbPath)
	var err error
	GormDB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Info),
	})
	if err != nil {
		logger.Fatalf("SQLite数据库连接失败：%v", err)
	}

	logger.Infof("SQLite数据库初始化成功，文件存储于：%s", dbPath)
}

func GetDB() *gorm.DB {
	if GormDB == nil {
		logger.Fatalf("数据库未初始化，请先调用db.Init()方法")
	}
	return GormDB
}
