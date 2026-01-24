package middleware

import (
	"go-gin/pkg/logger"
	"time"

	"github.com/gin-gonic/gin"
)

// LoggerMiddleware 自定义请求日志中间件
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 开始时间
		startTime := time.Now()

		// 处理请求
		c.Next()

		// 结束时间
		endTime := time.Now()
		latencyTime := endTime.Sub(startTime)

		// 请求信息
		reqMethod := c.Request.Method
		reqUri := c.Request.RequestURI
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()

		// 记录日志
		logger.Info(
			"| ", statusCode, " | ", latencyTime, " | ", clientIP,
			" | ", reqMethod, " | ", reqUri, " |",
		)
	}
}
