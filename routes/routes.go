package routes

import (
	"go-gin/internal/handler"
	"go-gin/internal/handler/db_handler"
	"go-gin/internal/middleware"
	"go-gin/pkg/response"
	"time"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.New()

	r.SetTrustedProxies([]string{"127.0.0.1"})

	r.Use(middleware.LoggerMiddleware())
	r.Use(gin.Recovery())

	r.Static("/static", "./static")
	r.GET("/", func(c *gin.Context) {
		c.File("./static/index.html")
	})

	r.GET("/health", func(c *gin.Context) {
		response.Success(c, gin.H{
			"status":  "ok",
			"message": "服务运行正常",
			"time":    time.Now().Format("2006-01-02 15:04:05"),
		})
	})

	// 业务主路由组 v1
	v1 := r.Group("/api/v1")
	{
		// 基础通用接口子分组
		base := v1.Group("/base")
		{
			base.GET("/greet", handler.GreetHandler)
			base.POST("/greet", handler.GreetPostHandler)
			base.GET("/files/names", handler.GetFilesNamesHandler)
		}

		// 库存管理接口子分组
		stock := v1.Group("/stock")
		{
			stock.POST("/statistic", handler.StockStatisticHandler)
			stock.POST("/delete-date-column", handler.DeleteDateColumnHandler)
			stock.GET("/download", handler.StockFileDownloadHandler)
			stock.POST("/cleanup", handler.CleanupFileHandler)
		}

		// 订单管理接口子分组
		order := v1.Group("/order")
		{
			order.GET("/download-template", handler.DownloadOrderTemplate)
			order.POST("/upload-process", handler.UploadAndProcessOrderExcel)
		}

		// 店铺订单管理接口子分组
		shopOrder := v1.Group("/shop-order")
		{
			shopOrder.POST("/statistic-by-path", handler.StatShopOrderByPath)
			shopOrder.POST("/statistic-by-upload", handler.StatShopOrderByUpload)
		}

		// 周期销量统计接口子分组
		cycleSales := v1.Group("/cycle-sales")
		{
			cycleSales.POST("/statistic", handler.CycleSalesStatisticHandler)
		}

		// Excel处理通用接口子分组
		excel := v1.Group("/excel")
		{
			excel.POST("/process", handler.NewExcelHandler().ProcessExcel)
			excel.POST("/fill", handler.NewExcelFillHandler().FillExcel)
		}
	}

	// 商品数据库接口路由组 v2（原有结构保留，内部无需拆分）
	v2 := r.Group("/api/v2")
	{
		v2.GET("/barcode/:barcode", db_handler.ProductHandler.GetByBarCode)
		v2.GET("/product/shop/:shop", db_handler.ProductHandler.ListByShop)
		v2.GET("/product/all", db_handler.ProductHandler.ListAll)
		v2.POST("/product/import", db_handler.ProductHandler.BatchImport)
	}

	// 404统一处理
	r.NoRoute(func(c *gin.Context) {
		response.Fail(c, 404, "接口不存在")
	})

	return r
}
