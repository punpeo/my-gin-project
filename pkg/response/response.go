package response

import "github.com/gin-gonic/gin"

// 基础响应结构体
type BaseResponse struct {
	Code int         `json:"code"` // 业务状态码
	Msg  string      `json:"msg"`  // 提示信息
	Data interface{} `json:"data"` // 响应数据
}

// Success 成功响应（通用）
func Success(c *gin.Context, data interface{}) {
	c.JSON(200, BaseResponse{
		Code: 200,
		Msg:  "success",
		Data: data,
	})
}

// Fail 失败响应（通用）
func Fail(c *gin.Context, code int, msg string) {
	c.JSON(200, BaseResponse{
		Code: code,
		Msg:  msg,
		Data: nil,
	})
}
