package dao

import (
	"errors"
	"fmt"
	"go-gin/internal/model"
	"go-gin/pkg/db"
	"go-gin/pkg/logger"
	"strings"

	"gorm.io/gorm"
)

// ProductDao 商品数据访问层（单例模式，避免重复创建）
var ProductDao = new(productDao)

type productDao struct{}

// GetByBarCode 根据商品条码查询单条记录
func (d *productDao) GetByBarCode(barCode string) (*model.ProductInfo, error) {
	var product model.ProductInfo
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	result := dbConn.Where("bar_code = ?", barCode).First(&product)
	if result.Error != nil {
		// 优化：统一用errors.Is判断GORM错误
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			logger.Warnf("条码[%s]对应的商品不存在", barCode)
			return nil, nil // 记录不存在返回nil，不抛错，由service层处理
		}
		logger.Errorf("根据条码[%s]查询商品失败，错误：%v", barCode, result.Error)
		return nil, result.Error
	}
	return &product, nil
}

// ListByShop 根据店铺名查询商品列表（按产品名升序）
func (d *productDao) ListByShop(shop string) ([]model.ProductInfo, error) {
	var products []model.ProductInfo
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	result := dbConn.Where("shop = ?", shop).Order("product_name ASC").Find(&products)
	if result.Error != nil {
		// 优化：日志新增店铺名，提升排查效率
		logger.Errorf("根据店铺[%s]查询商品列表失败，错误：%v", shop, result.Error)
		return nil, result.Error
	}
	return products, nil
}

// ListAll 查询所有商品（按店铺升序，同店铺按产品名升序）
func (d *productDao) ListAll() ([]model.ProductInfo, error) {
	var products []model.ProductInfo
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	result := dbConn.Order("shop ASC, product_name ASC").Find(&products)
	if result.Error != nil {
		logger.Errorf("查询所有商品失败，错误：%v", result.Error)
		return nil, result.Error
	}
	return products, nil
}

// Create 插入商品数据（首次导入数据用，适配SQLite多唯一字段）
func (d *productDao) Create(product *model.ProductInfo) (uint, error) {
	dbConn := db.GetDB()
	result := dbConn.Create(product)
	if result.Error != nil {
		var errMsg string
		errStr := result.Error.Error()
		// 先判断是否是SQLite唯一约束冲突
		if strings.Contains(errStr, "UNIQUE constraint failed:") {
			// 逐个匹配唯一字段，识别具体重复字段
			switch {
			case strings.Contains(errStr, "business_code"):
				errMsg = fmt.Sprintf("新增商品失败：唯一标识重复（business_code：%s 已存在）", product.BusinessCode)
			case strings.Contains(errStr, "bar_code"):
				errMsg = fmt.Sprintf("新增商品失败：商品条码重复（bar_code：%s 已存在）", product.BarCode)
			case strings.Contains(errStr, "merchant_code"):
				errMsg = fmt.Sprintf("新增商品失败：商家标识重复（merchant_code：%s 已存在）", product.MerchantCode)
			default:
				errMsg = "新增商品失败：存在重复的唯一标识，请检查后重试"
			}
			errMsg += "，请更换后重试"
		} else {
			errMsg = fmt.Sprintf("新增商品数据失败，错误：%v", result.Error)
		}
		logger.Errorf(errMsg)
		return 0, errors.New(errMsg)
	}
	logger.Infof("单条新增商品成功，商品ID：%d，条码：%s", product.ID, product.BarCode)
	return product.ID, nil
}

// BatchCreate 批量插入商品数据（首次导入数据用）
func (d *productDao) BatchCreate(products []model.ProductInfo) error {
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	// 优化：新增空切片校验，避免无意义执行
	if len(products) == 0 {
		logger.Warnf("批量插入商品失败：传入的商品数据为空切片")
		return fmt.Errorf("批量插入商品失败：无有效商品数据")
	}
	result := dbConn.Create(&products)
	if result.Error != nil {
		var errMsg string
		// 优化：新增唯一索引冲突友好错误，与Create保持一致
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			errMsg = "批量插入商品失败：存在重复的唯一标识（business_code/bar_code/merchant_code），请检查后重试"
		} else {
			errMsg = fmt.Sprintf("批量插入商品数据失败，错误：%v", result.Error)
		}
		logger.Errorf(errMsg)
		return errors.New(errMsg)
	}
	// 优化：新增生效行数校验，避免0行插入的误导性日志
	if result.RowsAffected == 0 {
		logger.Warnf("批量插入商品警告：无商品数据被插入（传入%d条，生效0条）", len(products))
		return fmt.Errorf("批量插入商品失败：无有效商品数据被插入")
	}
	logger.Infof("批量插入商品成功，共%d条", result.RowsAffected)
	return nil
}

// ListAllWithPage 支持多值查询：barCode、businessCode改为[]string切片，空切片则不添加条件
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
	// 优化：避免包名变量名冲突
	dbConn := db.GetDB().Model(&model.ProductInfo{}).Order("shop ASC, product_name ASC")

	// 动态添加多值查询条件：切片长度>0时，用IN做多值匹配；长度=0时不添加条件
	if len(barCodes) > 0 {
		dbConn = dbConn.Where("bar_code IN (?)", barCodes) // GORM自动解析切片为IN (?, ?, ?)
	}
	if len(businessCodes) > 0 {
		dbConn = dbConn.Where("business_code IN (?)", businessCodes)
	}

	// 复用带条件的查询链，统计总条数（自动继承多值条件）
	var total int64
	if err := dbConn.Count(&total).Error; err != nil {
		// 优化：日志新增分页参数，提升排查效率
		logger.Errorf("条件查询商品总条数失败（page=%d,pageSize=%d），错误：%v", page, pageSize, err)
		return nil, 0, err
	}

	// 复用带条件的查询链，执行分页查询
	result := dbConn.Offset((page - 1) * pageSize).Limit(pageSize).Find(&products)
	if result.Error != nil {
		// 优化：日志新增分页参数，提升排查效率
		logger.Errorf("条件分页查询商品失败（page=%d,pageSize=%d），错误：%v", page, pageSize, result.Error)
		return nil, 0, result.Error
	}

	return products, total, nil
}

// GetByID 根据商品ID查询单条记录
func (d *productDao) GetByID(id uint) (*model.ProductInfo, error) {
	var product model.ProductInfo
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	result := dbConn.Where("id = ?", id).First(&product)
	if result.Error != nil {
		// 优化：统一用errors.Is判断GORM错误
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			logger.Warnf("ID[%d]对应的商品不存在", id)
			return nil, nil // 记录不存在返回nil，不抛错，由service层处理
		}
		logger.Errorf("根据ID[%d]查询商品失败，错误：%v", id, result.Error)
		return nil, result.Error
	}
	return &product, nil
}

// UpdateProduct 修改商品信息并返回更新后的完整结构体
// 优化：首字母大写，符合Go公共方法命名规范
func (d *productDao) UpdateProduct(product *model.ProductInfo) (*model.ProductInfo, error) {
	dbConn := db.GetDB() // 优化：避免包名变量名冲突
	// 1. 执行更新操作：WHERE id匹配 + 选择性更新非零值字段
	result := dbConn.Model(&model.ProductInfo{}).Where("id = ?", product.ID).Updates(product)
	if result.Error != nil {
		logger.Errorf("修改商品信息失败（ID：%d），错误：%v", product.ID, result.Error)
		return nil, result.Error
	}
	// 2. 校验更新行数：无匹配记录时返回错误（避免空更新）
	if result.RowsAffected == 0 {
		logger.Warnf("修改商品信息失败：无ID为%d的商品记录", product.ID)
		return nil, fmt.Errorf("无ID为%d的商品记录，更新失败", product.ID)
	}
	// 3. 重新查询数据库，获取更新后的完整结构体
	updatedProduct := &model.ProductInfo{}
	queryErr := dbConn.Where("id = ?", product.ID).First(updatedProduct).Error
	if queryErr != nil {
		logger.Errorf("查询更新后商品信息失败（ID：%d），错误：%v", product.ID, queryErr)
		return nil, queryErr
	}
	logger.Infof("修改商品信息成功，共%d条，ID：%d，条码：%s", result.RowsAffected, product.ID, updatedProduct.BarCode)
	return updatedProduct, nil
}
