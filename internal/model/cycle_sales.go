package model

// CycleSalesRequest 产品周期销量统计请求参数
type CycleSalesRequest struct {
	BasePath     string `json:"base_path" binding:"required"`      // 根目录
	BaseFileName string `json:"base_file_name" binding:"required"` // 基准文件名
	StartColumn  string `json:"start_column" binding:"required"`   // 起始列（如C）
	EndColumn    string `json:"end_column" binding:"required"`     // 结束列（如D）
}

// CycleSalesResult 销量统计结果（移除 TotalSales 字段）
type CycleSalesResult struct {
	FileName     string     // 结果文件名
	Data         [][]string // 结果数据
	ProductCount int        // 产品数量
	CycleDays    int        // 周期天数
	// 移除 TotalSales 字段
}
