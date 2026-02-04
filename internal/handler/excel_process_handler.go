package handler

import (
	"fmt"
	"go-gin/internal/service"
	"go-gin/pkg/logger"
	"go-gin/pkg/response"
	"time"

	"github.com/gin-gonic/gin"
)

// ExcelHandler Excel处理控制器
type ExcelHandler struct {
	excelService service.ExcelService
}

// NewExcelHandler 创建Excel控制器实例
func NewExcelHandler() *ExcelHandler {
	return &ExcelHandler{
		excelService: service.NewExcelService(),
	}
}

// ProcessExcel 处理Excel文件请求
func (h *ExcelHandler) ProcessExcel(c *gin.Context) {
	// 1. 参数绑定
	var req service.ExcelProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Errorf("参数绑定失败: %v", err)
		response.BadRequest(c, "请求参数格式错误")
		return
	}

	// 2. 参数校验
	if req.BasePath == "" {
		response.BadRequest(c, "基础路径不能为空")
		return
	}
	if req.MatchColumn == "" {
		response.BadRequest(c, "匹配列不能为空")
		return
	}
	if len(req.KeepColumns) == 0 {
		response.BadRequest(c, "至少需要指定一个保留列")
		return
	}

	// 3. 设置默认输出文件名
	if req.OutputFile == "" {
		req.OutputFile = generateDefaultFilename()
	}

	// 4. 调用服务层处理
	resp, err := h.excelService.ProcessExcel(req)
	if err != nil {
		logger.Errorf("Excel处理失败: %v", err)
		response.ServerError(c, "Excel处理失败，请稍后重试")
		return
	}
	msg := resp.Message
	// 5. 返回成功响应
	response.SuccessWithMessage(c, msg, gin.H{
		"total_rows":     resp.TotalRows,
		"group_count":    resp.GroupCount,
		"groups":         resp.Groups,
		"group_averages": resp.GroupAverages,
		"base64_data":    resp.Base64Data,
		"processed":      resp.Processed,
		"skipped":        resp.Skipped,
		"message":        resp.Message,
	})
}

// generateDefaultFilename 生成默认文件名
func generateDefaultFilename() string {
	return fmt.Sprintf("excel_summary_%s.xlsx", time.Now().Format("20060102_150405"))
}
