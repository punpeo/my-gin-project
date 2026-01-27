package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"
	"net/url"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// StockStatisticHandler 库存统计接口处理器（执行+下载）
func StockStatisticHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req service.StockStatisticRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "参数解析失败，请检查输入格式")
		return
	}

	// 2. 参数验证
	if req.BasePath == "" {
		response.ParamRequiredError(c, "基础路径不能为空")
		return
	}
	if req.BaseFileName == "" {
		response.ParamRequiredError(c, "基础文件名不能为空")
		return
	}
	if req.ColDateName == "" {
		response.ParamRequiredError(c, "日期列名称不能为空")
		return
	}

	// 3. 调用服务层执行库存统计
	resp, err := service.StockStatistic(req)
	if err != nil {
		// 根据错误信息判断错误类型
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "文件不存在"):
			response.FileNotFound(c, "指定的库存文件不存在")
		case strings.Contains(errMsg, "列已存在"):
			// 处理列已存在的情况
			response.Conflict(c, errMsg)
		default:
			response.DataProcessingError(c, "库存统计失败，请检查数据后重试")
		}
		return
	}

	// 4. 读取更新后的Excel文件内容
	fileContent, err := service.GetStockFileContent(req)
	if err != nil {
		response.FileSystemError(c, "读取统计结果文件失败")
		return
	}

	// 5. 设置响应头，触发浏览器下载文件
	// 处理文件名编码（避免中文乱码）
	fileName := url.QueryEscape(req.BaseFileName)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(fileContent)))
	c.Header("Cache-Control", "no-cache")

	// 添加统计信息的响应头，供前端显示
	if resp != nil && resp.ColName != "" {
		c.Header("X-Column-Name", resp.ColName)
		c.Header("X-Product-Count", strconv.Itoa(resp.ProductCount))
		c.Header("X-Total-Stock", strconv.FormatFloat(resp.TotalStock, 'f', 2, 64))
	}
	c.Header("X-Process-Success", "true")

	// 6. 返回文件内容（浏览器自动下载）
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileContent)
}

// StockFileDownloadHandler 单独的文件下载接口（用于已统计完成后下载）
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

	// 验证参数
	if basePath == "" {
		response.ParamRequiredError(c, "基础路径不能为空")
		return
	}

	// 读取文件内容
	fileContent, err := service.GetStockFileContent(req)
	if err != nil {
		if strings.Contains(err.Error(), "文件不存在") {
			response.FileNotFound(c, "指定的库存文件不存在")
		} else {
			response.FileSystemError(c, "读取文件失败")
		}
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
func DeleteDateColumnHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req service.DeleteDateColumnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "参数解析失败，请检查输入格式")
		return
	}

	// 2. 参数验证
	if req.BasePath == "" {
		response.ParamRequiredError(c, "基础路径不能为空")
		return
	}
	if req.BaseFileName == "" {
		response.ParamRequiredError(c, "基础文件名不能为空")
		return
	}
	if req.Date == "" {
		response.ParamRequiredError(c, "删除日期不能为空")
		return
	}

	// 3. 调用服务层执行删除日期列
	resp, err := service.DeleteDateColumn(req)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "文件不存在"):
			response.FileNotFound(c, "指定的库存文件不存在")
		case strings.Contains(errMsg, "未找到"):
			response.DataNotFound(c, "指定的日期列不存在")
		case strings.Contains(errMsg, "日期格式错误"):
			response.ValidationError(c, "日期格式错误，需为「1月1日」格式")
		default:
			response.DataProcessingError(c, "删除日期列失败，请稍后重试")
		}
		return
	}

	// 4. 返回成功响应
	response.SuccessWithMessage(c, "删除日期列成功", gin.H{
		"column_name": req.Date,
		"message":     resp.Message,
	})
}

// CleanupFileHandler 清理文件接口处理器
func CleanupFileHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req service.CleanupFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, "参数解析失败，请检查输入格式")
		return
	}

	// 2. 参数验证
	if req.BasePath == "" {
		response.ParamRequiredError(c, "基础路径不能为空")
		return
	}
	if req.BaseFileName == "" {
		response.ParamRequiredError(c, "基础文件名不能为空")
		return
	}

	// 3. 调用服务层执行清理
	resp, err := service.CleanupNonBaseExcelFiles(req)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "路径不存在") || strings.Contains(errMsg, "目录"):
			response.FileNotFound(c, "指定的路径不存在")
		default:
			response.FileSystemError(c, "清理文件失败，请检查文件权限")
		}
		return
	}

	// 4. 返回成功响应
	response.SuccessWithMessage(c, "清理文件完成", gin.H{
		"cleanup_count": resp.Cleanup,
		"base_file":     req.BaseFileName,
		"message":       resp.Message,
	})
}
