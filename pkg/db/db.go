package db

import (
	"fmt"
	"go-gin/config"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/glebarez/sqlite" // 纯Go SQLite驱动
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB 全局数据库实例
var (
	globalDB  *gorm.DB
	dbOnce    sync.Once
	dbInitErr error
)

// Init 初始化数据库连接
func Init(cfg config.ProductDBConfig) error {
	dbOnce.Do(func() {
		// 创建数据库目录（如果不存在）
		if err := createDBDir(cfg.DSN); err != nil {
			dbInitErr = fmt.Errorf("创建数据库目录失败: %v", err)
			return
		}

		// 配置 GORM 日志器
		gormLogger := logger.New(
			log.New(os.Stdout, "\r\n", log.LstdFlags),
			logger.Config{
				SlowThreshold:             time.Second,
				LogLevel:                  logger.LogLevel(cfg.LogLevel),
				IgnoreRecordNotFoundError: true,
				Colorful:                  true,
			},
		)

		// 使用纯 Go 的 SQLite 驱动
		// 注意: 这里使用的是 gorm.io/driver/sqlite，它支持 modernc.org/sqlite 纯 Go 驱动
		db, err := gorm.Open(sqlite.Open(cfg.DSN), &gorm.Config{
			Logger: gormLogger,
		})
		if err != nil {
			dbInitErr = fmt.Errorf("连接数据库失败: %v", err)
			return
		}

		// 获取底层 SQL DB 连接以配置连接池
		sqlDB, err := db.DB()
		if err != nil {
			dbInitErr = fmt.Errorf("获取数据库连接失败: %v", err)
			return
		}

		// 配置连接池
		sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
		sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
		sqlDB.SetConnMaxLifetime(time.Duration(cfg.ConnMaxLifetime) * time.Second)

		// 测试连接
		if err := sqlDB.Ping(); err != nil {
			dbInitErr = fmt.Errorf("数据库连接测试失败: %v", err)
			return
		}

		globalDB = db
		log.Printf("数据库初始化成功: %s", cfg.DSN)
	})

	return dbInitErr
}

// GetDB 获取全局数据库实例
// 注意: 调用此函数前必须确保已调用 Init()
func GetDB() *gorm.DB {
	if globalDB == nil {
		panic("数据库未初始化，请先调用 db.Init()")
	}
	return globalDB
}

// Close 关闭数据库连接
func Close() error {
	if globalDB == nil {
		return nil
	}

	sqlDB, err := globalDB.DB()
	if err != nil {
		return err
	}

	return sqlDB.Close()
}

// createDBDir 创建数据库文件所在目录
func createDBDir(dsn string) error {
	// 解析数据库文件路径
	dir := filepath.Dir(dsn)
	if dir == "." {
		return nil // 当前目录，不需要创建
	}

	// 创建目录（包括父目录）
	return os.MkdirAll(dir, 0755)
}

// IsInitialized 检查数据库是否已初始化
func IsInitialized() bool {
	return globalDB != nil
}

// TestConnection 测试数据库连接
func TestConnection() error {
	if globalDB == nil {
		return fmt.Errorf("数据库未初始化")
	}

	sqlDB, err := globalDB.DB()
	if err != nil {
		return err
	}

	return sqlDB.Ping()
}
