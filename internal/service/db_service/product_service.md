package service

import (
	"bytes"
	"errors"
	"fmt"
	"go-gin/internal/dao"
	"go-gin/internal/model"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ProductService 商品服务层
var ProductService = new(productService)

type productService struct{}

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

func (s *productService) BatchImportProduct(fileContent []byte) error {
	// 1. 校验文件内容非空
	if len(fileContent) == 0 {
		return errors.New("上传的文件内容为空")
	}

	// 2. 读取Excel文件
	reader := bytes.NewReader(fileContent)
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return fmt.Errorf("解析Excel文件失败：%v", err)
	}
	defer f.Close()

	// 3. 获取第一个工作表（默认读取第一个sheet，适配单sheet上传）
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return fmt.Errorf("读取Excel工作表数据失败：%v", err)
	}

	// 4. 校验数据行（至少包含表头+1行数据）
	if len(rows) < 2 {
		return errors.New("Excel文件无有效数据，至少需要1行商品数据")
	}

	// 5. 解析数据行（跳过表头：第0行是标题，从第1行开始解析）
	var products []model.ProductInfo
	// 用于过滤重复条码（key：商品条码，value：是否存在）
	barCodeMap := make(map[string]bool)
	for rowIdx, row := range rows {
		// 跳过表头行
		if rowIdx == 0 {
			continue
		}

		// 校验行数据列数（必须包含5列：店铺/产品/商品条码/事业部编码/商家标识）
		if len(row) < 5 {
			return fmt.Errorf("第%d行数据不完整，需包含[店铺/产品/商品条码/事业部商品编码/商家商品标识]5列", rowIdx+1)
		}

		// 提取列数据并去除首尾空格（处理Excel中单元格空格问题）
		shop := strings.TrimSpace(row[0])
		productName := strings.TrimSpace(row[1])
		barCode := strings.TrimSpace(row[2])
		businessCode := strings.TrimSpace(row[3])
		merchantCode := strings.TrimSpace(row[4])

		// 核心字段非空校验
		if shop == "" {
			return fmt.Errorf("第%d行[店铺]字段不能为空", rowIdx+1)
		}
		if productName == "" {
			return fmt.Errorf("第%d行[产品]字段不能为空", rowIdx+1)
		}
		if barCode == "" {
			return fmt.Errorf("第%d行[商品条码]字段不能为空", rowIdx+1)
		}
		if businessCode == "" {
			return fmt.Errorf("第%d行[事业部商品编码]字段不能为空", rowIdx+1)
		}
		if merchantCode == "" {
			return fmt.Errorf("第%d行[商家商品标识]字段不能为空", rowIdx+1)
		}

		// 过滤重复条码（同文件内重复）
		if barCodeMap[barCode] {
			return fmt.Errorf("第%d行[商品条码：%s]重复，文件内存在相同条码", rowIdx+1, barCode)
		}
		barCodeMap[barCode] = true

		// 映射为ProductInfo模型
		products = append(products, model.ProductInfo{
			Shop:         shop,
			ProductName:  productName,
			BarCode:      barCode,
			BusinessCode: businessCode,
			MerchantCode: merchantCode,
		})
	}

	// 6. 校验有效数据量
	if len(products) == 0 {
		return errors.New("Excel文件中无有效商品数据")
	}

	// 7. 调用DAO层批量插入（数据库层已做唯一条码约束，防跨文件重复）
	return dao.ProductDao.BatchCreate(products)
}
