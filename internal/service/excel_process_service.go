package service

import (
	"fmt"
	"go-gin/pkg/logger"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/extrame/xls"
	"github.com/xuri/excelize/v2"
)

// ExcelProcessRequest 请求参数结构（适配Gin绑定）
type ExcelProcessRequest struct {
	BasePath    string   `json:"base_path" form:"base_path" binding:"required"`             // Excel文件所在基础路径
	MatchColumn string   `json:"match_column" form:"match_column" binding:"required"`       // 匹配列(字母，如A,B,C)
	MatchValue  string   `json:"match_value" form:"match_value"`                            // 匹配值(可选，留空则匹配所有)
	KeepColumns []string `json:"keep_columns" form:"keep_columns" binding:"required,min=1"` // 保留列(逗号分隔，如B,C,D)
	SumColumn   string   `json:"sum_column" form:"sum_column" binding:"required"`           // 求和列(字母)
	OutputFile  string   `json:"output_file" form:"output_file"`                            // 输出文件名(可选，默认月日+汇总表.xlsx)
}

// ExcelProcessResponse 响应参数结构
type ExcelProcessResponse struct {
	TotalCount  int64                `json:"total_count"`   // 总计处理行数
	GroupedData map[string]GroupData `json:"grouped_data"`  // 分组统计数据
	Message     string               `json:"message"`       // 处理结果消息
	TotalAllNum int                  `json:"total_all_num"` // 总计数量
	TotalAllAmt float64              `json:"total_all_amt"` // 总计金额
	Processed   int                  `json:"processed"`     // 成功处理文件数
	Skipped     int                  `json:"skipped"`       // 跳过文件数
	XlsxCount   int                  `json:"xlsx_count"`    // .xlsx文件数
	XlsCount    int                  `json:"xls_count"`     // .xls文件数
}

// GroupData 分组数据结构
type GroupData struct {
	MatchValue string     `json:"match_value"` // 分组键值
	KeepData   [][]string `json:"keep_data"`   // 保留列数据
	SumResult  float64    `json:"sum_result"`  // 求和列汇总结果
	RowCount   int64      `json:"row_count"`   // 该分组行数
}

// ExcelService Excel处理服务接口
type ExcelService interface {
	ProcessExcel(req ExcelProcessRequest) (*ExcelProcessResponse, *excelize.File, error)
}

// excelService 实现ExcelService接口
type excelService struct{}

// NewExcelService 创建Excel服务实例（供Handler调用）
func NewExcelService() ExcelService {
	return &excelService{}
}

// ========== 工具函数：Excel列字母转索引（A→0，B→1，AA→26） ==========
func excelColToIndex(col string) (int, error) {
	col = strings.ToUpper(col)
	index := 0
	for _, c := range col {
		if !unicode.IsLetter(c) {
			return 0, fmt.Errorf("无效的列格式: %s", col)
		}
		index = index*26 + int(c-'A') + 1
	}
	return index - 1, nil
}

// ========== 读取XLSX文件 ==========
func (s *excelService) readXLSXFile(filePath string) ([][]string, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("打开XLSX文件失败: %v", err)
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, fmt.Errorf("未找到工作表")
	}
	return f.GetRows(sheetName)
}

// ========== 安全读取XLS文件 ==========
func (s *excelService) safeReadXLSFile(filePath string) ([][]string, error) {
	defer func() {
		if r := recover(); r != nil {
			logger.Warnf("读取XLS文件%s时发生panic，已恢复: %v", filepath.Base(filePath), r)
		}
	}()

	file, err := xls.Open(filePath, "utf-8")
	if err != nil {
		return nil, fmt.Errorf("打开XLS文件失败: %v", err)
	}

	sheet := file.GetSheet(0)
	if sheet == nil {
		return nil, fmt.Errorf("XLS文件中未找到第一个工作表")
	}

	var rows [][]string
	// 使用更安全的方式读取XLS文件
	// 不再依赖sheet.MaxRow，而是尝试读取直到失败
	const maxRows = 100000
	const maxEmptyRows = 100 // 连续读取到100个空行就停止

	emptyRowCount := 0
	for i := 0; i < maxRows; i++ {
		// 安全获取行
		var row *xls.Row
		func() {
			defer func() {
				if r := recover(); r != nil {
					// 记录但不中断
					logger.Debugf("调用sheet.Row(%d)时发生panic: %v", i, r)
				}
			}()
			row = sheet.Row(i)
		}()

		if row == nil {
			emptyRowCount++
			if emptyRowCount >= maxEmptyRows {
				logger.Debugf("连续读取到%d个空行，停止读取文件%s", maxEmptyRows, filepath.Base(filePath))
				break
			}
			continue
		}
		emptyRowCount = 0

		// 获取列数
		lastCol := 0
		func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Debugf("调用row.LastCol()时发生panic: %v", r)
				}
			}()
			lastCol = row.LastCol()
		}()

		if lastCol <= 0 {
			continue
		}

		// 读取列数据
		var cols []string
		hasData := false
		for j := 0; j < lastCol; j++ {
			var colValue string
			func() {
				defer func() {
					if r := recover(); r != nil {
						logger.Debugf("调用row.Col(%d)时发生panic: %v", j, r)
					}
				}()
				colValue = row.Col(j)
			}()

			colValue = strings.TrimSpace(colValue)
			cols = append(cols, colValue)
			if colValue != "" {
				hasData = true
			}
		}

		if hasData && len(cols) > 0 {
			rows = append(rows, cols)
		}
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("XLS文件%s中未找到有效数据", filepath.Base(filePath))
	}

	logger.Infof("安全读取XLS文件%s，共%d行有效数据", filepath.Base(filePath), len(rows))
	return rows, nil
}

// ========== 通用读取Excel文件（支持XLS/XLSX） ==========
func (s *excelService) readExcelFile(filePath string) ([][]string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".xlsx":
		return s.readXLSXFile(filePath)
	case ".xls":
		return s.safeReadXLSFile(filePath)
	default:
		return nil, fmt.Errorf("不支持的格式: %s", ext)
	}
}

// ========== 辅助函数：返回整数切片最大值 ==========
func maxIntSlice(nums ...int) int {
	if len(nums) == 0 {
		return 0
	}
	max := nums[0]
	for _, num := range nums {
		if num > max {
			max = num
		}
	}
	return max
}

// ========== 辅助函数：返回三个整数最大值 ==========
func max(a, b, c int) int {
	maxVal := a
	if b > maxVal {
		maxVal = b
	}
	if c > maxVal {
		maxVal = c
	}
	return maxVal
}

// ========== 生成汇总Excel文件 ==========
func (s *excelService) generateSummaryExcel(req ExcelProcessRequest, statMap map[string]*GroupData,
	totalCount int64, totalAllNum int, totalAllAmt float64) (*excelize.File, error) {

	newFile := excelize.NewFile()
	headers := []string{req.MatchColumn}
	headers = append(headers, req.KeepColumns...)
	headers = append(headers, fmt.Sprintf("%s汇总", req.SumColumn), "数据行数")

	// 写入表头
	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		newFile.SetCellValue("Sheet1", cell, header)
	}

	// 设置数字格式（保留2位小数）
	styleID, err := newFile.NewStyle(&excelize.Style{
		NumFmt: 2,
	})
	if err != nil {
		logger.Warnf("设置Excel样式失败：%v，使用默认格式", err)
		styleID = 0
	}

	// 写入分组数据
	rowIdx := 2
	for matchVal, group := range statMap {
		nameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
		newFile.SetCellValue("Sheet1", nameCell, matchVal)

		// 保留列数据
		if len(group.KeepData) > 0 && len(group.KeepData[0]) > 0 {
			for i, val := range group.KeepData[0] {
				keepCell, _ := excelize.CoordinatesToCellName(i+2, rowIdx)
				newFile.SetCellValue("Sheet1", keepCell, val)
			}
		}

		// 求和列
		sumCell, _ := excelize.CoordinatesToCellName(len(headers)-1, rowIdx)
		newFile.SetCellValue("Sheet1", sumCell, group.SumResult)
		if styleID > 0 {
			newFile.SetCellStyle("Sheet1", sumCell, sumCell, styleID)
		}

		// 行数
		countCell, _ := excelize.CoordinatesToCellName(len(headers), rowIdx)
		newFile.SetCellValue("Sheet1", countCell, group.RowCount)

		rowIdx++
	}

	// 写入总计行
	totalNameCell, _ := excelize.CoordinatesToCellName(1, rowIdx)
	newFile.SetCellValue("Sheet1", totalNameCell, "总计")

	if len(req.KeepColumns) > 0 {
		totalNumCell, _ := excelize.CoordinatesToCellName(2, rowIdx)
		newFile.SetCellValue("Sheet1", totalNumCell, totalAllNum)
	}

	totalSumCell, _ := excelize.CoordinatesToCellName(len(headers)-1, rowIdx)
	newFile.SetCellValue("Sheet1", totalSumCell, totalAllAmt)
	if styleID > 0 {
		newFile.SetCellStyle("Sheet1", totalSumCell, totalSumCell, styleID)
	}

	totalCountCell, _ := excelize.CoordinatesToCellName(len(headers), rowIdx)
	newFile.SetCellValue("Sheet1", totalCountCell, totalCount)

	return newFile, nil
}

// ========== 核心处理方法（优化默认文件名：月日+汇总表） ==========
func (s *excelService) ProcessExcel(req ExcelProcessRequest) (*ExcelProcessResponse, *excelize.File, error) {
	// 1. 参数默认值设置（核心优化：默认文件名改为「MMDD汇总表.xlsx」）
	if req.OutputFile == "" {
		// 获取当前时间的月/日，格式：0121汇总表.xlsx（1月21日）
		now := time.Now()
		req.OutputFile = fmt.Sprintf("%02d%02d汇总表.xlsx", now.Month(), now.Day())
	} else {
		// 确保自定义文件名是xlsx格式
		ext := strings.ToLower(filepath.Ext(req.OutputFile))
		if ext != ".xlsx" {
			req.OutputFile += ".xlsx"
		}
	}

	// 2. 列字母转索引
	matchColIdx, err := excelColToIndex(req.MatchColumn)
	if err != nil {
		logger.Errorf("匹配列转换失败: %v", err)
		return nil, nil, fmt.Errorf("无效的匹配列: %v", err)
	}

	sumColIdx, err := excelColToIndex(req.SumColumn)
	if err != nil {
		logger.Errorf("求和列转换失败: %v", err)
		return nil, nil, fmt.Errorf("无效的求和列: %v", err)
	}

	keepColIdxs := make([]int, len(req.KeepColumns))
	for i, col := range req.KeepColumns {
		idx, err := excelColToIndex(col)
		if err != nil {
			logger.Errorf("保留列%s转换失败: %v", col, err)
			return nil, nil, fmt.Errorf("无效的保留列 %s: %v", col, err)
		}
		keepColIdxs[i] = idx
	}

	// 3. 遍历目录查找Excel文件
	var excelFiles []string
	err = filepath.Walk(req.BasePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			if ext == ".xlsx" || ext == ".xls" {
				excelFiles = append(excelFiles, path)
			}
		}
		return nil
	})
	if err != nil {
		logger.Errorf("遍历目录失败: %v", err)
		return nil, nil, fmt.Errorf("遍历目录失败: %v", err)
	}

	if len(excelFiles) == 0 {
		logger.Warnf("目录%s中未找到Excel文件", req.BasePath)
		return nil, nil, fmt.Errorf("目录中没有找到Excel文件")
	}

	// 4. 统计文件类型
	xlsxCount := 0
	xlsCount := 0
	for _, file := range excelFiles {
		ext := strings.ToLower(filepath.Ext(file))
		if ext == ".xlsx" {
			xlsxCount++
		} else if ext == ".xls" {
			xlsCount++
		}
	}

	logger.Infof("找到%d个Excel文件（%d个.xlsx，%d个.xls）", len(excelFiles), xlsxCount, xlsCount)

	// 5. 处理所有Excel文件
	statMap := make(map[string]*GroupData)
	var totalCount int64
	var totalAllNum int
	var totalAllAmt float64
	processed := 0
	skipped := 0

	// 新增统计信息
	matchCount := 0         // 匹配列匹配的行数
	sumParseFailCount := 0  // 匹配但求和列解析失败的行数
	rowLengthFailCount := 0 // 行长度不足的行数

	// 记录前5个解析失败的样本
	sampleParseErrors := make([]string, 0, 5)

	for _, file := range excelFiles {
		fileName := filepath.Base(file)
		logger.Debugf("开始处理文件: %s", fileName)

		rows, readErr := s.readExcelFile(file)
		if readErr != nil {
			logger.Warnf("跳过文件%s: %v", fileName, readErr)
			skipped++
			continue
		}

		// 如果读取到的行数为0，跳过此文件
		if len(rows) == 0 {
			logger.Warnf("文件%s读取到0行数据，跳过", fileName)
			skipped++
			continue
		}

		logger.Debugf("文件%s读取到%d行数据", fileName, len(rows))

		// 处理当前文件的每一行
		for rowIndex, row := range rows {
			// 跳过表头行（通常第一行是表头）
			if rowIndex == 0 && len(row) > 0 {
				logger.Debugf("文件%s的表头: %v", fileName, row)
				// 可以跳过表头，但这里不跳过，由匹配条件处理
			}

			maxIdx := max(matchColIdx, sumColIdx, maxIntSlice(keepColIdxs...))
			if len(row) <= maxIdx {
				rowLengthFailCount++
				continue
			}

			matchValue := strings.TrimSpace(row[matchColIdx])
			if matchValue == "" {
				continue
			}

			// 模糊匹配过滤
			if req.MatchValue != "" && !strings.Contains(strings.ToLower(matchValue), strings.ToLower(req.MatchValue)) {
				continue
			}

			matchCount++

			// 解析求和值
			sumStr := strings.TrimSpace(row[sumColIdx])
			sumVal, err := strconv.ParseFloat(sumStr, 64)
			if err != nil {
				sumParseFailCount++
				// 记录样本错误
				if len(sampleParseErrors) < 5 {
					sampleParseErrors = append(sampleParseErrors,
						fmt.Sprintf("文件%s第%d行: 匹配值[%s] 求和值[%s] 错误: %v",
							fileName, rowIndex+1, matchValue, sumStr, err))
				}
				continue
			}

			// 收集保留列数据
			keepData := make([]string, len(keepColIdxs))
			for j, idx := range keepColIdxs {
				if idx < len(row) {
					keepData[j] = strings.TrimSpace(row[idx])
				} else {
					keepData[j] = ""
				}
			}

			// 更新分组统计
			if group, ok := statMap[matchValue]; ok {
				group.SumResult += sumVal
				group.KeepData = append(group.KeepData, keepData)
				group.RowCount++
			} else {
				statMap[matchValue] = &GroupData{
					MatchValue: matchValue,
					KeepData:   [][]string{keepData},
					SumResult:  sumVal,
					RowCount:   1,
				}
			}

			totalCount++
			// 统计总计数量
			if len(keepData) > 0 && keepData[0] != "" {
				if num, err := strconv.Atoi(keepData[0]); err == nil {
					totalAllNum += num
					totalAllAmt += sumVal
				}
			}
		}
		processed++
	}

	// 6. 校验有效数据
	if len(statMap) == 0 {
		logger.Warnf("未找到有效匹配数据")

		// 提供详细的错误信息
		errorMsg := "没有找到有效数据\n"
		errorMsg += fmt.Sprintf("处理统计:\n")
		errorMsg += fmt.Sprintf("  - 找到Excel文件: %d个\n", len(excelFiles))
		errorMsg += fmt.Sprintf("  - 成功处理文件: %d个\n", processed)
		errorMsg += fmt.Sprintf("  - 跳过文件: %d个\n", skipped)
		errorMsg += fmt.Sprintf("  - 匹配列匹配的行数: %d\n", matchCount)
		errorMsg += fmt.Sprintf("  - 求和列解析失败的行数: %d\n", sumParseFailCount)
		errorMsg += fmt.Sprintf("  - 行长度不足跳过的行数: %d\n", rowLengthFailCount)

		if matchCount > 0 && sumParseFailCount > 0 {
			errorMsg += "\n可能的原因:\n"
			errorMsg += fmt.Sprintf("1. 求和列[%s]可能包含非数字数据\n", req.SumColumn)
			errorMsg += fmt.Sprintf("2. 匹配列[%s]包含匹配值，但求和列无法转换为数字\n", req.MatchColumn)

			if len(sampleParseErrors) > 0 {
				errorMsg += "\n求和列解析失败的前5个样本:\n"
				for i, sample := range sampleParseErrors {
					errorMsg += fmt.Sprintf("  %d. %s\n", i+1, sample)
				}
			}

			errorMsg += "\n建议:\n"
			errorMsg += fmt.Sprintf("1. 检查求和列[%s]是否为数值列\n", req.SumColumn)
			errorMsg += fmt.Sprintf("2. 查看Excel文件确认列结构\n")
			errorMsg += fmt.Sprintf("3. 尝试使用不同的列进行求和计算\n")
		} else if matchCount == 0 {
			errorMsg += "\n可能的原因:\n"
			errorMsg += fmt.Sprintf("1. 匹配列[%s]不包含匹配值'%s'\n", req.MatchColumn, req.MatchValue)
			errorMsg += "2. Excel文件中没有匹配的数据\n"

			errorMsg += "\n建议:\n"
			errorMsg += fmt.Sprintf("1. 检查匹配列[%s]是否正确\n", req.MatchColumn)
			errorMsg += fmt.Sprintf("2. 检查匹配值'%s'是否正确\n", req.MatchValue)
			errorMsg += "3. 尝试不指定匹配值，查看所有数据\n"
		}

		return nil, nil, fmt.Errorf(errorMsg)
	}

	logger.Infof("数据处理完成，共匹配%d行数据，分为%d个分组", totalCount, len(statMap))

	// 记录详细的统计信息
	logger.Infof("处理统计: 匹配行=%d, 求和解析失败=%d, 行长度不足=%d",
		matchCount, sumParseFailCount, rowLengthFailCount)

	// 7. 生成汇总Excel
	excelFile, err := s.generateSummaryExcel(req, statMap, totalCount, totalAllNum, totalAllAmt)
	if err != nil {
		logger.Errorf("生成汇总Excel失败: %v", err)
		return nil, nil, fmt.Errorf("生成汇总Excel失败: %v", err)
	}

	// 8. 构建响应消息
	message := fmt.Sprintf("处理完成! 处理了 %d 个Excel文件(%d个.xlsx, %d个.xls), 跳过了 %d 个文件, 匹配了 %d 行数据, 按[%s]分组",
		processed, xlsxCount, xlsCount, skipped, totalCount, req.MatchColumn)
	if req.MatchValue != "" {
		message += fmt.Sprintf(" (筛选条件: '%s')", req.MatchValue)
	}
	message += fmt.Sprintf("\n结果文件名称: %s", req.OutputFile)

	// 添加详细统计信息
	message += fmt.Sprintf("\n详细统计: 匹配行数=%d, 分组数=%d, 总计数量=%d, 总计金额=%.2f",
		matchCount, len(statMap), totalAllNum, totalAllAmt)

	// 9. 转换分组数据格式
	groupedData := make(map[string]GroupData)
	for k, v := range statMap {
		groupedData[k] = *v
	}

	// 10. 构建响应对象
	response := &ExcelProcessResponse{
		TotalCount:  totalCount,
		GroupedData: groupedData,
		Message:     message,
		TotalAllNum: totalAllNum,
		TotalAllAmt: totalAllAmt,
		Processed:   processed,
		Skipped:     skipped,
		XlsxCount:   xlsxCount,
		XlsCount:    xlsCount,
	}

	return response, excelFile, nil
}
