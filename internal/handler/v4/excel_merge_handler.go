package v4_handler

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	v4_service "go-gin/internal/service/v4"
	"go-gin/pkg/logger"
	"go-gin/pkg/response"
)

// ExcelMergeHandler Excel表格合并控制器单例
var ExcelMergeHandler = new(excelMergeHandler)

type excelMergeHandler struct{}

// ProcessExcel 批量合并xls/xlsx并标记源文件名，浏览器下载结果
// @POST /api/v4/excel/process
func (h *excelMergeHandler) ProcessExcel(c *gin.Context) {
	svc := v4_service.NewExcelMergeService()
	resultFilePath, err := svc.RunMerge()
	if err != nil {
		errMsg := err.Error()
		logger.Error("Excel合并处理失败, err:", errMsg)
		switch {
		case strings.Contains(errMsg, "数据源目录不存在"):
			response.BadRequest(c, "数据源目录不存在，请检查配置或创建目录")
		case strings.Contains(errMsg, "无xls/xlsx文件"):
			response.BadRequest(c, "数据源目录下未找到xls/xlsx表格文件")
		default:
			response.BadRequest(c, "Excel合并处理失败："+errMsg)
		}
		return
	}

	fileBytes, err := os.ReadFile(resultFilePath)
	if err != nil {
		errMsg := err.Error()
		logger.Error("读取合并结果文件失败, err:", errMsg)
		response.BadRequest(c, "读取合并结果文件失败："+errMsg)
		return
	}

	// 下载响应头，与项目导出风格统一
	originFileName := filepath.Base(resultFilePath)
	encodeFileName := url.QueryEscape(originFileName)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+encodeFileName)
	c.Header("Content-Length", strconv.Itoa(len(fileBytes)))
	c.Header("Cache-Control", "no-cache")

	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)
}

// CleanSource 清空excel合并源文件，保留合并结果
// @POST /api/v4/excel/clean
func (h *excelMergeHandler) CleanSource(c *gin.Context) {
	err := v4_service.ClearExcelSourceFile()
	if err != nil {
		errMsg := err.Error()
		logger.Error("清理Excel源文件失败, err:", errMsg)
		switch {
		case strings.Contains(errMsg, "遍历数据源目录失败"):
			response.BadRequest(c, "Excel数据源目录不存在，请检查配置")
		default:
			response.BadRequest(c, "清理Excel源文件失败："+errMsg)
		}
		return
	}

	response.SuccessWithMessage(c, "Excel数据源清理完成", gin.H{
		"msg": "已清空配置目录下所有xls/xlsx源文件，保留merged_result.xlsx",
	})
}
