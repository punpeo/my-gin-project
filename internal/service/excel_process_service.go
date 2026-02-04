package service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"github.com/extrame/xls"
	"github.com/xuri/excelize/v2"
)

// ExcelProcessRequest 请求参数结构
type ExcelProcessRequest struct {
	BasePath      string   `json:"base_path" binding:"required"`
	MatchColumn   string   `json:"match_column" binding:"required"`
	MatchValue    string   `json:"match_value"`
	KeepColumns   []string `json:"keep_columns" binding:"required"`
	AverageColumn string   `json:"average_column"`
	OutputFile    string   `json:"output_file"`
}

// ExcelProcessResponse 响应参数结构
type ExcelProcessResponse struct {
	TotalRows     int                `json:"total_rows"`
	GroupCount    int                `json:"group_count"`
	Groups        map[string]int     `json:"groups"`
	GroupAverages map[string]float64 `json:"group_averages"`
	Base64Data    string             `json:"base64_data"`
	Message       string             `json:"message"`
	Processed     int                `json:"processed"`
	Skipped       int                `json:"skipped"`
	XlsxCount     int                `json:"xlsx_count"`
	XlsCount      int                `json:"xls_count"`
}

// ExcelService 接口定义
type ExcelService interface {
	ProcessExcel(req ExcelProcessRequest) (*ExcelProcessResponse, error)
}

type excelService struct{}

func NewExcelService() *excelService {
	return &excelService{}
}

func (s *excelService) ProcessExcel(req ExcelProcessRequest) (*ExcelProcessResponse, error) {
	// 1. 初始化输出文件和数据结构
	outputFile := excelize.NewFile()
	sheet := "Sheet1"

	// 设置表头
	headers := append([]string{req.MatchColumn}, req.KeepColumns...)
	if req.AverageColumn != "" {
		headers = append(headers, "平均值")
	}
	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		outputFile.SetCellValue(sheet, cell, header)
	}

	// 2. 收集所有数据并按分组列值分类
	type rowData struct {
		matchValue string
		keepValues []string
		averageVal float64
		sourceFile string
	}

	groupData := make(map[string][]rowData)
	groupSums := make(map[string]float64)
	groupCounts := make(map[string]int)

	// 统计字段
	processed, skipped := 0, 0
	xlsxCount, xlsCount := 0, 0

	// 3. 遍历目录处理文件
	err := filepath.Walk(req.BasePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".xlsx" && ext != ".xls" {
			return nil
		}

		// 统计文件类型
		if ext == ".xlsx" {
			xlsxCount++
		} else {
			xlsCount++
		}

		rows, err := s.readExcelFile(path)
		if err != nil {
			skipped++
			return nil
		}

		if len(rows) == 0 {
			skipped++
			return nil
		}

		processed++

		// 处理每行数据
		for _, row := range rows {
			if len(row) == 0 {
				continue
			}

			// 获取分组列值
			matchColIdx := columnToIndex(req.MatchColumn)
			if matchColIdx >= len(row) {
				continue
			}
			matchValue := strings.TrimSpace(row[matchColIdx])

			// 跳过统计行
			if strings.Contains(matchValue, "总值") || strings.Contains(matchValue, "均值") {
				continue
			}

			// 模糊筛选
			if req.MatchValue != "" && !strings.Contains(strings.ToLower(matchValue), strings.ToLower(req.MatchValue)) {
				continue
			}

			// 提取保留列数据
			var keepValues []string
			for _, col := range req.KeepColumns {
				colIdx := columnToIndex(col)
				if colIdx < len(row) {
					keepValues = append(keepValues, strings.TrimSpace(row[colIdx]))
				} else {
					keepValues = append(keepValues, "")
				}
			}

			// 计算均值列值（如果存在）
			var averageValue float64
			if req.AverageColumn != "" {
				avgColIdx := columnToIndex(req.AverageColumn)
				if avgColIdx < len(row) {
					if val, err := strconv.ParseFloat(strings.TrimSpace(row[avgColIdx]), 64); err == nil {
						averageValue = val
						groupSums[matchValue] += val
						groupCounts[matchValue]++
					}
				}
			}

			// 将数据按分组值存储
			groupData[matchValue] = append(groupData[matchValue], rowData{
				matchValue: matchValue,
				keepValues: keepValues,
				averageVal: averageValue,
				sourceFile: filepath.Base(path),
			})
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("文件处理错误: %v", err)
	}

	// 4. 按分组值排序并写入结果文件
	rowIndex := 2
	groupStats := make(map[string]int)

	// 获取所有分组值并排序
	var groupValues []string
	for group := range groupData {
		groupValues = append(groupValues, group)
	}
	sort.Strings(groupValues)

	// 写入分组数据
	for _, groupValue := range groupValues {
		rows := groupData[groupValue]
		groupStats[groupValue] = len(rows)

		// 写入当前分组的所有行
		for _, row := range rows {
			outputRow := append([]string{row.matchValue}, row.keepValues...)
			if req.AverageColumn != "" {
				outputRow = append(outputRow, fmt.Sprintf("%.2f", row.averageVal))
			}

			for colIdx, value := range outputRow {
				cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIndex)
				outputFile.SetCellValue(sheet, cell, value)
			}
			rowIndex++
		}

		// 在当前分组后添加空行分隔
		if rowIndex > 2 { // 避免在开头添加空行
			rowIndex++
		}
	}

	// 5. 计算各分组平均值
	groupAverages := make(map[string]float64)
	for group, sum := range groupSums {
		if count := groupCounts[group]; count > 0 {
			groupAverages[group] = sum / float64(count)
		} else {
			groupAverages[group] = 0
		}
	}

	// 6. 生成Base64结果
	var buf bytes.Buffer
	if err := outputFile.Write(&buf); err != nil {
		return nil, fmt.Errorf("生成结果文件失败: %v", err)
	}
	base64Data := base64.StdEncoding.EncodeToString(buf.Bytes())

	// 7. 构建响应
	return &ExcelProcessResponse{
		TotalRows:     rowIndex - 2 - len(groupValues), // 减去空行数
		GroupCount:    len(groupStats),
		Groups:        groupStats,
		GroupAverages: groupAverages,
		Base64Data:    base64Data,
		Processed:     processed,
		Skipped:       skipped,
		XlsxCount:     xlsxCount,
		XlsCount:      xlsCount,
		Message: fmt.Sprintf("成功处理 %d 个文件(%d个.xlsx, %d个.xls), 跳过 %d 个文件, 共 %d 行数据, 分为 %d 组",
			processed, xlsxCount, xlsCount, skipped, rowIndex-2-len(groupValues), len(groupStats)),
	}, nil
}

// 其他方法保持不变...
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

func (s *excelService) safeReadXLSFile(filePath string) ([][]string, error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("读取XLS文件时发生panic: %v\n", r)
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
	maxRow := int(sheet.MaxRow)
	for i := 0; i <= maxRow; i++ {
		row := sheet.Row(i)
		if row == nil {
			continue
		}

		var cols []string
		lastCol := int(row.LastCol())
		for j := 0; j <= lastCol; j++ {
			cols = append(cols, strings.TrimSpace(row.Col(j)))
		}
		if len(cols) > 0 {
			rows = append(rows, cols)
		}
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("XLS文件中未找到有效数据")
	}

	return rows, nil
}

func columnToIndex(col string) int {
	col = strings.ToUpper(col)
	index := 0
	for _, c := range col {
		if !unicode.IsLetter(c) {
			return -1
		}
		index = index*26 + int(c-'A')
	}
	return index
}
