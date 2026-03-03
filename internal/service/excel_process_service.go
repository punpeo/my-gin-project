package service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"go-gin/pkg/logger"
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
	GroupCount    int                `json:"groups"`
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

// columnToIndex 将Excel列字母转换为索引（A→0，B→1，AA→26）
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

// ProcessExcel 处理Excel文件的主要方法
func (s *excelService) ProcessExcel(req ExcelProcessRequest) (*ExcelProcessResponse, error) {
	// 1. 初始化输出文件和数据结构
	outputFile := excelize.NewFile()
	sheet := "Sheet1"

	// 设置表头 - 新增：在原有表头后添加"原文件名字"列
	headers := append([]string{req.MatchColumn}, req.KeepColumns...)
	if req.AverageColumn != "" {
		headers = append(headers, "平均值")
	}
	// 新增代码：添加"原文件名字"表头
	headers = append(headers, "原文件名字")
	// --- 新增结束 ---

	for colIdx, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		outputFile.SetCellValue(sheet, cell, header)
	}

	// 2. 收集所有数据并按分组列值分类
	type rowData struct {
		matchValue string
		keepValues []string
		averageVal float64
		sourceFile string // 原本就有这个字段，用于存储源文件名
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
			logger.Debugf("跳过文件%s: %v", filepath.Base(path), err)
			skipped++
			return nil
		}

		if len(rows) == 0 {
			logger.Debugf("文件%s读取到0行数据，跳过", filepath.Base(path))
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
			if matchColIdx < 0 || matchColIdx >= len(row) {
				continue
			}
			matchValue := strings.TrimSpace(row[matchColIdx])

			// 跳过统计行
			if strings.Contains(matchValue, "通用") || strings.Contains(matchValue, "均值") {
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
				if colIdx >= 0 && colIdx < len(row) {
					keepValues = append(keepValues, strings.TrimSpace(row[colIdx]))
				} else {
					keepValues = append(keepValues, "")
				}
			}

			// 计算均值列值（如果存在）
			var averageValue float64
			if req.AverageColumn != "" {
				avgColIdx := columnToIndex(req.AverageColumn)
				if avgColIdx >= 0 && avgColIdx < len(row) {
					valStr := strings.TrimSpace(row[avgColIdx])
					if valStr != "" {
						if val, err := strconv.ParseFloat(valStr, 64); err == nil {
							averageValue = val
							groupSums[matchValue] += val
							groupCounts[matchValue]++
						}
					}
				}
			}

			// 将数据按分组值存储（原本就会存储sourceFile）
			groupData[matchValue] = append(groupData[matchValue], rowData{
				matchValue: matchValue,
				keepValues: keepValues,
				averageVal: averageValue,
				sourceFile: filepath.Base(path), // 源文件名已存储
			})
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("文件处理错误: %v", err)
	}

	if len(groupData) == 0 {
		return nil, fmt.Errorf("没有找到有效数据")
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
			// 新增代码：添加源文件名到输出行
			outputRow = append(outputRow, row.sourceFile)
			// --- 新增结束 ---

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

	// 计算总行数（减去空行）
	emptyLines := len(groupValues) - 1 // 除了最后一个分组，每个分组后面有一个空行
	if len(groupValues) > 0 {
		emptyLines = len(groupValues) - 1
	} else {
		emptyLines = 0
	}
	totalRows := rowIndex - 2 - emptyLines

	// 7. 构建响应
	return &ExcelProcessResponse{
		TotalRows:     totalRows,
		GroupCount:    len(groupStats),
		Groups:        groupStats,
		GroupAverages: groupAverages,
		Base64Data:    base64Data,
		Processed:     processed,
		Skipped:       skipped,
		XlsxCount:     xlsxCount,
		XlsCount:      xlsCount,
		Message: fmt.Sprintf("成功处理 %d 个文件(%d个.xlsx, %d个.xls), 跳过 %d 个文件, 共 %d 行数据, 分为 %d 组",
			processed, xlsxCount, xlsCount, skipped, totalRows, len(groupStats)),
	}, nil
}

// readExcelFile 读取Excel文件（支持XLS和XLSX）
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

// readXLSXFile 读取XLSX文件
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

// safeReadXLSFile 安全读取XLS文件（修复panic问题）
func (s *excelService) safeReadXLSFile(filePath string) ([][]string, error) {
	// 外层recover保护整个函数
	defer func() {
		if r := recover(); r != nil {
			logger.Debugf("读取XLS文件%s时发生panic，已恢复: %v", filepath.Base(filePath), r)
		}
	}()

	// 检查文件是否存在
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("文件不存在或无权限访问")
	}
	if fileInfo.Size() == 0 {
		return nil, fmt.Errorf("文件为空")
	}

	// 尝试打开文件
	var file *xls.WorkBook
	func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Debugf("打开XLS文件%s时发生panic: %v", filepath.Base(filePath), r)
			}
		}()
		file, err = xls.Open(filePath, "utf-8")
	}()

	if err != nil {
		return nil, fmt.Errorf("打开XLS文件失败: %v", err)
	}
	if file == nil {
		return nil, fmt.Errorf("无法读取XLS文件内容")
	}

	// 获取第一个工作表
	var sheet *xls.WorkSheet
	func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Debugf("获取XLS工作表时发生panic: %v", r)
			}
		}()
		sheet = file.GetSheet(0)
	}()

	if sheet == nil {
		return nil, fmt.Errorf("XLS文件中未找到第一个工作表")
	}

	var rows [][]string
	const maxRows = 100000
	const maxEmptyRows = 50
	emptyRowCount := 0

	// 安全遍历行
	for i := 0; i < maxRows; i++ {
		// 检查是否应该提前结束
		if emptyRowCount >= maxEmptyRows {
			logger.Debugf("连续读取到%d个空行，停止读取文件%s", maxEmptyRows, filepath.Base(filePath))
			break
		}

		// 安全获取行
		var row *xls.Row
		func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Debugf("获取XLS行%d时发生panic: %v", i, r)
				}
			}()
			row = sheet.Row(i)
		}()

		// 如果获取行失败，跳过此行
		if row == nil {
			emptyRowCount++
			continue
		}
		emptyRowCount = 0

		// 安全获取列数
		lastCol := 0
		func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Debugf("获取XLS行%d的列数时发生panic: %v", i, r)
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
						logger.Debugf("读取XLS单元格(%d,%d)时发生panic: %v", i, j, r)
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
		return nil, fmt.Errorf("XLS文件中未找到有效数据")
	}

	logger.Debugf("安全读取XLS文件%s，共%d行有效数据", filepath.Base(filePath), len(rows))
	return rows, nil
}
