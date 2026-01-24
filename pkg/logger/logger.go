package logger

import (
	"github.com/sirupsen/logrus"
)

var log = logrus.New()

// 简化初始化（空实现）
func InitLogger(level string) {
	// 可根据需要设置日志级别，如：
	// lvl, _ := logrus.ParseLevel(level)
	// log.SetLevel(lvl)
}

// 封装日志方法（无格式化）
func Debug(args ...interface{}) { log.Debug(args...) }
func Info(args ...interface{})  { log.Info(args...) }
func Warn(args ...interface{})  { log.Warn(args...) }
func Error(args ...interface{}) { log.Error(args...) }
func Fatal(args ...interface{}) { log.Fatal(args...) }

// 封装日志方法（带格式化）
func Debugf(format string, args ...interface{}) { log.Debugf(format, args...) }
func Infof(format string, args ...interface{})  { log.Infof(format, args...) }
func Warnf(format string, args ...interface{})  { log.Warnf(format, args...) }
func Errorf(format string, args ...interface{}) { log.Errorf(format, args...) }
func Fatalf(format string, args ...interface{}) { log.Fatalf(format, args...) }
