package v5_service

import (
	"errors"
	"go-gin/internal/model"
	"strings"
)

// KuaimaiBarcodeQueryResp 单条查询返回结构
type KuaimaiBarcodeQueryResp struct {
	ModelName string `json:"model_name"` // 型号名称
	Barcode   string `json:"barcode"`    // 商品条码
}

// KuaimaiProductQueryService 快麦条码查询服务
type KuaimaiProductQueryService struct{}

// NewKuaimaiProductQueryService 实例化
func NewKuaimaiProductQueryService() *KuaimaiProductQueryService {
	return &KuaimaiProductQueryService{}
}

// QueryByBarcodes 支持单个/多个条码逗号分隔批量查询
func (s *KuaimaiProductQueryService) QueryByBarcodes(barcodeStr string) ([]KuaimaiBarcodeQueryResp, error) {
	barcodeStr = strings.TrimSpace(barcodeStr)
	if barcodeStr == "" {
		return nil, errors.New("条码不能为空，多个条码请用英文逗号分隔")
	}
	// 分割多条条码
	barcodeArr := strings.Split(barcodeStr, ",")
	var result []KuaimaiBarcodeQueryResp

	for _, code := range barcodeArr {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		modelName, ok := model.GetModelByBarcode(code)
		if !ok {
			// 不存在的条码跳过，不阻断整体查询
			continue
		}
		result = append(result, KuaimaiBarcodeQueryResp{
			ModelName: modelName,
			Barcode:   code,
		})
	}

	if len(result) == 0 {
		return nil, errors.New("未匹配到任何对应型号，请检查条码是否正确")
	}
	return result, nil
}
