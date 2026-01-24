package handler

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"go-gin/internal/model"
	"go-gin/internal/service"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// CycleSalesStatisticHandler 产品周期销量统计接口处理函数
func CycleSalesStatisticHandler(c *gin.Context) {
	// 1. 绑定前端请求参数
	var req model.CycleSalesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, "参数错误："+err.Error())
		return
	}

	// 2. 初始化服务层并调用核心逻辑
	svc := service.NewCycleSalesService()
	result, err := svc.Statistic(&req)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 3. 生成Excel结果文件
	excelFile, err := svc.GenerateExcel(result)
	if err != nil {
		response.Fail(c, http.StatusInternalServerError, "生成Excel文件失败："+err.Error())
		return
	}

	// 4. 修复文件名乱码：对中文文件名进行URL编码
	encodedFileName := url.QueryEscape(result.FileName)
	// 设置响应头，触发浏览器下载（标准RFC 5987格式）
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename*=UTF-8''%s", encodedFileName))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

	// 仅保留必要响应头（移除 X-Total-Sales）
	c.Header("X-Product-Count", strconv.Itoa(result.ProductCount))
	c.Header("X-Cycle-Days", strconv.Itoa(result.CycleDays))

	// 5. 将Excel文件写入响应
	if err := excelFile.Write(c.Writer); err != nil {
		response.Fail(c, http.StatusInternalServerError, "返回Excel文件失败："+err.Error())
		return
	}
}
