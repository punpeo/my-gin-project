package service

import (
	"bytes"
	"errors"
	"fmt"
	"go-gin/internal/dao"
	"go-gin/internal/model"
	"go-gin/pkg/logger"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ProductService 商品服务层
var ProductService = new(productService)

type productService struct{}

type PageQueryReq struct {
	CurrentPage   int      `form:"currentPage" json:"currentPage" binding:"required"`
	PageSize      int      `form:"pageSize" json:"pageSize" binding:"required"`
	BarCodes      []string `form:"barCodes" json:"barCodes" binding:"required"`
	BusinessCodes []string `form:"businessCodes" json:"businessCodes" binding:"required"`
}

type ShopGoods struct {
	ID           uint   `json:"id" binding:"required"`
	Shop         string `json:"shop" binding:"required"`
	ProductName  string `json:"product_name" binding:"required"`
	BarCode      string `json:"bar_code" binding:"required"`
	BusinessCode string `json:"business_code" binding:"required"`
	MerchantCode string `json:"merchant_code" binding:"required"`
}

// service/req.go 新增/导入商品相关请求结构体
// ShopGoodsReq 单条新增商品请求（适配手动录入单条数据）
type ShopGoodsReq struct {
	Shop         string `form:"shop" json:"shop" binding:"required"`                 // 店铺
	ProductName  string `form:"productName" json:"productName" binding:"required"`   // 产品名称
	BarCode      string `form:"barCode" json:"barCode" binding:"required"`           // 商品条码（唯一）
	BusinessCode string `form:"businessCode" json:"businessCode" binding:"required"` // 事业部编码
	MerchantCode string `form:"merchantCode" json:"merchantCode" binding:"required"` // 商家商品标识
}

// BatchShopGoodsReq 多条新增商品请求（适配手动批量录入）
type BatchShopGoodsReq struct {
	Products []ShopGoodsReq `json:"products" binding:"required,min=1"` // 商品列表，至少1条
}

// ExcelImportReq Excel文件批量导入请求（原有文件导入请求，单独抽离更清晰）
type ExcelImportReq struct {
	FileContent []byte `json:"fileContent" binding:"required"` // Excel文件二进制内容
}

// GetProductByBarCode 根据条码查询商品（业务逻辑：参数校验）
func (s *productService) GetProductByBarCode(barCode string) (*model.ProductInfo, error) {
	// 简单参数校验（可扩展更复杂的校验规则）
	if barCode == "" {
		return nil, fmt.Errorf("商品条码不能为空")
	}
	// 调用dao层方法
	return dao.ProductDao.GetByBarCode(barCode)
}

// ListProductByShop 根据店铺查询商品列表
func (s *productService) ListProductByShop(shop string) ([]model.ProductInfo, error) {
	if shop == "" {
		return nil, fmt.Errorf("店铺名称不能为空")
	}
	return dao.ProductDao.ListByShop(shop)
}

// ListAllProduct 查询所有商品
func (s *productService) ListAllProduct() ([]model.ProductInfo, error) {
	return dao.ProductDao.ListAll()
}

// Service层适配多值查询
func (s *productService) ListAllWithPage(page, pageSize int, barCodes []string, businessCodes []string) ([]model.ProductInfo, int64, error) {

	// 调用改造后的DAO层方法，透传切片参数
	products, total, err := dao.ProductDao.ListAllWithPage(page, pageSize, barCodes, businessCodes)
	if err != nil {
		logger.Errorf("调用DAO分页查询商品失败：%v", err)
		return nil, 0, err
	}

	return products, total, nil
}

// 根据ID精准查询商品
func (s *productService) GetByID(id uint) (*model.ProductInfo, error) {
	if id == 0 {
		return nil, fmt.Errorf("商品ID不能为空或0")
	}
	return dao.ProductDao.GetByID(id)
}

// UpdateProduct 修改商品信息
func (s *productService) UpdateProduct(product *ShopGoods) (*model.ProductInfo, error) {
	// 1. 入参非空校验
	if product == nil {
		return nil, fmt.Errorf("商品信息不能为空")
	}
	// 2. 业务层DTO(ShopGoods) 转换为 数据层Model(ProductInfo)
	productModel := &model.ProductInfo{
		ID:           product.ID,
		Shop:         product.Shop,
		ProductName:  product.ProductName,
		BarCode:      product.BarCode,
		BusinessCode: product.BusinessCode,
		MerchantCode: product.MerchantCode,
	}
	// 3. 调用Dao层方法，接收「更新后结构体+错误」
	updatedModel, err := dao.ProductDao.UpdateProduct(productModel)
	if err != nil {
		// 可在此添加Service层专属日志（如业务层面的错误记录）
		// logger.Errorf("Service层修改商品失败，ID：%d，错误：%v", product.ID, err)
		return nil, err
	}
	// 4. 成功则返回Dao层查询到的「更新后完整结构体」
	return updatedModel, nil
}

// -------------------------- 对外暴露的3个核心业务方法 --------------------------
// ImportByExcel Excel文件批量导入商品（原批量导入功能，适配新结构体）
func (s *productService) ImportByExcel(req *ExcelImportReq) error {
	// 1. 校验文件内容非空
	if len(req.FileContent) == 0 {
		return errors.New("上传的Excel文件内容为空")
	}

	// 2. 读取并解析Excel文件
	reader := bytes.NewReader(req.FileContent)
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return fmt.Errorf("解析Excel文件失败：%v", err)
	}
	defer f.Close()

	// 3. 获取第一个工作表数据
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return fmt.Errorf("读取Excel工作表数据失败：%v", err)
	}

	// 4. 校验数据行（至少表头+1行有效数据）
	if len(rows) < 2 {
		return errors.New("Excel文件无有效数据，至少需要1行商品数据")
	}

	// 5. 解析Excel行数据为ProductInfo模型
	var products []model.ProductInfo
	for rowIdx, row := range rows {
		if rowIdx == 0 { // 跳过表头
			continue
		}
		// 校验列数（必须包含5列：店铺/产品/条码/事业部编码/商家标识）
		if len(row) < 5 {
			return fmt.Errorf("Excel第%d行数据不完整，需包含[店铺/产品名称/商品条码/事业部商品编码/商家商品标识]5列", rowIdx+1)
		}

		// 提取并清洗数据（去除首尾空格）
		product := model.ProductInfo{
			Shop:         strings.TrimSpace(row[0]),
			ProductName:  strings.TrimSpace(row[1]),
			BarCode:      strings.TrimSpace(row[2]),
			BusinessCode: strings.TrimSpace(row[3]),
			MerchantCode: strings.TrimSpace(row[4]),
		}

		// 通用字段校验
		if err := s.validateProduct(&product, rowIdx+1); err != nil {
			return err
		}
		products = append(products, product)
	}

	// 6. 批量处理（重复条码校验+数据库插入）
	if err := s.batchProcessProducts(products); err != nil {
		return fmt.Errorf("Excel导入批量处理失败：%v", err)
	}
	return nil
}

// CreateOne 单条新增商品（适配手动录入单条数据）
func (s *productService) CreateOne(req *ShopGoodsReq) error {
	// 转换请求体为模型
	product := &model.ProductInfo{
		Shop:         req.Shop,
		ProductName:  req.ProductName,
		BarCode:      req.BarCode,
		BusinessCode: req.BusinessCode,
		MerchantCode: req.MerchantCode,
	}

	// 通用字段校验（行号传1，标识单条新增）
	if err := s.validateProduct(product, 1); err != nil {
		return fmt.Errorf("单条新增商品校验失败：%v", err)
	}

	// 调用批量处理方法（单条转切片）
	if err := s.batchProcessProducts([]model.ProductInfo{*product}); err != nil {
		return fmt.Errorf("单条新增商品失败：%v", err)
	}
	return nil
}

// CreateBatch 多条新增商品（适配手动批量录入，如前端批量提交）
func (s *productService) CreateBatch(req *BatchShopGoodsReq) error {
	var products []model.ProductInfo
	// 转换请求体为模型并逐行校验
	for idx, item := range req.Products {
		product := model.ProductInfo{
			Shop:         item.Shop,
			ProductName:  item.ProductName,
			BarCode:      item.BarCode,
			BusinessCode: item.BusinessCode,
			MerchantCode: item.MerchantCode,
		}
		// 通用字段校验（行号为idx+1，标识第N条数据）
		if err := s.validateProduct(&product, idx+1); err != nil {
			return fmt.Errorf("批量新增第%d条商品校验失败：%v", idx+1, err)
		}
		products = append(products, product)
	}

	// 批量处理（重复条码校验+数据库插入）
	if err := s.batchProcessProducts(products); err != nil {
		return fmt.Errorf("批量新增商品处理失败：%v", err)
	}
	return nil
}

// -------------------------- 内部通用方法（仅服务层内部调用） --------------------------
// validateProduct 商品数据通用校验（所有新增场景复用：字段非空）
// lineNum：行号/序号（Excel为行号，单条/多条为数据序号，用于精准报错）
func (s *productService) validateProduct(p *model.ProductInfo, lineNum int) error {
	// 非空校验
	if p.Shop == "" {
		return fmt.Errorf("第%d行[店铺]字段不能为空", lineNum)
	}
	if p.ProductName == "" {
		return fmt.Errorf("第%d行[产品名称]字段不能为空", lineNum)
	}
	if p.BarCode == "" {
		return fmt.Errorf("第%d行[商品条码]字段不能为空", lineNum)
	}
	if p.BusinessCode == "" {
		return fmt.Errorf("第%d行[事业部商品编码]字段不能为空", lineNum)
	}
	if p.MerchantCode == "" {
		return fmt.Errorf("第%d行[商家商品标识]字段不能为空", lineNum)
	}

	// 可扩展：添加条码格式校验（如必须为数字、固定长度）
	// if !regexp.MustCompile(`^\d{13}$`).MatchString(p.BarCode) {
	// 	return fmt.Errorf("第%d行[商品条码：%s]格式错误，需为13位数字", lineNum, p.BarCode)
	// }

	return nil
}

// batchProcessProducts 批量处理核心逻辑（所有批量场景复用：重复条码+数据库插入）
// 入参：已完成字段校验的ProductInfo切片
func (s *productService) batchProcessProducts(products []model.ProductInfo) error {
	// 校验有效数据量
	if len(products) == 0 {
		return errors.New("无有效商品数据可处理")
	}

	// 校验同请求内的重复条码（内存map，高效过滤）
	barCodeMap := make(map[string]int) // key：条码，value：行号/序号
	for idx, p := range products {
		if lineNum, exist := barCodeMap[p.BarCode]; exist {
			return fmt.Errorf("第%d行[商品条码：%s]与第%d行重复", idx+1, p.BarCode, lineNum)
		}
		barCodeMap[p.BarCode] = idx + 1
	}

	// 调用DAO层批量插入（数据库层需给BarCode加唯一索引，防跨请求重复）
	if err := dao.ProductDao.BatchCreate(products); err != nil {
		// 可扩展：解析数据库唯一索引错误，返回更友好的提示
		// if strings.Contains(err.Error(), "duplicate key") {
		// 	return errors.New("商品条码已存在，请勿重复导入")
		// }
		return fmt.Errorf("数据库批量插入失败：%v", err)
	}
	return nil
}
func (s *productService) AddProduct(req *ShopGoodsReq) (uint, error) {
	// 构造ProductInfo结构体（非指针，后续传地址）
	product := &model.ProductInfo{
		Shop:         req.Shop,
		ProductName:  req.ProductName,
		BarCode:      req.BarCode,
		BusinessCode: req.BusinessCode,
		MerchantCode: req.MerchantCode,
		// 其他字段赋值...
	}
	// 调用DAO层单条新增方法，获取自增ID
	productID, err := dao.ProductDao.Create(product)
	if err != nil {
		return 0, fmt.Errorf("新增商品失败：%v", err)
	}
	// 插入后，product.ID 也已被赋值，与返回的productID一致
	logger.Infof("商品新增成功，ID：%d（双重验证）", product.ID)
	return productID, nil
}
