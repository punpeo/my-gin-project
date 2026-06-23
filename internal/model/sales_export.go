package model

// ===================== 请求结构体 =====================
// 销售SKU汇总导出请求
type SalesExportReq struct {
	ShopName   string `json:"shop_name" form:"shop_name" binding:"required"`
	SourceMode string `json:"source_mode" form:"source_mode" binding:"oneof=base64 dir"`
	FileBase64 string `json:"file_base64" form:"file_base64"`
	FileName   string `json:"file_name" form:"file_name"`
}

// 清理数据源文件请求
type CleanSourceReq struct {
}

// ===================== 统一返回结构体 =====================
type SalesExportResp struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data *ExportData `json:"data,omitempty"`
}

// 导出成功返回文件信息
type ExportData struct {
	FilePath string `json:"file_path"`
	FileName string `json:"file_name"`
}

// 清理文件返回
type CleanSourceResp struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

// ===================== 业务数据实体 =====================
// 单条原始销售记录
type SaleRecord struct {
	Sku         string  // B列切片下标1：商品SKU
	Amount      string  // H列切片下标7：金额字符串
	ProductNum  float64 // I列切片下标8：件数
	CustomerNum float64 // K列切片下标10：客户数
}

// 单个SKU汇总统计数据
type SkuStat struct {
	SkuCode       string  // SKU编码
	ModelName     string  // 对应商品型号名称
	TotalAmount   float64 // SKU总成交金额
	TotalProduct  float64 // SKU总成交件数
	TotalCustomer float64 // SKU总客户数
}

// 单个型号汇总统计数据
type ModelStat struct {
	ModelName     string  // 型号名称
	TotalAmount   float64 // 型号总金额
	TotalProduct  float64 // 型号总件数
	TotalCustomer float64 // 型号总客户数
}

// 单店铺整体汇总
type ShopStat struct {
	ShopName      string      // 店铺名称
	SkuStatList   []SkuStat   // 店铺下全部SKU明细
	ModelStatList []ModelStat // 店铺下全部型号汇总
	ShopTotalAmt  float64     // 店铺总金额
	ShopTotalNum  float64     // 店铺总件数
	ShopTotalCus  float64     // 店铺总客户数
}
