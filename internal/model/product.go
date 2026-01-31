package model

// ProductInfo 商品信息表GORM模型（与数据库表product_info映射）
// 标签说明：gorm标签控制数据库表结构，json标签控制接口返回格式
type ProductInfo struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`                    // 自增主键
	Shop         string `gorm:"type:varchar(50);not null;index" json:"shop"`           // 店铺名，非空+索引（按店铺查询高频）
	ProductName  string `gorm:"type:varchar(100);not null;index" json:"product_name"`  // 产品名，非空+索引（模糊查询高频）
	BarCode      string `gorm:"type:varchar(30);not null;unique" json:"bar_code"`      // 商品条码，非空+唯一（防止重复）
	BusinessCode string `gorm:"type:varchar(30);not null;unique" json:"business_code"` // 事业部编码，非空+唯一
	MerchantCode string `gorm:"type:varchar(30);not null;unique" json:"merchant_code"` // 商家标识，非空+唯一
}

// TableName 显式指定数据库表名（GORM默认是结构体名小写复数，此处指定更规范）
func (p ProductInfo) TableName() string {
	return "product_info"
}
