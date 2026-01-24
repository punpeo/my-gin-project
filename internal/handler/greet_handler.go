package handler

import (
	"go-gin/internal/service"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// GreetHandler 打招呼接口的处理器
// 支持两种传参方式：
// 1. Query 参数：/api/v1/greet?name=张三
// 2. 默认值：不传 name 则返回给陌生人的问候
func GreetHandler(c *gin.Context) {
	// 1. 获取请求参数（从 Query 中获取 name）
	name := c.Query("name")

	// 2. 调用服务层的业务逻辑
	greetMsg := service.Greet(name)

	// 3. 返回统一格式的响应
	response.Success(c, gin.H{
		"greeting": greetMsg,
	})
}

// GreetPostHandler 支持 POST JSON 的打招呼接口
func GreetPostHandler(c *gin.Context) {
	// 1. 定义接收参数的结构体
	type GreetReq struct {
		Name string `json:"name" binding:"omitempty"` // omitempty 表示可选
	}

	var req GreetReq
	// 2. 绑定 JSON 参数
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 400, "参数错误："+err.Error())
		return
	}

	// 3. 调用服务层
	greetMsg := service.Greet(req.Name)

	// 4. 返回响应
	response.Success(c, gin.H{
		"greeting": greetMsg,
	})
}
func GetFilesNamesHandler(c *gin.Context) {
	// 调用服务层获取文件名列表
	fileNames := service.GetFilesNames()
	// 返回响应
	response.Success(c, gin.H{
		"file_names": fileNames,
	})
}
