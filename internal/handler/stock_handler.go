package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"
	"net/url"
	"strconv"

	"github.com/gin-gonic/gin"
)

// StockStatisticHandler 库存统计接口处理器（执行+下载）
// 核心调整：移除清理数量相关冗余逻辑，明确统计接口无清理操作
func StockStatisticHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req service.StockStatisticRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数解析失败："+err.Error())
		return
	}

	// 2. 调用服务层执行库存统计（仅统计，无清理）
	resp, err := service.StockStatistic(req)
	if err != nil {
		response.Fail(c, 500, "库存统计失败："+err.Error())
		return
	}

	// 3. 读取更新后的Excel文件内容
	fileContent, err := service.GetStockFileContent(req)
	if err != nil {
		// 文件读取失败但统计已成功，仅提示不终止
		response.Success(c, gin.H{
			"message":  resp.Message,
			"col_name": resp.ColName,
			// 明确说明无清理操作，而非传递cleanup字段
			"hint": "库存统计完成，无文件清理操作（清理请调用独立的清理接口）",
		})
		return
	}

	// 4. 设置响应头，触发浏览器下载文件
	// 处理文件名编码（避免中文乱码）
	fileName := url.QueryEscape(req.BaseFileName)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(fileContent)))
	c.Header("Cache-Control", "no-cache")
	// 移除清理数量响应头（统计接口无清理，该字段无意义）

	// 5. 返回文件内容（浏览器自动下载）
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileContent)
}

// StockFileDownloadHandler 单独的文件下载接口（用于已统计完成后下载）
// 无需修改，保持原有逻辑即可
func StockFileDownloadHandler(c *gin.Context) {
	// 从Query参数获取路径和文件名
	basePath := c.Query("base_path")
	baseFileName := c.Query("base_file_name")
	if baseFileName == "" {
		baseFileName = "kucun.xlsx"
	}

	req := service.StockStatisticRequest{
		BasePath:     basePath,
		BaseFileName: baseFileName,
	}

	// 读取文件内容
	fileContent, err := service.GetStockFileContent(req)
	if err != nil {
		response.Fail(c, 500, "文件下载失败："+err.Error())
		return
	}

	// 设置下载响应头
	fileName := url.QueryEscape(baseFileName)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(fileContent)))
	c.Header("Cache-Control", "no-cache")

	// 返回文件内容
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileContent)
}

// DeleteDateColumnHandler 删除日期列接口处理器
// 无需修改，保持原有逻辑即可
func DeleteDateColumnHandler(c *gin.Context) {
	// 1. 绑定请求参数（与service层的DeleteDateColumnRequest对应）
	var req service.DeleteDateColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数解析失败："+err.Error())
		return
	}

	// 2. 调用服务层执行删除日期列
	resp, err := service.DeleteDateColumn(req)
	if err != nil {
		response.Fail(c, 500, "删除日期列失败："+err.Error())
		return
	}

	// 3. 返回成功响应
	response.Success(c, gin.H{
		"message": resp.Message,
	})
}

// CleanupFileHandler 清理文件接口处理器
// 核心调整：强化响应语义，明确是手动清理操作
func CleanupFileHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req service.CleanupFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数解析失败："+err.Error())
		return
	}

	// 2. 调用服务层执行清理（手动清理接口）
	resp, err := service.CleanupNonBaseExcelFiles(req)
	if err != nil {
		response.Fail(c, 500, "清理文件失败："+err.Error())
		return
	}

	// 3. 返回成功响应（明确标注是手动清理，语义更清晰）
	response.Success(c, gin.H{
		"message": resp.Message,
		"cleanup": resp.Cleanup,
		"trigger": "手动清理接口", // 新增：明确触发来源
		"hint":    "仅删除非基准Excel文件，基准文件（" + req.BaseFileName + "）已保留",
	})
}
