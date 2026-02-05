package db_handler

import (
	service "go-gin/internal/service/db_service"
	"go-gin/pkg/logger"
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

// ListAllWithPage 查询所有商品（分页）
func (h *productHandler) ListAllWithPage(c *gin.Context) {
	var req service.PageQueryReq
	// 绑定参数（支持form/JSON）
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误")
		return
	}
	logger.Infof("接收到分页查询请求，参数：%+v", req)
	// 新增：显式设置默认值，避免日志显示0（与Service层默认值保持一致）
	if req.CurrentPage <= 0 {
		req.CurrentPage = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 10
	}

	logger.Infof("分页查询商品，当前页：%d，每页条数：%d，条码过滤：%v，业务码过滤：%v", req.CurrentPage, req.PageSize, req.BarCodes, req.BusinessCodes)
	// 调用Service层方法（参数已做默认值处理，无需担心0值）
	products, total, err := service.ProductService.ListAllWithPage(req.CurrentPage, req.PageSize, req.BarCodes, req.BusinessCodes)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, "商品查询失败，请稍后重试")
		return
	}

	// 成功返回
	response.SuccessWithMessage(c, "商品查询成功", gin.H{
		"list":  products,
		"total": total,
	})
}

// GetByID 按ID查询商品
// @POST /api/product/id
func (h *productHandler) GetByID(c *gin.Context) {

	var req service.ShopGoods
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误")
		return
	}
	product, err := service.ProductService.GetByID(req.ID)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, "查询失败："+err.Error())
		return
	}
	response.SuccessWithMessage(c, "查询成功", gin.H{
		"shopGoods": product,
	})
}

// edit 修改商品信息
func (h *productHandler) UpdateProduct(c *gin.Context) {
	// 1. 绑定前端JSON参数到业务DTO(ShopGoods)
	var req service.ShopGoods
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误")
		return
	}

	// 2. 调用Service层方法：接收「更新后结构体+错误」（核心调整）
	updatedProduct, err := service.ProductService.UpdateProduct(&req)
	if err != nil {
		// 3. 错误处理：透传错误信息，返回失败响应
		response.Fail(c, http.StatusInternalServerError, "修改失败："+err.Error())
		return
	}

	// 4. 成功处理：将更新后结构体作为响应数据返回（核心调整）
	response.SuccessWithMessage(c, "修改成功", gin.H{"id": updatedProduct.ID})
}

// ImportByExcel Excel文件批量导入商品
func (h *productHandler) ImportByExcel(c *gin.Context) {
	var req service.ExcelImportReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误："+err.Error())
		return
	}

	if err := service.ProductService.ImportByExcel(&req); err != nil {
		response.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.SuccessWithMessage(c, "Excel文件批量导入商品成功", nil)
}

// CreateOne 单条新增商品
func (h *productHandler) CreateOne(c *gin.Context) {
	var req service.ShopGoodsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误："+err.Error())
		return
	}

	if id, err := service.ProductService.AddProduct(&req); err != nil {
		response.Fail(c, http.StatusInternalServerError, err.Error())
		return
	} else {
		response.SuccessWithMessage(c, "单条商品新增成功", gin.H{"id": id})
	}
}

// CreateBatch 多条批量新增商品
func (h *productHandler) CreateBatch(c *gin.Context) {
	var req service.BatchShopGoodsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数格式错误："+err.Error())
		return
	}

	if err := service.ProductService.CreateBatch(&req); err != nil {
		response.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.SuccessWithMessage(c, "批量新增商品成功", gin.H{"added_count": len(req.Products)})
}
