package handler

import (
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
// 调整点：
// 1. 所有失败场景统一使用 response.Fail（返回HTTP 200 + 业务码）
// 2. 业务码使用response包定义的常量，而非HTTP状态码
// 3. 成功场景使用SuccessWithMessage保持提示语友好
func (h *ExcelFillHandler) FillExcel(c *gin.Context) {
	// 1. 获取表单参数
	rootDir := c.PostForm("root_dir")
	sourceMatchCol := c.PostForm("source_match_col")
	sourceFillCol := c.PostForm("source_fill_col")
	targetMatchCol := c.PostForm("target_match_col")
	targetValueCol := c.PostForm("target_value_col")

	// 2. 参数校验（统一用response.Fail返回HTTP 200 + 业务码400）
	if rootDir == "" {
		response.Fail(c, response.CodeBadRequest, "文件根目录不能为空")
		return
	}
	if sourceMatchCol == "" {
		response.Fail(c, response.CodeBadRequest, "待输入表匹配列不能为空")
		return
	}
	if sourceFillCol == "" {
		response.Fail(c, response.CodeBadRequest, "待输入表填充列不能为空")
		return
	}
	if targetMatchCol == "" {
		response.Fail(c, response.CodeBadRequest, "目标表匹配列不能为空")
		return
	}
	if targetValueCol == "" {
		response.Fail(c, response.CodeBadRequest, "目标表取值列不能为空")
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
		// 业务失败返回HTTP 200 + 业务码500（使用response包的常量）
		response.Fail(c, response.CodeServerError, "处理失败: "+err.Error())
		return
	}

	// 4. 成功响应（HTTP 200 + 业务码0 + 自定义提示语）
	response.SuccessWithMessage(c, resp.Message, resp)
}
