package v3_service

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"go-gin/config"
	"go-gin/internal/model"

	"github.com/xuri/excelize/v2"
)

// SalesExport 主导出业务逻辑
func SalesExport(req model.SalesExportReq) (*model.ExportData, error) {
	cfg := config.GlobalConfig.SalesExport

	// 1. 校验店铺是否合法
	allShops := model.GetAllShopGroup()
	shopValid := false
	for _, shop := range allShops {
		if shop.ShopName == req.ShopName {
			shopValid = true
			break
		}
	}
	if !shopValid {
		return nil, errors.New("指定店铺不存在")
	}

	// 2. 读取配置目录下所有销售Excel源文件
	sourceDir := cfg.SourceDir
	globPattern := filepath.Join(sourceDir, "*.xlsx")
	filePaths, err := filepath.Glob(globPattern)
	if err != nil {
		return nil, fmt.Errorf("扫描数据源目录失败: %w", err)
	}

	var allSaleRecords []model.SaleRecord
	for _, filePath := range filePaths {
		fileName := filepath.Base(filePath)
		// 过滤Excel临时隐藏缓存文件 ~$xxx.xlsx
		if strings.HasPrefix(fileName, "~$") {
			continue
		}

		records, readErr := readSingleSaleExcel(filePath)
		if readErr != nil {
			log.Printf("文件[%s]读取失败，跳过：%v", fileName, readErr)
			continue
		}
		allSaleRecords = append(allSaleRecords, records...)
	}

	if len(allSaleRecords) == 0 {
		return nil, errors.New("未读取到任何有效销售数据")
	}

	// 3. 构建SKU -> 店铺+型号映射关系
	type skuBind struct {
		Shop  string
		Model string
	}
	skuBindMap := make(map[string]skuBind)
	shopStatMap := make(map[string]*model.ShopStat)

	for _, shop := range allShops {
		if shop.ShopName != req.ShopName {
			continue
		}
		shopStatMap[shop.ShopName] = &model.ShopStat{
			ShopName:      shop.ShopName,
			SkuStatList:   make([]model.SkuStat, 0),
			ModelStatList: make([]model.ModelStat, 0),
		}
		// 填充型号结构 + SKU绑定
		for _, mg := range shop.ModelGroups {
			modelItem := model.ModelStat{
				ModelName: mg.ModelName,
			}
			shopStatMap[shop.ShopName].ModelStatList = append(shopStatMap[shop.ShopName].ModelStatList, modelItem)
			for _, skuItem := range mg.SkuList {
				skuBindMap[skuItem.SkuCode] = skuBind{
					Shop:  shop.ShopName,
					Model: mg.ModelName,
				}
			}
		}
	}

	// 4. 按SKU聚合统计金额、件数、客户数
	skuStatMap := make(map[string]*model.SkuStat)
	for _, record := range allSaleRecords {
		bindInfo, exist := skuBindMap[record.Sku]
		if !exist {
			// 屏蔽合计行无用日志
			if record.Sku != "合计" {
				log.Printf("SKU[%s]无匹配店铺型号，跳过", record.Sku)
			}
			continue
		}
		shopStat := shopStatMap[bindInfo.Shop]
		// 首次出现新建SKU统计对象
		if _, ok := skuStatMap[record.Sku]; !ok {
			skuStatMap[record.Sku] = &model.SkuStat{
				SkuCode:   record.Sku,
				ModelName: bindInfo.Model,
			}
		}
		skuSt := skuStatMap[record.Sku]

		// 金额累加
		amtVal, parseErr := strconv.ParseFloat(record.Amount, 64)
		if parseErr == nil {
			skuSt.TotalAmount += amtVal
			shopStat.ShopTotalAmt += amtVal
			// 同步累加对应型号总额
			for i := range shopStat.ModelStatList {
				if shopStat.ModelStatList[i].ModelName == bindInfo.Model {
					shopStat.ModelStatList[i].TotalAmount += amtVal
					break
				}
			}
		}

		// 件数、客户数累加
		skuSt.TotalProduct += record.ProductNum
		shopStat.ShopTotalNum += record.ProductNum

		skuSt.TotalCustomer += record.CustomerNum
		shopStat.ShopTotalCus += record.CustomerNum

		// 同步型号件数、客户数
		for i := range shopStat.ModelStatList {
			if shopStat.ModelStatList[i].ModelName == bindInfo.Model {
				shopStat.ModelStatList[i].TotalProduct += record.ProductNum
				shopStat.ModelStatList[i].TotalCustomer += record.CustomerNum
				break
			}
		}
	}

	// 5. 拼接模板、输出文件路径（统一 E:\sales_data）
	templateFullPath := filepath.Join(cfg.OutputDir, cfg.Template)
	resultFileName := "统计结果.xlsx"
	resultFullPath := filepath.Join(cfg.OutputDir, resultFileName)

	// 打印拼接完整模板路径日志，用于排查
	log.Printf("【模板路径校验】拼接完整路径：%s", templateFullPath)

	// 确保输出目录存在
	if err := os.MkdirAll(cfg.OutputDir, 0755); err != nil {
		return nil, fmt.Errorf("创建输出目录失败: %w", err)
	}

	// 预校验模板文件
	statInfo, err := os.Stat(templateFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("模板文件不存在，请检查路径 %s", templateFullPath)
		}
		return nil, fmt.Errorf("读取模板文件信息失败: %w", err)
	}
	log.Printf("【模板校验通过】文件名：%s，文件大小：%d byte", statInfo.Name(), statInfo.Size())

	// 填充模板生成结果文件
	fillErr := fillTemplateExcel(skuStatMap, templateFullPath, resultFullPath)
	if fillErr != nil {
		return nil, fmt.Errorf("模板填充生成结果失败: %w", fillErr)
	}

	return &model.ExportData{
		FilePath: resultFullPath,
		FileName: resultFileName,
	}, nil
}

// ClearSourceFile 清理原始销售数据源
// 仅删除source_dir下业务Excel，保留模板.xlsx、统计结果.xlsx
func ClearSourceFile() error {
	cfg := config.GlobalConfig.SalesExport
	sourceDir := cfg.SourceDir
	globPattern := filepath.Join(sourceDir, "*.xlsx")
	fileList, err := filepath.Glob(globPattern)
	if err != nil {
		return fmt.Errorf("遍历数据源目录失败: %w", err)
	}
	templateName := cfg.Template
	resultName := "统计结果.xlsx"

	for _, fp := range fileList {
		name := filepath.Base(fp)
		// 跳过模板与结果报表
		if name == templateName || name == resultName {
			continue
		}
		// 跳过临时缓存文件
		if strings.HasPrefix(name, "~$") {
			continue
		}
		_ = os.Remove(fp)
	}
	return nil
}

// readSingleSaleExcel 读取单份销售Excel报表
func readSingleSaleExcel(filePath string) ([]model.SaleRecord, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheetNames := f.GetSheetList()
	if len(sheetNames) == 0 {
		return nil, errors.New("excel无工作表")
	}
	sheet := sheetNames[0]
	rowIter, err := f.Rows(sheet)
	if err != nil {
		return nil, err
	}
	defer rowIter.Close()

	var recordList []model.SaleRecord
	rowIndex := 0

	for rowIter.Next() {
		// 跳过表头第一行
		if rowIndex == 0 {
			rowIndex++
			continue
		}
		cells, cellErr := rowIter.Columns()
		if cellErr != nil {
			continue
		}
		// I列下标8无数据则跳过
		if len(cells) <= 8 || strings.TrimSpace(cells[8]) == "" {
			continue
		}
		prodNum, parseErr := strconv.ParseFloat(strings.TrimSpace(cells[8]), 64)
		if parseErr != nil || prodNum <= 0 {
			continue
		}

		// 提取各列字段
		sku := ""
		if len(cells) > 1 {
			sku = strings.TrimSpace(cells[1])
		}
		amount := ""
		if len(cells) > 7 {
			amount = strings.TrimSpace(cells[7])
		}
		customerNum := float64(0)
		if len(cells) > 10 && strings.TrimSpace(cells[10]) != "" {
			val, err := strconv.ParseFloat(strings.TrimSpace(cells[10]), 64)
			if err == nil {
				customerNum = val
			}
		}

		recordList = append(recordList, model.SaleRecord{
			Sku:         sku,
			Amount:      amount,
			ProductNum:  prodNum,
			CustomerNum: customerNum,
		})
		rowIndex++
	}
	return recordList, nil
}

// fillTemplateExcel 模板填充逻辑
// colIdx=0(A)忽略；1,3,5奇数下标(B/D/F)忽略；仅2,4,6偶数下标(C/E/G)写入SKU数据
func fillTemplateExcel(skuMap map[string]*model.SkuStat, templatePath, outputPath string) error {
	f, err := excelize.OpenFile(templatePath)
	if err != nil {
		return err
	}
	defer f.Close()

	sheetList := f.GetSheetList()
	if len(sheetList) == 0 {
		return errors.New("模板无工作表")
	}
	sheetName := sheetList[0]
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return err
	}

	// 存储店铺名称对应Excel行号
	shopRowMap := make(map[string]int)
	for rowIdx, rowCells := range rows {
		excelRowNum := rowIdx + 1
		if len(rowCells) == 0 {
			continue
		}
		cellVal := strings.TrimSpace(rowCells[0])
		if cellVal == "" || cellVal == "销售额" || cellVal == "订单件数" || cellVal == "订单量" {
			continue
		}
		shopRowMap[cellVal] = excelRowNum
	}

	// 遍历每个店铺行，匹配SKU填充
	for shopName, baseExcelRow := range shopRowMap {
		sliceRowIdx := baseExcelRow - 1
		if sliceRowIdx >= len(rows) {
			log.Printf("店铺[%s]行超出模板范围，跳过", shopName)
			continue
		}
		rowCells := rows[sliceRowIdx]

		for colIdx, cellText := range rowCells {
			// 过滤规则：A列0、所有奇数下标全部跳过
			if colIdx == 0 || colIdx%2 == 1 {
				continue
			}
			skuCode := strings.TrimSpace(cellText)
			if skuCode == "" {
				continue
			}
			skuInfo, exist := skuMap[skuCode]
			if !exist {
				log.Printf("模板SKU[%s]无统计数据，跳过填充", skuCode)
				continue
			}

			excelCol := colIdx + 1
			// 写入三行：金额、件数、客户数
			rowAmount := baseExcelRow + 1
			rowProduct := baseExcelRow + 2
			rowCustomer := baseExcelRow + 3

			cellAmt, _ := excelize.CoordinatesToCellName(excelCol, rowAmount)
			cellProd, _ := excelize.CoordinatesToCellName(excelCol, rowProduct)
			cellCus, _ := excelize.CoordinatesToCellName(excelCol, rowCustomer)

			_ = f.SetCellValue(sheetName, cellAmt, skuInfo.TotalAmount)
			_ = f.SetCellValue(sheetName, cellProd, skuInfo.TotalProduct)
			_ = f.SetCellValue(sheetName, cellCus, skuInfo.TotalCustomer)
		}
	}

	// 另存为结果文件
	return f.SaveAs(outputPath)
}
