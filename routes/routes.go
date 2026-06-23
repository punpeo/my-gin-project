package routes

import (
	"go-gin/internal/handler/db_handler"
	v1_handler "go-gin/internal/handler/v1"
	v3_handler "go-gin/internal/handler/v3"
	v4_handler "go-gin/internal/handler/v4"

	"go-gin/internal/middleware"
	"go-gin/pkg/response"
	"time"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.New()

	// 关键调整1：取消TrustedProxies的本地限制（适配Cloudflare Tunnel代理）
	// 原配置只信任127.0.0.1，会导致Cloudflare的请求被判定为非信任来源
	r.SetTrustedProxies(nil)

	r.Use(middleware.LoggerMiddleware())
	r.Use(gin.Recovery())

	// 关键调整2：增强静态资源路由（允许访问static下的所有文件，包括子目录）
	// 原配置仅r.Static("/static", "./static")，补充StaticFS确保子目录可访问
	//	r.Static("/static", "./static")
	r.StaticFS("/static", gin.Dir("./static", true)) // 允许列出static目录下的文件（调试用）

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

	// 业务主路由组 v1（无需修改）
	v1 := r.Group("/api/v1")
	{
		// 基础通用接口子分组
		base := v1.Group("/base")
		{
			base.GET("/greet", v1_handler.GreetHandler)
			base.POST("/greet", v1_handler.GreetPostHandler)
			base.GET("/files/names", v1_handler.GetFilesNamesHandler)
		}

		// 库存管理接口子分组
		stock := v1.Group("/stock")
		{
			stock.POST("/statistic", v1_handler.StockStatisticHandler)
			stock.POST("/delete-date-column", v1_handler.DeleteDateColumnHandler)
			stock.GET("/download", v1_handler.StockFileDownloadHandler)
			stock.POST("/cleanup", v1_handler.CleanupFileHandler)
		}

		// 订单管理接口子分组
		order := v1.Group("/order")
		{
			order.GET("/download-template", v1_handler.DownloadOrderTemplate)
			order.POST("/upload-process", v1_handler.UploadAndProcessOrderExcel)
		}

		// 店铺订单管理接口子分组
		shopOrder := v1.Group("/shop-order")
		{
			shopOrder.POST("/statistic-by-path", v1_handler.StatShopOrderByPath)
			shopOrder.POST("/statistic-by-upload", v1_handler.StatShopOrderByUpload)
		}

		// 周期销量统计接口子分组
		cycleSales := v1.Group("/cycle-sales")
		{
			cycleSales.POST("/statistic", v1_handler.CycleSalesStatisticHandler)
		}

		// Excel处理通用接口子分组
		excel := v1.Group("/excel")
		{
			excel.POST("/process", v1_handler.NewExcelHandler().ProcessExcel)
			excel.POST("/fill", v1_handler.NewExcelFillHandler().FillExcel)
		}
	}

	// 商品数据库接口路由组 v2（无需修改）
	v2 := r.Group("/api/v2")
	{
		v2.GET("/barcode/:barcode", db_handler.ProductHandler.GetByBarCode)
		v2.GET("/product/shop/:shop", db_handler.ProductHandler.ListByShop)
		v2.GET("/product/all", db_handler.ProductHandler.ListAll)
		v2.POST("/product/all-with-page", db_handler.ProductHandler.ListAllWithPage)
		v2.POST("/product/id", db_handler.ProductHandler.GetByID)
		v2.POST("/product/edit", db_handler.ProductHandler.UpdateProduct)
		v2.POST("/product/import", db_handler.ProductHandler.ImportByExcel)
		v2.POST("/product/create", db_handler.ProductHandler.CreateOne)
		v2.POST("/product/create-batch", db_handler.ProductHandler.CreateBatch) //去postman导入

	}
	v3 := r.Group("/api/v3")
	{
		v3.POST("/sales/export", v3_handler.SalesExportHandler)
		v3.POST("/sales/cleanSource", v3_handler.CleanSourceHandler)
	}
	//工具接口
	v4 := r.Group("/api/v4")
	{
		//处理Excel文件接口：Excel 批量合并并自动标记源文件名称
		v4.POST("/excel/process", v4_handler.ExcelMergeHandler.ProcessExcel)
		v4.POST("/excel/clean", v4_handler.ExcelMergeHandler.CleanSource)

	}

	// 可选：添加静态HTML文件的兜底路由（防止模块页面访问异常）
	// 若前端仍有模块页面404，可启用此路由
	/*
		r.GET("/*.html", func(c *gin.Context) {
			filePath := c.Param("0") + ".html"
			fullPath := fmt.Sprintf("./static/%s", filePath)
			if _, err := os.Stat(fullPath); os.IsNotExist(err) {
				response.Fail(c, 404, "页面不存在")
				return
			}
			c.File(fullPath)
		})
	*/

	// 404统一处理（无需修改）
	r.NoRoute(func(c *gin.Context) {
		response.Fail(c, 404, "接口不存在")
	})

	return r
}
