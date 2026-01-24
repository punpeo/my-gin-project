package routes

import (
	"go-gin/internal/handler"
	"go-gin/internal/middleware"
	"go-gin/pkg/response"

	"time"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.New()

	// 设置可信代理（解决警告）
	r.SetTrustedProxies([]string{"127.0.0.1"})

	// 基础中间件
	r.Use(middleware.LoggerMiddleware()) // 自定义日志
	r.Use(gin.Recovery())                // 异常恢复

	// 配置静态文件访问
	r.Static("/static", "./static")
	// 新的根路径路由：直接返回index.html，无需重定向
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	// 健康检查路由
	r.GET("/health", func(c *gin.Context) {
		response.Success(c, gin.H{
			"status":  "ok",
			"message": "服务运行正常",
			"time":    time.Now().Format("2006-01-02 15:04:05"),
		})
	})

	// 业务接口路由组
	v1 := r.Group("/api/v1")
	{
		// 打招呼接口
		v1.GET("/greet", handler.GreetHandler)
		v1.POST("/greet", handler.GreetPostHandler)
		v1.GET("/files/names", handler.GetFilesNamesHandler)

		// 库存统计接口
		v1.POST("/stock/statistic", handler.StockStatisticHandler)
		// 库存删除日期列
		v1.POST("/stock/delete-date-column", handler.DeleteDateColumnHandler)
		// 新增：单独的库存文件下载接口
		v1.GET("/stock/download", handler.StockFileDownloadHandler)
		// 新增：清理文件接口
		v1.POST("/stock/cleanup", handler.CleanupFileHandler)

		// 订单汇总接口（新增）
		v1.GET("/order/download-template", handler.DownloadOrderTemplate)
		v1.POST("/order/upload-process", handler.UploadAndProcessOrderExcel)
		// 新增：店铺订单统计接口
		v1.POST("/shop-order/statistic", handler.StatShopOrder)
		// 新增：产品周期销量统计接口
		v1.POST("/cycle-sales/statistic", handler.CycleSalesStatisticHandler)

		// ✅ 修正：挂载Excel处理接口（函数式）
		v1.POST("/excel/process", handler.NewExcelHandler().ProcessExcel)
		// ✅ 新增：挂载Excel填充接口（方法式）
		excelFillHandler := handler.NewExcelFillHandler()
		v1.POST("/excel/fill", excelFillHandler.FillExcel)
	}
	// 404处理
	r.NoRoute(func(c *gin.Context) {
		response.Fail(c, 404, "接口不存在")
	})

	return r
}
