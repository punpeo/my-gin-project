package v1_handler

import (
	v1_service "go-gin/internal/service/v1"
	"go-gin/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CycleSalesStatisticHandler 产品周期销量统计接口处理函数
func CycleSalesStatisticHandler(c *gin.Context) {
	// 1. 绑定前端请求参数
	var req v1_service.CycleSalesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数错误："+err.Error())
		return
	}

	// 2. 初始化服务层并调用核心逻辑
	svc := v1_service.NewCycleSalesService()
	result, err := svc.Statistic(&req)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 3. 生成Excel结果文件
	base64Content, err := svc.GenerateExcel(result)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, "生成Excel文件失败："+err.Error())
		return
	}
	response.SuccessWithMessage(c, "", gin.H{
		"base64":       base64Content,
		"fileName":     result.FileName,
		"productCount": result.ProductCount,
		"cycleDays":    result.CycleDays,
		"message":      result.Message,
	})
}
