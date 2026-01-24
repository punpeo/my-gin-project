package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"
	"net/url"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// DownloadOrderTemplate 下载订单汇总模板
func DownloadOrderTemplate(c *gin.Context) {
	// 获取模板文件字节流
	templateBytes, err := service.DownloadTemplate()
	if err != nil {
		response.Fail(c, 500, "生成模板文件失败："+err.Error())
		return
	}

	// 设置响应头触发下载
	fileName := url.QueryEscape("budan.xlsx")
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(templateBytes)))
	c.Header("Cache-Control", "no-cache")

	// 返回文件内容
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", templateBytes)
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
	resultFileBytes, summaryResult, err := service.ProcessOrderExcel(buf)
	if err != nil {
		response.Fail(c, 500, "处理订单数据失败："+err.Error())
		return
	}

	// 5. 新增：动态生成文件名
	var fileName string
	if userName != "" {
		// 有选中人名：XXX+订单汇总结果.xlsx
		fileName = url.QueryEscape(userName + "订单汇总结果.xlsx")
	} else {
		// 无选中人名：默认订单汇总结果.xlsx
		fileName = url.QueryEscape("订单汇总结果.xlsx")
	}

	// 6. 设置响应头，返回结果文件并携带统计信息
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName) // 使用动态文件名
	c.Header("Content-Length", strconv.Itoa(len(resultFileBytes)))
	c.Header("Cache-Control", "no-cache")

	// 自定义响应头传递统计信息（供前端展示）
	c.Header("X-Shop-Count", strconv.Itoa(summaryResult.ShopCount))
	c.Header("X-Total-Unique-Order", strconv.Itoa(summaryResult.TotalUniqueOrder))
	c.Header("X-Total-Unique-Amount", strconv.FormatFloat(summaryResult.TotalUniqueAmount, 'f', 2, 64))
	c.Header("X-Total-Order-Count", strconv.Itoa(summaryResult.TotalOrderCount))
	c.Header("X-Duplicate-Count", strconv.Itoa(summaryResult.DuplicateCount))

	// 7. 返回结果文件
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", resultFileBytes)
}
