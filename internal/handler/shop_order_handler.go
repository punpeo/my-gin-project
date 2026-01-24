package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"
)

// StatShopOrder 店铺订单统计接口
func StatShopOrder(c *gin.Context) {
	// 1. 获取前端传递的文件根目录
	var req struct {
		BasePath string `json:"base_path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数错误："+err.Error())
		return
	}

	// 2. 调用服务层统计数据（接收总订单数、总金额）
	statList, excelFile, totalAllNum, totalAllAmt, err := service.StatShopOrder(req.BasePath)
	if err != nil {
		response.Fail(c, 500, "统计失败："+err.Error())
		return
	}

	// 3. 生成Excel文件字节流（供下载）
	excelBytes, err := excelFile.WriteToBuffer()
	if err != nil {
		response.Fail(c, 500, "生成Excel文件失败："+err.Error())
		return
	}

	// 4. 设置响应头（触发下载）
	fileName := url.QueryEscape("店铺订单统计结果.xlsx")
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(excelBytes.Bytes())))
	c.Header("Cache-Control", "no-cache")

	// 5. 自定义响应头：统计数据（供前端展示）
	c.Header("X-Shop-Count", strconv.Itoa(len(statList)))
	c.Header("X-Total-All-Num", strconv.Itoa(totalAllNum))                    // 新增：总订单数
	c.Header("X-Total-All-Amt", strconv.FormatFloat(totalAllAmt, 'f', 2, 64)) // 新增：总金额（保留2位）

	// 6. 返回Excel文件
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes.Bytes())
}
