package dao

import (
	"fmt"
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

// 支持多值查询：barCode、businessCode改为[]string切片，空切片则不添加条件
func (d *productDao) ListAllWithPage(page, pageSize int, barCodes []string, businessCodes []string) ([]model.ProductInfo, int64, error) {
	// 入参校验：分页参数+切片非nil（避免nil切片调用len()）
	if page < 1 || pageSize < 1 || pageSize > 100 {
		return nil, 0, fmt.Errorf("非法分页参数：page=%d, pageSize=%d", page, pageSize)
	}
	// 初始化空切片，防止上层传nil导致后续len()报错
	if barCodes == nil {
		barCodes = []string{}
	}
	if businessCodes == nil {
		businessCodes = []string{}
	}

	var products []model.ProductInfo
	// 初始化基础查询链
	db := db.GetDB().Model(&model.ProductInfo{}).Order("shop ASC, product_name ASC")

	// 动态添加多值查询条件：切片长度>0时，用IN做多值匹配；长度=0时不添加条件
	if len(barCodes) > 0 {
		db = db.Where("bar_code IN (?)", barCodes) // GORM自动解析切片为IN (?, ?, ?)
	}
	if len(businessCodes) > 0 {
		db = db.Where("business_code IN (?)", businessCodes)
	}

	// 复用带条件的查询链，统计总条数（自动继承多值条件）
	var total int64
	if err := db.Count(&total).Error; err != nil {
		logger.Errorf("条件查询商品总条数失败：%v", err)
		return nil, 0, err
	}

	// 复用带条件的查询链，执行分页查询
	result := db.Offset((page - 1) * pageSize).Limit(pageSize).Find(&products)
	if result.Error != nil {
		logger.Errorf("条件分页查询商品列表失败：%v", result.Error)
		return nil, 0, result.Error
	}

	return products, total, nil
}

// GetByID 根据商品ID查询单条记录
func (d *productDao) GetByID(id uint) (*model.ProductInfo, error) {
	var product model.ProductInfo
	db := db.GetDB()
	result := db.Where("id = ?", id).First(&product)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			logger.Warnf("ID[%d]对应的商品不存在", id)
			return nil, nil // 记录不存在返回nil，不抛错，由service层处理
		}
		logger.Errorf("根据ID查询商品失败：%v", result.Error)
		return nil, result.Error
	}
	return &product, nil
}

// updateProduct 修改商品信息
func (d *productDao) UpdateProduct(product *model.ProductInfo) error {
	db := db.GetDB()
	result := db.Model(&model.ProductInfo{}).Where("id = ?", product.ID).Updates(product)
	if result.Error != nil {
		logger.Errorf("修改商品信息失败：%v", result.Error)
		return result.Error
	}
	logger.Infof("修改商品信息成功，共%d条", result.RowsAffected)
	return nil
}
