package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// 基础响应结构体（极简通用版）
// 字段命名采用前端友好的短命名（code/msg/data），兼顾兼容性
type BaseResponse struct {
	Code    int         `json:"code"` // 业务状态码（核心区分成功/失败/具体业务错误）
	Msg     string      `json:"msg"`  // 人性化提示信息（前端直接展示）
	Data    interface{} `json:"data"` // 响应数据（成功时返回，失败时为nil）
	Success bool        `json:"success"`
}

// --------------------------
// 1. HTTP状态码常量（复用net/http标准常量，增强可读性）
// --------------------------
const (
	HTTPStatusOK                  = http.StatusOK                  // 200 成功
	HTTPStatusBadRequest          = http.StatusBadRequest          // 400 参数错误
	HTTPStatusUnauthorized        = http.StatusUnauthorized        // 401 未授权
	HTTPStatusForbidden           = http.StatusForbidden           // 403 禁止访问
	HTTPStatusNotFound            = http.StatusNotFound            // 404 资源不存在
	HTTPStatusConflict            = http.StatusConflict            // 409 资源冲突
	HTTPStatusInternalServerError = http.StatusInternalServerError // 500 系统内部错误
)

// --------------------------
// 2. 业务状态码常量（分层定义，便于维护）
// 规则：0开头=成功，4xx开头=客户端错误，5xx开头=服务端错误，1xxx=业务自定义错误
// --------------------------
const (
	// 通用成功状态码
	CodeSuccess = 0 // 通用成功

	// 通用客户端错误（对应HTTP 4xx）
	CodeBadRequest   = 400 // 通用参数错误/请求格式错误
	CodeUnauthorized = 401 // 未登录/Token失效
	CodeForbidden    = 403 // 无权限访问
	CodeNotFound     = 404 // 资源不存在
	CodeConflict     = 409 // 资源冲突（如重复创建）

	// 通用服务端错误（对应HTTP 5xx）
	CodeServerError    = 500 // 系统内部错误
	CodeServiceUnavail = 503 // 服务不可用

	// 业务自定义错误（示例：库存业务）
	CodeStockFileEmpty   = 1001 // 库存文件目录为空
	CodeStockColumnExist = 1002 // 库存日期列已存在
	CodeStockFileError   = 1003 // 库存文件读写错误
)

// --------------------------
// 3. 通用成功响应函数（高频使用）
// --------------------------

// Success 通用成功响应（默认HTTP 200 + 通用成功码 + 固定提示语）
// 场景：大部分接口的成功响应（无需自定义消息/状态码）
func Success(c *gin.Context, data interface{}) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code: CodeSuccess,
		Msg:  "操作成功",
		Data: data,
	})
}

// SuccessWithMessage 自定义提示语的成功响应（默认HTTP 200）
// 场景：需要自定义成功提示（如“库存统计成功”“文件删除成功”）
func SuccessWithMessage(c *gin.Context, msg string, data interface{}) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code:    CodeSuccess,
		Msg:     msg,
		Data:    data,
		Success: true,
	})
}

// SuccessWithStatus 自定义HTTP状态码的成功响应
// 场景：特殊成功场景（如创建资源返回201 Created）
func SuccessWithStatus(c *gin.Context, httpStatus int, data interface{}) {
	c.JSON(httpStatus, BaseResponse{
		Code:    CodeSuccess,
		Msg:     "操作成功",
		Data:    data,
		Success: true,
	})
}

// --------------------------
// 4. 通用失败响应函数（高频使用）
// --------------------------

// Fail 通用失败响应（默认HTTP 200 + 自定义业务码 + 提示语）
// 场景：前端需要自定义处理业务错误，但HTTP层面返回200（兼容老前端逻辑）
func Fail(c *gin.Context, code int, msg string) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}

// FailWithStatus 自定义HTTP状态码的失败响应（推荐标准用法）
// 场景：符合RESTful规范，HTTP状态码反映请求层面错误，业务码反映具体错误
func FailWithStatus(c *gin.Context, httpStatus, code int, msg string) {
	c.JSON(httpStatus, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}

// --------------------------
// 5. 快捷错误响应函数（简化高频错误场景）
// --------------------------

// BadRequest 参数错误快捷响应（HTTP 400 + 通用参数错误码）
// 场景：参数校验失败、请求格式错误等
func BadRequest(c *gin.Context, msg string) {
	FailWithStatus(c, HTTPStatusBadRequest, CodeBadRequest, msg)
}

// ServerError 系统错误快捷响应（HTTP 500 + 通用系统错误码）
// 场景：数据库错误、文件读写错误等服务端异常
func ServerError(c *gin.Context, msg string) {
	FailWithStatus(c, HTTPStatusInternalServerError, CodeServerError, msg)
}

// NotFound 资源不存在快捷响应（HTTP 404 + 资源不存在码）
// 场景：文件不存在、记录不存在等
func NotFound(c *gin.Context, msg string) {
	FailWithStatus(c, HTTPStatusNotFound, CodeNotFound, msg)
}
