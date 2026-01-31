package db_handler

import (
	service "go-gin/internal/service/db_service"
	"go-gin/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ProductHandler 商品控制器
var ProductHandler = new(productHandler)

type productHandler struct{}

// GetByBarCode 按条码查询商品
// @GET /api/product/barcode/:barcode
func (h *productHandler) GetByBarCode(c *gin.Context) {
	// 从URL参数中获取条码
	barCode := c.Param("barcode")
	// 调用service层方法
	product, err := service.ProductService.GetProductByBarCode(barCode)
	if err != nil {
		response.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if product == nil {
		response.Fail(c, http.StatusOK, "商品不存在")
		return
	}
	response.SuccessWithMessage(c, "查询成功", product)
}

// ListByShop 按店铺查询商品列表
// @GET /api/product/shop/:shop
func (h *productHandler) ListByShop(c *gin.Context) {
	shop := c.Param("shop")
	products, err := service.ProductService.ListProductByShop(shop)
	if err != nil {
		response.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	response.SuccessWithMessage(c, "查询成功", gin.H{
		"shop":  shop,
		"total": len(products),
		"list":  products,
	})
}

// ListAll 查询所有商品（按店铺排序）
// @GET /api/product/all
func (h *productHandler) ListAll(c *gin.Context) {
	products, err := service.ProductService.ListAllProduct()
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, "查询失败")
		return
	}
	response.SuccessWithMessage(c, "查询成功", gin.H{
		"total": len(products),
		"list":  products,
	})
}

// BatchImport 批量导入商品Excel文件
// @POST /api/product/import
func (h *productHandler) BatchImport(c *gin.Context) {
	// 1. 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, 400, "请选择要上传的文件："+err.Error())
		return
	}

	// 2. 验证文件类型
	fileName := file.Filename
	if !isExcelFile(fileName) {
		response.Fail(c, 400, "文件格式不支持，仅支持.xlsx和.xls格式")
		return
	}

	// 3. 读取文件内容
	src, err := file.Open()
	if err != nil {
		response.Fail(c, 500, "打开上传文件失败："+err.Error())
		return
	}
	defer src.Close()

	// 读取文件字节
	fileBytes := make([]byte, file.Size)
	_, err = src.Read(fileBytes)
	if err != nil {
		response.Fail(c, 500, "读取上传文件失败："+err.Error())
		return
	}
	// 4. 调用服务层批量导入商品
	err = service.ProductService.BatchImportProduct(fileBytes)
	if err != nil {
		response.Fail(c, 500, "导入失败："+err.Error())
		return
	}
	response.Success(c, "导入成功")
}

// isExcelFile 检查是否为Excel文件
func isExcelFile(fileName string) bool {
	// 检查文件扩展名
	allowedExtensions := []string{".xlsx", ".xls"}
	for _, ext := range allowedExtensions {
		if len(fileName) >= len(ext) && fileName[len(fileName)-len(ext):] == ext {
			return true
		}
	}
	return false
}
