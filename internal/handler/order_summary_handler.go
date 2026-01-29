package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
)

// DownloadOrderTemplate 下载订单汇总模板
func DownloadOrderTemplate(c *gin.Context) {
	// 获取模板文件字节流
	base64Content, err := service.DownloadTemplate()
	if err != nil {
		response.Fail(c, 500, "生成模板文件失败："+err.Error())
		return
	}
	response.Success(c, gin.H{
		"message":        "模板文件生成成功",
		"base64_content": base64Content,
	})
}

// UploadAndProcessOrderExcel 上传并处理订单Excel文件
func UploadAndProcessOrderExcel(c *gin.Context) {
	// 1. 新增：接收前端传递的人名参数（优先表单参数，兼容URL参数）
	// 前端可通过 formData.append("username", 选中的人名) 传递，或URL参数 ?username=XXX
	userName := c.PostForm("username") // 表单参数（推荐）
	if userName == "" {
		userName = c.Query("username") // 兼容URL参数
	}
	// 清洗人名：去除特殊字符，避免文件名非法
	userName = strings.TrimSpace(userName)
	userName = strings.ReplaceAll(userName, "/", "")
	userName = strings.ReplaceAll(userName, "\\", "")
	userName = strings.ReplaceAll(userName, ":", "")
	userName = strings.ReplaceAll(userName, "*", "")
	userName = strings.ReplaceAll(userName, "?", "")
	userName = strings.ReplaceAll(userName, "\"", "")
	userName = strings.ReplaceAll(userName, "<", "")
	userName = strings.ReplaceAll(userName, ">", "")
	userName = strings.ReplaceAll(userName, "|", "")

	// 2. 接收上传的文件
	file, err := c.FormFile("excel_file")
	if err != nil {
		response.Fail(c, 400, "获取上传文件失败："+err.Error())
		return
	}

	// 3. 读取文件内容
	fileBytes, err := file.Open()
	if err != nil {
		response.Fail(c, 500, "读取上传文件失败："+err.Error())
		return
	}
	defer fileBytes.Close()

	// 读取文件到字节数组
	buf := make([]byte, file.Size)
	_, err = fileBytes.Read(buf)
	if err != nil {
		response.Fail(c, 500, "读取文件内容失败："+err.Error())
		return
	}

	// 4. 处理Excel文件
	base64Content, summaryResult, err := service.ProcessOrderExcel(buf, userName)
	if err != nil {
		response.Fail(c, 500, "处理订单数据失败："+err.Error())
		return
	}
	response.SuccessWithMessage(c, "补单订单汇总已完成", gin.H{
		"base64_content":      base64Content,
		"fills_name":          summaryResult.FillsName,
		"total_unique_order":  summaryResult.TotalUniqueOrder,
		"total_unique_amount": summaryResult.TotalUniqueAmount,
		"total_order_count":   summaryResult.TotalOrderCount,
		"duplicate_count":     summaryResult.DuplicateCount,
		"duplicate_messages":  summaryResult.DuplicateMessages,
		"shop_count":          summaryResult.ShopCount,
		"message":             summaryResult.Message,
	})
}
