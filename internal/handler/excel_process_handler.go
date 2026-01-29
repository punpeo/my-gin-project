package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/logger"
	"go-gin/pkg/response"

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

func (h *ExcelHandler) ProcessExcel(c *gin.Context) {
	// 1. 只绑定JSON格式（和前端保持一致，避免格式冲突）
	var req service.ExcelProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Errorf("JSON参数绑定失败：%v，原始请求体：%s", err, c.Request.Body)
		response.BadRequest(c, "参数绑定失败，请检查请求格式是否正确")
		return
	}

	// 2. 打印接收到的参数（排查空值问题）
	logger.Infof("接收到Excel处理请求：base_path=%s, match_column=%s, match_value=%s, keep_columns=%v, sum_column=%s",
		req.BasePath, req.MatchColumn, req.MatchValue, req.KeepColumns, req.SumColumn)

	// 3. 核心参数校验
	if req.BasePath == "" {
		logger.Error("Excel处理失败：基础路径为空")
		response.BadRequest(c, "基础路径不能为空")
		return
	}
	if req.MatchColumn == "" {
		logger.Error("Excel处理失败：匹配列为空")
		response.BadRequest(c, "匹配列不能为空")
		return
	}
	if len(req.KeepColumns) == 0 {
		logger.Error("Excel处理失败：保留列为空")
		response.BadRequest(c, "保留列不能为空（数组格式，如[\"A\",\"B\"]）")
		return
	}
	if req.SumColumn == "" {
		logger.Error("Excel处理失败：求和列为空")
		response.BadRequest(c, "求和列不能为空")
		return
	}

	// 4. 调用Service处理
	resp, err := h.excelService.ProcessExcel(req)
	if err != nil {
		logger.Errorf("处理Excel失败：%v", err)

		// 返回统一的错误信息，不包含详细的技术细节
		response.BadRequest(c, "操作失败，请检查数据后重新进行操作")
		return
	}
	response.SuccessWithMessage(c, "文件分组汇总完成", gin.H{
		"total_count":    resp.TotalCount,    // 总处理行数
		"grouped_data":   resp.GroupedData,   // 分组数据
		"message":        resp.Message,       // 处理消息
		"total_all_num":  resp.TotalAllNum,   // 总数量
		"total_all_amt":  resp.TotalAllAmt,   // 求和汇总
		"processed":      resp.Processed,     // 处理文件数
		"skipped":        resp.Skipped,       // 跳过文件数
		"xlsx_count":     resp.XlsxCount,     // 处理的xlsx文件数
		"xls_count":      resp.XlsCount,      // 处理的xls文件数
		"base64_content": resp.Base64Content, // Base64编码的Excel文件内容
	})

	// 9. 日志记录
	logger.Infof("Excel处理完成：处理文件，总行数=%d，处理文件数=%d，跳过文件数=%d，分组数=%d",
		resp.TotalCount, resp.Processed, resp.Skipped, len(resp.GroupedData))
}
