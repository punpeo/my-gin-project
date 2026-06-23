package v1_service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/xuri/excelize/v2"
)

// ShopOrderStat 店铺订单统计结构体
type ShopOrderStat struct {
	ShopName      string  // 店铺名称（A列）
	TotalNum      int     // 订单数量总和（B列）
	TotalAmt      float64 // 订单金额总和（C列）
	ShopNum       int     // 统计店铺数量
	Base64Content string  // 结果Excel文件的Base64编码内容
}

// StatShopOrder 遍历指定目录下所有Excel文件，统计店铺订单数据
func StatShopOrder(basePath string) (*ShopOrderStat, error) {
	// 1. 校验目录是否存在
	_, err := os.Stat(basePath)
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("文件根目录不存在：%s", basePath)
	}

	// 2. 遍历目录下所有xlsx/xls文件
	var excelFiles []string
	err = filepath.Walk(basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		// 跳过目录，只处理文件
		if info.IsDir() {
			return nil
		}
		// 只处理xlsx/xls格式
		ext := filepath.Ext(path)
		if ext == ".xlsx" || ext == ".xls" {
			excelFiles = append(excelFiles, path)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("遍历目录失败：%v", err)
	}

	if len(excelFiles) == 0 {
		return nil, fmt.Errorf("指定目录下未找到xlsx/xls格式文件")
	}

	// 3. 统计所有文件的店铺数据
	statMap := make(map[string]*ShopOrderStat)
	var totalAllNum int     // 所有店铺订单总数
	var totalAllAmt float64 // 所有店铺金额总和

	for _, file := range excelFiles {
		// 打开单个Excel文件
		f, err := excelize.OpenFile(file)
		if err != nil {
			fmt.Printf("警告：打开文件%s失败，跳过处理：%v\n", file, err)
			continue
		}

		// 读取第一个工作表数据
		rows, err := f.GetRows(f.GetSheetName(0))
		if err != nil {
			fmt.Printf("警告：读取文件%s数据失败，跳过处理：%v\n", file, err)
			_ = f.Close()
			continue
		}

		// 遍历行数据（跳过表头）
		for i, row := range rows {
			if i == 0 { // 跳过表头
				continue
			}
			// 校验列数（至少A/B/C列）
			if len(row) < 3 {
				fmt.Printf("警告：文件%s第%d行数据不完整，跳过\n", file, i+1)
				continue
			}

			// 获取店铺名称（A列）
			shopName := row[0]
			if shopName == "" {
				fmt.Printf("警告：文件%s第%d行A列店铺名称为空，跳过\n", file, i+1)
				continue
			}

			// 解析订单数量（B列）
			numStr := row[1]
			num, err := strconv.Atoi(numStr)
			if err != nil {
				fmt.Printf("警告：文件%s第%d行B列订单数量格式错误（%s），跳过\n", file, i+1, numStr)
				continue
			}

			// 解析订单金额（C列）
			amtStr := row[2]
			amt, err := strconv.ParseFloat(amtStr, 64)
			if err != nil {
				fmt.Printf("警告：文件%s第%d行C列订单金额格式错误（%s），跳过\n", file, i+1, amtStr)
				continue
			}

			// 更新统计数据
			if stat, ok := statMap[shopName]; ok {
				stat.TotalNum += num
				stat.TotalAmt += amt
			} else {
				statMap[shopName] = &ShopOrderStat{
					ShopName: shopName,
					TotalNum: num,
					TotalAmt: amt,
				}
			}

			// 累加至总计
			totalAllNum += num
			totalAllAmt += amt
		}

		_ = f.Close() // 关闭当前文件
	}

	if len(statMap) == 0 {
		return nil, fmt.Errorf("未统计到有效店铺订单数据")
	}

	// 4. 转换为切片（便于前端展示）
	var statList []*ShopOrderStat
	for _, stat := range statMap {
		statList = append(statList, stat)
	}

	// 5. 生成统计结果Excel文件（供下载）
	newFile := excelize.NewFile()
	defer newFile.Close()

	// 设置表头
	headers := []string{"店铺名称", "订单数量总和", "订单金额总和（元）"}
	for col, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = newFile.SetCellValue("Sheet1", cell, header)
	}

	// 创建数字格式样式（保留2位小数）
	styleID, err := newFile.NewStyle(&excelize.Style{
		NumFmt: 2, // 对应 Excel 0.00 格式
	})
	if err != nil {
		return nil, fmt.Errorf("创建数字格式失败：%v", err)
	}

	// 写入统计数据
	rowIdx := 2
	for _, stat := range statList {
		// 店铺名称
		nameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
		_ = newFile.SetCellValue("Sheet1", nameCell, stat.ShopName)
		// 订单数量
		numCell, _ := excelize.CoordinatesToCellName(2, rowIdx)
		_ = newFile.SetCellValue("Sheet1", numCell, stat.TotalNum)
		// 订单金额（数字格式）
		amtCell, _ := excelize.CoordinatesToCellName(3, rowIdx)
		_ = newFile.SetCellValue("Sheet1", amtCell, stat.TotalAmt)
		_ = newFile.SetCellStyle("Sheet1", amtCell, amtCell, styleID)

		rowIdx++
	}

	// 写入总计行
	// 总计行店铺名称列
	totalNameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalNameCell, "总计")
	// 总计行订单数量列
	totalNumCell, _ := excelize.CoordinatesToCellName(2, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalNumCell, totalAllNum)
	// 总计行金额列（数字格式）
	totalAmtCell, _ := excelize.CoordinatesToCellName(3, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalAmtCell, totalAllAmt)
	_ = newFile.SetCellStyle("Sheet1", totalAmtCell, totalAmtCell, styleID)

	// 保存到缓冲区
	buf := new(bytes.Buffer)
	if err := newFile.Write(buf); err != nil {
		return nil, fmt.Errorf("保存结果Excel到缓冲区失败：%v", err)
	}
	base64Content := base64.StdEncoding.EncodeToString(buf.Bytes())

	// 返回统计结果
	return &ShopOrderStat{
		ShopNum:       len(statMap),
		TotalNum:      totalAllNum,   // 修复：使用totalAllNum而不是totalNumCell
		TotalAmt:      totalAllAmt,   // 修复：使用totalAllAmt而不是totalAmtCell
		Base64Content: base64Content, // 修复：修正字段名拼写
	}, nil
}

// StatShopOrderByUpload 通过上传的文件统计店铺订单数据
// 前端只会上传一个文件
func StatShopOrderByUpload(fileContent []byte, fileName string) (*ShopOrderStat, error) {
	// 1. 验证文件格式
	ext := filepath.Ext(fileName)
	if ext != ".xlsx" && ext != ".xls" {
		return nil, fmt.Errorf("文件格式不支持，仅支持.xlsx和.xls格式")
	}

	// 2. 读取上传的文件
	reader := bytes.NewReader(fileContent)
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return nil, fmt.Errorf("解析上传文件失败：%v", err)
	}
	defer f.Close()

	// 3. 统计文件的店铺数据
	statMap := make(map[string]*ShopOrderStat)
	var totalAllNum int
	var totalAllAmt float64

	// 读取第一个工作表数据
	rows, err := f.GetRows(f.GetSheetName(0))
	if err != nil {
		return nil, fmt.Errorf("读取工作表数据失败：%v", err)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("上传文件无数据")
	}

	// 遍历行数据（跳过表头）
	for i, row := range rows {
		if i == 0 { // 跳过表头
			continue
		}
		// 校验列数（至少A/B/C列）
		if len(row) < 3 {
			fmt.Printf("警告：上传文件第%d行数据不完整，跳过\n", i+1)
			continue
		}

		// 获取店铺名称（A列）
		shopName := row[0]
		if shopName == "" {
			fmt.Printf("警告：上传文件第%d行A列店铺名称为空，跳过\n", i+1)
			continue
		}

		// 解析订单数量（B列）
		numStr := row[1]
		num, err := strconv.Atoi(numStr)
		if err != nil {
			fmt.Printf("警告：上传文件第%d行B列订单数量格式错误（%s），跳过\n", i+1, numStr)
			continue
		}

		// 解析订单金额（C列）
		amtStr := row[2]
		amt, err := strconv.ParseFloat(amtStr, 64)
		if err != nil {
			fmt.Printf("警告：上传文件第%d行C列订单金额格式错误（%s），跳过\n", i+1, amtStr)
			continue
		}

		// 更新统计数据
		if stat, ok := statMap[shopName]; ok {
			stat.TotalNum += num
			stat.TotalAmt += amt
		} else {
			statMap[shopName] = &ShopOrderStat{
				ShopName: shopName,
				TotalNum: num,
				TotalAmt: amt,
			}
		}

		// 累加至总计
		totalAllNum += num
		totalAllAmt += amt
	}

	if len(statMap) == 0 {
		return nil, fmt.Errorf("未统计到有效店铺订单数据")
	}

	// 4. 转换为切片（便于前端展示）
	var statList []*ShopOrderStat
	for _, stat := range statMap {
		statList = append(statList, stat)
	}

	// 5. 生成统计结果Excel文件（供下载）
	newFile := excelize.NewFile()
	defer newFile.Close()

	// 设置表头
	headers := []string{"店铺名称", "订单数量总和", "订单金额总和（元）"}
	for col, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = newFile.SetCellValue("Sheet1", cell, header)
	}

	// 创建数字格式样式（保留2位小数）
	styleID, err := newFile.NewStyle(&excelize.Style{
		NumFmt: 2, // 对应 Excel 0.00 格式
	})
	if err != nil {
		return nil, fmt.Errorf("创建数字格式失败：%v", err)
	}

	// 写入统计数据
	rowIdx := 2
	for _, stat := range statList {
		// 店铺名称
		nameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
		_ = newFile.SetCellValue("Sheet1", nameCell, stat.ShopName)
		// 订单数量
		numCell, _ := excelize.CoordinatesToCellName(2, rowIdx)
		_ = newFile.SetCellValue("Sheet1", numCell, stat.TotalNum)
		// 订单金额（数字格式）
		amtCell, _ := excelize.CoordinatesToCellName(3, rowIdx)
		_ = newFile.SetCellValue("Sheet1", amtCell, stat.TotalAmt)
		_ = newFile.SetCellStyle("Sheet1", amtCell, amtCell, styleID)

		rowIdx++
	}

	// 写入总计行
	// 总计行店铺名称列
	totalNameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalNameCell, "总计")
	// 总计行订单数量列
	totalNumCell, _ := excelize.CoordinatesToCellName(2, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalNumCell, totalAllNum)
	// 总计行金额列（数字格式）
	totalAmtCell, _ := excelize.CoordinatesToCellName(3, rowIdx)
	_ = newFile.SetCellValue("Sheet1", totalAmtCell, totalAllAmt)
	_ = newFile.SetCellStyle("Sheet1", totalAmtCell, totalAmtCell, styleID)

	// 修复：将Excel文件写入缓冲区并编码为Base64
	buf := new(bytes.Buffer)
	if err := newFile.Write(buf); err != nil {
		return nil, fmt.Errorf("保存结果Excel到缓冲区失败：%v", err)
	}
	base64Content := base64.StdEncoding.EncodeToString(buf.Bytes())

	// 返回总计数据
	return &ShopOrderStat{
		ShopNum:       len(statMap),
		TotalNum:      totalAllNum,
		TotalAmt:      totalAllAmt,
		Base64Content: base64Content, // 修复：修正字段名拼写
	}, nil
}

// 辅助函数：从Base64内容解码并保存文件
func SaveBase64ToFile(base64Content, filePath string) error {
	// 解码Base64
	data, err := base64.StdEncoding.DecodeString(base64Content)
	if err != nil {
		return fmt.Errorf("解码Base64失败：%v", err)
	}

	// 保存到文件
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("保存文件失败：%v", err)
	}

	return nil
}
