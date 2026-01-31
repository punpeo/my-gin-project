package dao

import (
	"go-gin/internal/model"
	"go-gin/pkg/db"
	"go-gin/pkg/logger"

	"gorm.io/gorm"
)

// ProductDao 商品数据访问层（单例模式，避免重复创建）
var ProductDao = new(productDao)

type productDao struct{}

// GetByBarCode 根据商品条码查询单条记录
func (d *productDao) GetByBarCode(barCode string) (*model.ProductInfo, error) {
	var product model.ProductInfo
	db := db.GetDB()
	result := db.Where("bar_code = ?", barCode).First(&product)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			logger.Warnf("条码[%s]对应的商品不存在", barCode)
			return nil, nil // 记录不存在返回nil，不抛错，由service层处理
		}
		logger.Errorf("根据条码查询商品失败：%v", result.Error)
		return nil, result.Error
	}
	return &product, nil
}

// ListByShop 根据店铺名查询商品列表（按产品名升序）
func (d *productDao) ListByShop(shop string) ([]model.ProductInfo, error) {
	var products []model.ProductInfo
	db := db.GetDB()
	result := db.Where("shop = ?", shop).Order("product_name ASC").Find(&products)
	if result.Error != nil {
		logger.Errorf("根据店铺[%s]查询商品列表失败：%v", shop, result.Error)
		return nil, result.Error
	}
	return products, nil
}

// ListAll 查询所有商品（按店铺升序，同店铺按产品名升序）
func (d *productDao) ListAll() ([]model.ProductInfo, error) {
	var products []model.ProductInfo
	db := db.GetDB()
	result := db.Order("shop ASC, product_name ASC").Find(&products)
	if result.Error != nil {
		logger.Errorf("查询所有商品失败：%v", result.Error)
		return nil, result.Error
	}
	return products, nil
}

// BatchCreate 批量插入商品数据（首次导入数据用）
func (d *productDao) BatchCreate(products []model.ProductInfo) error {
	db := db.GetDB()
	result := db.Create(&products)
	if result.Error != nil {
		logger.Errorf("批量插入商品数据失败：%v", result.Error)
		return result.Error
	}
	logger.Infof("批量插入商品成功，共%d条", result.RowsAffected)
	return nil
}
