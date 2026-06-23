package handler

import (
	"encoding/base64"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"go-gin/config"
	"go-gin/internal/model"
	"go-gin/internal/service"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// SalesExportHandler SKU销售汇总导出接口（生成后浏览器直接下载结果表）
func SalesExportHandler(c *gin.Context) {
	// 1. 绑定请求参数
	var req model.SalesExportReq
	if err := c.ShouldBind(&req); err != nil {
		response.BadRequest(c, "参数解析失败，请检查输入格式")
		return
	}

	// 2. 参数校验
	if req.ShopName == "" {
		response.BadRequest(c, "店铺名称不能为空")
		return
	}
	if req.SourceMode == "" {
		response.BadRequest(c, "数据源模式不能为空，可选base64 / dir")
		return
	}
	if req.SourceMode == "base64" {
		if req.FileBase64 == "" {
			response.BadRequest(c, "base64模式下文件base64编码不能为空")
			return
		}
		if req.FileName == "" {
			response.BadRequest(c, "base64模式下文件名称不能为空")
			return
		}
	}

	// 3. base64模式：解码写入 E:\\sales_date 目录下，供后续处理
	if req.SourceMode == "base64" {
		fileBytes, err := base64.StdEncoding.DecodeString(req.FileBase64)
		if err != nil {
			response.BadRequest(c, "文件base64解码失败，请检查文件编码")
			return
		}
		saveDir := config.GlobalConfig.SalesExport.SourceDir
		savePath := filepath.Join(saveDir, req.FileName)
		err = os.MkdirAll(saveDir, 0755)
		if err != nil {
			response.BadRequest(c, "创建数据源目录失败："+err.Error())
			return
		}
		err = os.WriteFile(savePath, fileBytes, 0644)
		if err != nil {
			response.BadRequest(c, "保存上传文件失败，请检查E盘目录权限")
			return
		}
	}

	// 4. 执行业务：统计SKU并生成结果Excel
	exportData, err := service.SalesExport(req)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "店铺不存在"):
			response.BadRequest(c, "指定店铺不存在")
		case strings.Contains(errMsg, "无有效销售数据"):
			response.BadRequest(c, "E盘目录未读取到任何有效销售数据，请检查源文件")
		default:
			response.BadRequest(c, "销售汇总导出失败："+errMsg)
		}
		return
	}

	// 5. 读取生成好的结果文件二进制
	fileBytes, err := os.ReadFile(exportData.FilePath)
	if err != nil {
		response.BadRequest(c, "读取生成的结果文件失败："+err.Error())
		return
	}

	// 6. 设置浏览器下载响应头
	fileName := url.QueryEscape(exportData.FileName)
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+fileName)
	c.Header("Content-Length", strconv.Itoa(len(fileBytes)))
	c.Header("Cache-Control", "no-cache")

	// 7. 二进制流返回，浏览器自动下载
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)
}

// CleanSourceHandler 清理E盘原始销售数据源接口
func CleanSourceHandler(c *gin.Context) {
	err := service.ClearSourceFile()
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "遍历数据源目录失败"):
			response.BadRequest(c, "E盘数据源目录不存在，请检查配置")
		default:
			response.BadRequest(c, "清理原始数据源文件失败："+errMsg)
		}
		return
	}

	response.SuccessWithMessage(c, "原始销售数据源清理完成", gin.H{
		"message": "已清空 E:\\sales_data下所有销售源Excel，保留模板.xlsx与统计结果.xlsx",
	})
}
