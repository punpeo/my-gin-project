package service

import (
	"bytes" // 新增：导入bytes包
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ========== 结构体定义 ==========
type ShopSummary struct {
	ShopName         string   // 店铺名称
	OrderIDs         []string // 订单号列表（去重）
	UniqueOrderCount int      // 去重后订单数量
	UniqueAmount     float64  // 去重后订单金额总和（数字）
}

type ShopOrder struct {
	ShopName   string   // 店铺名称
	OrderIDs   []string // 该店铺下所有订单号（含重复）
	OrderCount int      // 订单数量（含重复）
}

type OrderSummaryResult struct {
	TotalUniqueOrder  int      `json:"total_unique_order"`  // 去重后总订单数
	TotalUniqueAmount float64  `json:"total_unique_amount"` // 去重后总金额
	TotalOrderCount   int      `json:"total_order_count"`   // 全量订单数（含重复）
	DuplicateCount    int      `json:"duplicate_count"`     // 重复订单数
	DuplicateMessages []string `json:"duplicate_messages"`  // 重复订单提示
	ShopCount         int      `json:"shop_count"`          // 店铺数量
}

// 新增工具函数：确保删除默认的Sheet1
func removeDefaultSheet1(f *excelize.File) error {
	// 先获取所有工作表名称
	sheets := f.GetSheetList()
	for _, sheet := range sheets {
		if sheet == "Sheet1" {
			// 删除Sheet1
			if err := f.DeleteSheet("Sheet1"); err != nil {
				return fmt.Errorf("删除默认Sheet1失败：%v", err)
			}
			log.Println("成功删除默认Sheet1")
			break
		}
	}
	return nil
}

// DownloadTemplate 生成并返回订单汇总模板文件（budan.xlsx）
func DownloadTemplate() ([]byte, error) {
	// 创建新的Excel文件作为模板
	f := excelize.NewFile()

	// 核心修改1：创建文件后立即删除Sheet1（提前删除，避免残留）
	if err := removeDefaultSheet1(f); err != nil {
		return nil, err
	}

	// 创建模板工作表
	sheetName := "订单数据模板"
	idx, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, fmt.Errorf("创建模板工作表失败：%v", err)
	}
	f.SetActiveSheet(idx)

	// 写入表头（A:店铺名称, B:订单号, C:订单金额）
	headers := []string{"店铺名称", "订单号", "订单金额"}
	for colIdx, header := range headers {
		cell := fmt.Sprintf("%c%d", 'A'+colIdx, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// 写入示例行（可选，方便用户理解）
	f.SetCellValue(sheetName, "A2", "示例店铺1")
	f.SetCellValue(sheetName, "B2", "NO123456")
	f.SetCellValue(sheetName, "C2", "100.00")
	f.SetCellValue(sheetName, "A3", "示例店铺2")
	f.SetCellValue(sheetName, "B3", "NO789012")
	f.SetCellValue(sheetName, "C3", "200.50")

	// 保存前再次验证：确保没有Sheet1
	if err := removeDefaultSheet1(f); err != nil {
		return nil, err
	}

	// 保存到字节流
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, fmt.Errorf("生成模板文件失败：%v", err)
	}

	return buf.Bytes(), nil
}

// ProcessOrderExcel 处理上传的订单Excel文件，返回结果文件和统计信息
func ProcessOrderExcel(fileBytes []byte) ([]byte, *OrderSummaryResult, error) {
	// 1. 解析上传的Excel文件 - 修复类型不匹配问题
	reader := bytes.NewReader(fileBytes) // 将[]byte包装成io.Reader
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return nil, nil, fmt.Errorf("解析上传文件失败：%v", err)
	}
	defer f.Close()

	// 2. 读取源文件基础数据
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, nil, fmt.Errorf("读取工作表数据失败：%v", err)
	}
	// 修复：仅当行数为0时判定为无数据
	if len(rows) == 0 {
		return nil, nil, fmt.Errorf("上传文件无数据")
	}
	// 新增：检查是否只有表头无数据行
	hasDataRow := false
	for rowIdx, row := range rows {
		if rowIdx == 0 { // 跳过表头
			continue
		}
		// 只要有一行非空行，就判定为有数据
		if len(row) > 0 {
			hasDataRow = true
			break
		}
	}
	if !hasDataRow {
		return nil, nil, fmt.Errorf("上传文件仅有表头，无有效数据行")
	}

	// 3. 定位核心列索引
	headerRow := rows[0]
	colShopName, colOrderID, colAmount := -1, -1, -1
	for idx, header := range headerRow {
		// 修复：表头匹配时忽略空格，增强兼容性
		trimmedHeader := strings.TrimSpace(header)
		switch trimmedHeader {
		case "店铺名称":
			colShopName = idx
		case "订单号":
			colOrderID = idx
		case "订单金额":
			colAmount = idx
		}
	}
	if colShopName == -1 || colOrderID == -1 || colAmount == -1 {
		return nil, nil, fmt.Errorf("未找到指定列（店铺名称/订单号/订单金额），请检查表头是否正确")
	}

	// ========== 功能1：去重汇总 ==========
	shopMapSummary := make(map[string]*ShopSummary)
	for rowIdx, row := range rows {
		if rowIdx == 0 {
			continue // 跳过表头
		}

		// 修复：空行判断更宽松
		if len(row) == 0 {
			continue
		}

		// 调整列索引判断：允许部分列空，但核心列非空才处理
		shopName := ""
		orderID := ""
		amountStr := ""

		if colShopName < len(row) {
			shopName = strings.TrimSpace(row[colShopName])
		}
		if colOrderID < len(row) {
			orderID = strings.TrimSpace(row[colOrderID])
		}
		if colAmount < len(row) {
			amountStr = strings.TrimSpace(row[colAmount])
		}

		// 核心列非空才处理
		if shopName == "" || orderID == "" {
			continue
		}

		// 处理金额格式（允许空金额，默认0）
		amount := 0.0
		if amountStr != "" {
			amountStr = strings.ReplaceAll(amountStr, ",", "")
			parsedAmount, err := strconv.ParseFloat(amountStr, 64)
			if err != nil {
				log.Printf("第%d行订单金额(%s)格式错误，按0处理：%v", rowIdx+1, amountStr, err)
			} else {
				amount = parsedAmount
			}
		}

		// 去重汇总逻辑
		if _, exists := shopMapSummary[shopName]; !exists {
			shopMapSummary[shopName] = &ShopSummary{
				ShopName:         shopName,
				OrderIDs:         []string{orderID},
				UniqueOrderCount: 1,
				UniqueAmount:     amount,
			}
		} else {
			summary := shopMapSummary[shopName]
			orderExists := false
			for _, oid := range summary.OrderIDs {
				if oid == orderID {
					orderExists = true
					break
				}
			}

			if !orderExists {
				summary.OrderIDs = append(summary.OrderIDs, orderID)
				summary.UniqueOrderCount += 1
				summary.UniqueAmount += amount
			}
		}
	}

	// 计算去重汇总总计（仅用于返回结果，不再写入Excel）
	totalUniqueOrder := 0
	totalUniqueAmount := 0.0
	for _, summary := range shopMapSummary {
		totalUniqueOrder += summary.UniqueOrderCount
		totalUniqueAmount += summary.UniqueAmount
	}

	// ========== 功能2：全量汇总 ==========
	shopMapOrder := make(map[string]*ShopOrder)
	duplicateOrders := make([]string, 0)
	for rowIdx, row := range rows {
		if rowIdx == 0 {
			continue
		}

		// 修复：空行判断更宽松
		if len(row) == 0 {
			continue
		}

		// 调整列索引判断
		shopName := ""
		orderID := ""
		if colShopName < len(row) {
			shopName = strings.TrimSpace(row[colShopName])
		}
		if colOrderID < len(row) {
			orderID = strings.TrimSpace(row[colOrderID])
		}

		currentRowNum := rowIdx + 1

		// 核心列非空才处理
		if shopName == "" || orderID == "" {
			continue
		}

		if _, exists := shopMapOrder[shopName]; !exists {
			shopMapOrder[shopName] = &ShopOrder{
				ShopName:   shopName,
				OrderIDs:   []string{orderID},
				OrderCount: 1,
			}
		} else {
			summary := shopMapOrder[shopName]
			orderExists := false
			for _, oid := range summary.OrderIDs {
				if oid == orderID {
					orderExists = true
					break
				}
			}

			if orderExists {
				duplicateMsg := fmt.Sprintf("店铺：%s | 重复订单号：%s | 行号：%d", shopName, orderID, currentRowNum)
				duplicateOrders = append(duplicateOrders, duplicateMsg)
			}

			summary.OrderIDs = append(summary.OrderIDs, orderID)
			summary.OrderCount += 1
		}
	}

	// 计算全量汇总总计
	totalOrderCount := 0
	for _, summary := range shopMapOrder {
		totalOrderCount += summary.OrderCount
	}

	// ========== 生成结果Excel文件 ==========
	targetFile := excelize.NewFile()

	// 核心修改2：创建结果文件后立即删除Sheet1
	if err := removeDefaultSheet1(targetFile); err != nil {
		return nil, nil, err
	}

	// 子表1：去重汇总表
	sheet1Name := "店铺订单_去重汇总"
	idx1, err := targetFile.NewSheet(sheet1Name)
	if err != nil {
		return nil, nil, fmt.Errorf("创建去重汇总工作表失败：%v", err)
	}
	targetFile.SetActiveSheet(idx1)

	// 写入去重汇总表头
	headers1 := []string{"店铺名称", "订单号（多个用逗号分隔）", "订单数量（去重）", "订单金额总和（去重）"}
	for colIdx, header := range headers1 {
		cell := fmt.Sprintf("%c%d", 'A'+colIdx, 1)
		targetFile.SetCellValue(sheet1Name, cell, header)
	}

	// 写入去重汇总数据（仅店铺数据，无总计行）
	rowIdx1 := 2
	for _, summary := range shopMapSummary {
		orderIDsStr := strings.Join(summary.OrderIDs, ",")
		targetFile.SetCellValue(sheet1Name, fmt.Sprintf("A%d", rowIdx1), summary.ShopName)
		targetFile.SetCellValue(sheet1Name, fmt.Sprintf("B%d", rowIdx1), orderIDsStr)
		targetFile.SetCellValue(sheet1Name, fmt.Sprintf("C%d", rowIdx1), summary.UniqueOrderCount)
		targetFile.SetCellValue(sheet1Name, fmt.Sprintf("D%d", rowIdx1), summary.UniqueAmount)
		rowIdx1++
	}

	// ========== 已删除：去重汇总总计行的写入逻辑 ==========
	// 注释/删除以下原总计行代码，不再写入Excel
	// totalRow1 := rowIdx1
	// targetFile.SetCellValue(sheet1Name, fmt.Sprintf("A%d", totalRow1), "总计")
	// targetFile.SetCellValue(sheet1Name, fmt.Sprintf("C%d", totalRow1), totalUniqueOrder)
	// targetFile.SetCellValue(sheet1Name, fmt.Sprintf("D%d", totalRow1), totalUniqueAmount)

	// 子表2：全量汇总表
	sheet2Name := "店铺订单_全量汇总"
	_, err = targetFile.NewSheet(sheet2Name)
	if err != nil {
		return nil, nil, fmt.Errorf("创建全量汇总工作表失败：%v", err)
	}

	// 写入全量汇总表头
	headers2 := []string{"店铺名称", "订单号", "订单数量（含重复）"}
	for colIdx, header := range headers2 {
		cell := fmt.Sprintf("%c%d", 'A'+colIdx, 1)
		targetFile.SetCellValue(sheet2Name, cell, header)
	}

	// 写入全量汇总数据
	rowIdx2 := 2
	for _, summary := range shopMapOrder {
		for orderIdx, orderID := range summary.OrderIDs {
			var shopNameToWrite string
			var countToWrite interface{}

			if orderIdx == 0 {
				shopNameToWrite = summary.ShopName
				countToWrite = summary.OrderCount
			} else {
				shopNameToWrite = ""
				countToWrite = ""
			}

			targetFile.SetCellValue(sheet2Name, fmt.Sprintf("A%d", rowIdx2), shopNameToWrite)
			targetFile.SetCellValue(sheet2Name, fmt.Sprintf("B%d", rowIdx2), orderID)
			targetFile.SetCellValue(sheet2Name, fmt.Sprintf("C%d", rowIdx2), countToWrite)
			rowIdx2++
		}
	}

	// 保存前再次验证：确保结果文件没有Sheet1
	if err := removeDefaultSheet1(targetFile); err != nil {
		return nil, nil, err
	}

	// 保存结果文件到字节流
	buf, err := targetFile.WriteToBuffer()
	if err != nil {
		return nil, nil, fmt.Errorf("生成结果文件失败：%v", err)
	}

	// 组装返回结果（总计数据仍保留在返回结构体中，仅不写入Excel）
	result := &OrderSummaryResult{
		TotalUniqueOrder:  totalUniqueOrder,
		TotalUniqueAmount: totalUniqueAmount,
		TotalOrderCount:   totalOrderCount,
		DuplicateCount:    len(duplicateOrders),
		DuplicateMessages: duplicateOrders,
		ShopCount:         len(shopMapSummary),
	}

	return buf.Bytes(), result, nil
}
