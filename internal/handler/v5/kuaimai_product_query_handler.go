package v5_handler

import (
	v5_service "go-gin/internal/service/v5"
	"go-gin/pkg/response"

	"github.com/gin-gonic/gin"
)

// KuaimaiProductQueryHandler 快麦商品查询控制器
type KuaimaiProductQueryHandler struct {
	querySvc *v5_service.KuaimaiProductQueryService
}

func NewKuaimaiProductQueryHandler() *KuaimaiProductQueryHandler {
	return &KuaimaiProductQueryHandler{
		querySvc: v5_service.NewKuaimaiProductQueryService(),
	}
}

// KuaimaiBarcodeQueryReq 请求入参
type KuaimaiBarcodeQueryReq struct {
	BarCode string `json:"barCode" form:"barCode" binding:"required"`
}

// QueryByBarcode 条码查询接口，GET/POST兼容
func (h *KuaimaiProductQueryHandler) QueryByBarcode(c *gin.Context) {
	var req KuaimaiBarcodeQueryReq
	if err := c.ShouldBind(&req); err != nil {
		response.BadRequest(c, "请求参数错误："+err.Error())
		return
	}

	list, err := h.querySvc.QueryByBarcodes(req.BarCode)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "查询成功", gin.H{
		"list": list,
	})
}
