package handler

import (
	"bytes"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

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
	resp, excelFile, err := h.excelService.ProcessExcel(req)
	if err != nil {
		logger.Errorf("处理Excel失败：%v", err)

		// 返回统一的错误信息，不包含详细的技术细节
		response.BadRequest(c, "操作失败，请检查数据后重新进行操作")
		return
	}

	// 5. 生成文件字节流
	var buf bytes.Buffer
	if err := excelFile.Write(&buf); err != nil {
		logger.Errorf("生成Excel字节流失败：%v", err)
		response.BadRequest(c, "生成Excel文件失败")
		return
	}

	// 6. 构造下载响应 - 修复中文文件名乱码问题
	fileName := req.OutputFile

	// 对文件名进行URL编码，防止乱码
	encodedFileName := url.QueryEscape(fileName)

	// 设置响应头，支持中文文件名
	// filename* 使用RFC 5987编码，兼容更多浏览器
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s",
		fileName, encodedFileName))
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
	c.Header("Content-Length", fmt.Sprintf("%d", buf.Len()))

	// 7. 返回文件数据
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())

	// 8. 可选：将文件保存到本地备份
	go func() {
		tempDir := "tmp"
		os.MkdirAll(tempDir, 0755)
		tempFileName := filepath.Join(tempDir, fileName)

		// 使用已有的excelFile保存到本地
		if err := excelFile.SaveAs(tempFileName); err != nil {
			logger.Warnf("保存Excel备份文件失败：%v", err)
		} else {
			logger.Infof("Excel备份文件已保存：%s", tempFileName)
		}
	}()

	// 9. 日志记录
	logger.Infof("Excel处理完成：文件=%s，总行数=%d，处理文件数=%d，跳过文件数=%d，分组数=%d",
		fileName, resp.TotalCount, resp.Processed, resp.Skipped, len(resp.GroupedData))
}
