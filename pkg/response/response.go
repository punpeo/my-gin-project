package response

import "github.com/gin-gonic/gin"

// 基础响应结构体
type BaseResponse struct {
	Code int         `json:"code"` // 业务状态码
	Msg  string      `json:"msg"`  // 提示信息
	Data interface{} `json:"data"` // 响应数据
}

// HTTP状态码常量定义
const (
	HTTPStatusOK           = 200 // 成功
	HTTPStatusBadRequest   = 400 // 参数错误
	HTTPStatusUnauthorized = 401 // 未授权
	HTTPStatusForbidden    = 403 // 禁止访问
	HTTPStatusNotFound     = 404 // 资源不存在
	HTTPStatusConflict     = 409 // 资源冲突
	HTTPStatusServerError  = 500 // 服务器内部错误
	HTTPStatusServiceError = 503 // 服务不可用
)

// 业务状态码常量定义（在HTTP状态码基础上细化）
const (
	// 成功状态码
	CodeSuccess = 20000 // 通用成功

	// 客户端错误 4xx
	CodeBadRequest       = 40000 // 通用客户端错误
	CodeValidationError  = 40001 // 参数验证失败
	CodeParamRequired    = 40002 // 参数缺失
	CodeParamInvalid     = 40003 // 参数格式错误
	CodeResourceNotFound = 40400 // 资源不存在
	CodeFileNotFound     = 40401 // 文件不存在
	CodeDataNotFound     = 40402 // 数据不存在
	CodeUnauthorized     = 40100 // 未授权
	CodeForbidden        = 40300 // 禁止访问
	CodeConflict         = 40900 // 资源冲突
	CodeRequestTimeout   = 40800 // 请求超时
	CodeTooManyRequests  = 42900 // 请求过多

	// 服务器错误 5xx
	CodeServerError          = 50000 // 通用服务器错误
	CodeDatabaseError        = 50001 // 数据库错误
	CodeFileSystemError      = 50002 // 文件系统错误
	CodeNetworkError         = 50003 // 网络错误
	CodeExternalServiceError = 50004 // 外部服务错误
	CodeBusinessLogicError   = 50005 // 业务逻辑错误
	CodeServiceUnavailable   = 50300 // 服务不可用
	CodeGatewayTimeout       = 50400 // 网关超时

	// 业务特定错误码（可以根据具体业务扩展）
	CodeExcelProcessingError = 51000 // Excel处理错误
	CodeExcelFileError       = 51001 // Excel文件错误
	CodeExcelDataError       = 51002 // Excel数据错误
	CodeExcelTemplateError   = 51003 // Excel模板错误
	CodeFileProcessingError  = 52000 // 文件处理错误
	CodeDataProcessingError  = 53000 // 数据处理错误
	CodeStatisticsError      = 54000 // 统计错误
	CodeExportError          = 55000 // 导出错误
)

// Success 成功响应（通用） - 保持兼容
func Success(c *gin.Context, data interface{}) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code: CodeSuccess,
		Msg:  "success",
		Data: data,
	})
}

// Fail 失败响应（通用） - 保持兼容
func Fail(c *gin.Context, code int, msg string) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}

// SuccessWithStatus 成功响应（可指定HTTP状态码）
func SuccessWithStatus(c *gin.Context, httpStatus int, data interface{}) {
	c.JSON(httpStatus, BaseResponse{
		Code: CodeSuccess,
		Msg:  "success",
		Data: data,
	})
}

// FailWithStatus 失败响应（可指定HTTP状态码和业务状态码）
func FailWithStatus(c *gin.Context, httpStatus, code int, msg string) {
	c.JSON(httpStatus, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}

// 预定义的便捷方法

// BadRequest 参数错误
func BadRequest(c *gin.Context, msg string) {
	c.JSON(HTTPStatusBadRequest, BaseResponse{
		Code: CodeBadRequest,
		Msg:  msg,
		Data: nil,
	})
}

// ValidationError 参数验证错误
func ValidationError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusBadRequest, BaseResponse{
		Code: CodeValidationError,
		Msg:  msg,
		Data: nil,
	})
}

// ParamRequiredError 参数缺失错误
func ParamRequiredError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusBadRequest, BaseResponse{
		Code: CodeParamRequired,
		Msg:  msg,
		Data: nil,
	})
}

// Unauthorized 未授权
func Unauthorized(c *gin.Context, msg string) {
	c.JSON(HTTPStatusUnauthorized, BaseResponse{
		Code: CodeUnauthorized,
		Msg:  msg,
		Data: nil,
	})
}

// Forbidden 禁止访问
func Forbidden(c *gin.Context, msg string) {
	c.JSON(HTTPStatusForbidden, BaseResponse{
		Code: CodeForbidden,
		Msg:  msg,
		Data: nil,
	})
}

// NotFound 资源不存在
func NotFound(c *gin.Context, msg string) {
	c.JSON(HTTPStatusNotFound, BaseResponse{
		Code: CodeResourceNotFound,
		Msg:  msg,
		Data: nil,
	})
}

// FileNotFound 文件不存在
func FileNotFound(c *gin.Context, msg string) {
	c.JSON(HTTPStatusNotFound, BaseResponse{
		Code: CodeFileNotFound,
		Msg:  msg,
		Data: nil,
	})
}

// DataNotFound 数据不存在
func DataNotFound(c *gin.Context, msg string) {
	c.JSON(HTTPStatusNotFound, BaseResponse{
		Code: CodeDataNotFound,
		Msg:  msg,
		Data: nil,
	})
}

// Conflict 资源冲突
func Conflict(c *gin.Context, msg string) {
	c.JSON(HTTPStatusConflict, BaseResponse{
		Code: CodeConflict,
		Msg:  msg,
		Data: nil,
	})
}

// RequestTimeout 请求超时
func RequestTimeout(c *gin.Context, msg string) {
	c.JSON(HTTPStatusBadRequest, BaseResponse{
		Code: CodeRequestTimeout,
		Msg:  msg,
		Data: nil,
	})
}

// TooManyRequests 请求过多
func TooManyRequests(c *gin.Context, msg string) {
	c.JSON(429, BaseResponse{
		Code: CodeTooManyRequests,
		Msg:  msg,
		Data: nil,
	})
}

// InternalServerError 服务器内部错误
func InternalServerError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeServerError,
		Msg:  msg,
		Data: nil,
	})
}

// DatabaseError 数据库错误
func DatabaseError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeDatabaseError,
		Msg:  msg,
		Data: nil,
	})
}

// FileSystemError 文件系统错误
func FileSystemError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeFileSystemError,
		Msg:  msg,
		Data: nil,
	})
}

// BusinessLogicError 业务逻辑错误
func BusinessLogicError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeBusinessLogicError,
		Msg:  msg,
		Data: nil,
	})
}

// ExcelProcessingError Excel处理错误
func ExcelProcessingError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeExcelProcessingError,
		Msg:  msg,
		Data: nil,
	})
}

// ExcelFileError Excel文件错误
func ExcelFileError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeExcelFileError,
		Msg:  msg,
		Data: nil,
	})
}

// ExcelDataError Excel数据错误
func ExcelDataError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeExcelDataError,
		Msg:  msg,
		Data: nil,
	})
}

// FileProcessingError 文件处理错误
func FileProcessingError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeFileProcessingError,
		Msg:  msg,
		Data: nil,
	})
}

// DataProcessingError 数据处理错误
func DataProcessingError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeDataProcessingError,
		Msg:  msg,
		Data: nil,
	})
}

// StatisticsError 统计错误
func StatisticsError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeStatisticsError,
		Msg:  msg,
		Data: nil,
	})
}

// ExportError 导出错误
func ExportError(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServerError, BaseResponse{
		Code: CodeExportError,
		Msg:  msg,
		Data: nil,
	})
}

// ServiceUnavailable 服务不可用
func ServiceUnavailable(c *gin.Context, msg string) {
	c.JSON(HTTPStatusServiceError, BaseResponse{
		Code: CodeServiceUnavailable,
		Msg:  msg,
		Data: nil,
	})
}

// GatewayTimeout 网关超时
func GatewayTimeout(c *gin.Context, msg string) {
	c.JSON(504, BaseResponse{
		Code: CodeGatewayTimeout,
		Msg:  msg,
		Data: nil,
	})
}

// SuccessWithMessage 成功响应（自定义消息）
func SuccessWithMessage(c *gin.Context, msg string, data interface{}) {
	c.JSON(HTTPStatusOK, BaseResponse{
		Code: CodeSuccess,
		Msg:  msg,
		Data: data,
	})
}

// Error 统一错误处理（推荐使用）
func Error(c *gin.Context, httpStatus, code int, msg string) {
	c.JSON(httpStatus, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}
