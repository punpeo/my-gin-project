package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// StatShopOrderByPath 通过文件路径进行店铺订单统计接口
func StatShopOrderByPath(c *gin.Context) {
	// 1. 获取前端传递的文件根目录
	var req struct {
		BasePath string `json:"base_path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数错误："+err.Error())
		return
	}

	// 2. 调用服务层统计数据（接收总订单数、总金额）
	statList, err := service.StatShopOrder(req.BasePath)
	if err != nil {
		response.Fail(c, 500, "统计失败："+err.Error())
		return
	}
	response.Success(c, gin.H{
		"shop_name":      statList.ShopName,
		"total_num":      statList.TotalNum,
		"total_amt":      statList.TotalAmt,
		"shop_num":       statList.ShopNum,
		"base64_content": statList.Base64Content,
	})
}

// StatShopOrderByUpload 通过上传文件进行店铺订单统计接口
func StatShopOrderByUpload(c *gin.Context) {
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

	// 4. 调用服务层统计数据（上传文件方式）
	statList, err := service.StatShopOrderByUpload(fileBytes, fileName)
	if err != nil {
		response.Fail(c, 500, "统计失败："+err.Error())
		return
	}
	response.Success(c, gin.H{
		"shop_name":      statList.ShopName,
		"total_num":      statList.TotalNum,
		"total_amt":      statList.TotalAmt,
		"shop_num":       statList.ShopNum,
		"base64_content": statList.Base64Content,
	})

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
