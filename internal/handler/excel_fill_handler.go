package handler

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"time"

	"go-gin/internal/service"
	"go-gin/pkg/logger"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// ExcelFillHandler 填充控制器
type ExcelFillHandler struct {
	fillService service.ExcelFillService
}

// NewExcelFillHandler 创建控制器实例
func NewExcelFillHandler() *ExcelFillHandler {
	return &ExcelFillHandler{
		fillService: service.NewExcelFillService(),
	}
}

// FillExcel 填充Excel数据
func (h *ExcelFillHandler) FillExcel(c *gin.Context) {
	// 1. 获取表单参数
	rootDir := c.PostForm("root_dir")
	sourceMatchCol := c.PostForm("source_match_col")
	sourceFillCol := c.PostForm("source_fill_col")
	targetMatchCol := c.PostForm("target_match_col")
	targetValueCol := c.PostForm("target_value_col")

	// 2. 参数校验
	if rootDir == "" {
		response.Fail(c, http.StatusBadRequest, "文件根目录不能为空")
		return
	}
	if sourceMatchCol == "" {
		response.Fail(c, http.StatusBadRequest, "待输入表匹配列不能为空")
		return
	}
	if sourceFillCol == "" {
		response.Fail(c, http.StatusBadRequest, "待输入表填充列不能为空")
		return
	}
	if targetMatchCol == "" {
		response.Fail(c, http.StatusBadRequest, "目标表匹配列不能为空")
		return
	}
	if targetValueCol == "" {
		response.Fail(c, http.StatusBadRequest, "目标表取值列不能为空")
		return
	}

	// 3. 调用Service处理
	req := service.ExcelFillRequest{
		RootDir:        rootDir,
		SourceMatchCol: sourceMatchCol,
		SourceFillCol:  sourceFillCol,
		TargetMatchCol: targetMatchCol,
		TargetValueCol: targetValueCol,
	}

	resp, err := h.fillService.ProcessFill(req)
	if err != nil {
		logger.Errorf("填充Excel失败: %v", err)
		response.Fail(c, http.StatusInternalServerError, "处理失败: "+err.Error())
		return
	}

	// 4. 读取处理后的文件
	sourcePath := filepath.Join(req.RootDir, "待输入表.xlsx")
	fileBytes, err := ioutil.ReadFile(sourcePath)
	if err != nil {
		logger.Errorf("读取处理后的文件失败: %v", err)
		response.Fail(c, http.StatusInternalServerError, "读取文件失败")
		return
	}

	// 5. 生成统一命名的文件名：月日+结果表.xlsx
	now := time.Now()
	month := fmt.Sprintf("%02d", now.Month())
	day := fmt.Sprintf("%02d", now.Day())
	fileName := fmt.Sprintf("%s%s结果表.xlsx", month, day)

	// 6. 设置响应头
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Length", fmt.Sprintf("%d", len(fileBytes)))

	// 7. 返回文件
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)

	logger.Infof("Excel填充接口调用成功：%s", resp.Message)
}
