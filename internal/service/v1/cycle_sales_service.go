package v1_service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

// CycleSalesService 产品周期销量统计服务
type CycleSalesService struct{}

// NewCycleSalesService 创建服务实例
func NewCycleSalesService() *CycleSalesService {
	return &CycleSalesService{}
}

// CycleSalesRequest 产品周期销量统计请求参数
type CycleSalesRequest struct {
	BasePath     string `json:"base_path" binding:"required"`      // 根目录
	BaseFileName string `json:"base_file_name" binding:"required"` // 基准文件名
	StartColumn  string `json:"start_column" binding:"required"`   // 起始列（如C）
	EndColumn    string `json:"end_column" binding:"required"`     // 结束列（如D）
}

// CycleSalesResult 产品周期销量统计结果
type CycleSalesResult struct {
	FileName      string     // 结果文件名
	Data          [][]string // 结果数据
	ProductCount  int        // 产品数量
	CycleDays     int        // 周期天数
	Message       string     // 提示信息
	Base64Content string     // Base64编码的Excel文件内容
}

// 列字母转数字
func columnLetterToNumber(letter string) int {
	if len(letter) == 0 {
		return 0
	}

	letter = strings.ToUpper(letter)
	col := 0
	for i := 0; i < len(letter); i++ {
		col = col*26 + int(letter[i]-'A'+1)
	}
	return col
}

// 计算日期差值（假设日期格式为"1月1日"到"1月2日"，应返回1）
func calculateDateDiff(startDateStr, endDateStr string) (int, error) {
	// 解析"月日"格式的日期
	parseMonthDay := func(dateStr string) (time.Time, error) {
		dateStr = strings.TrimSpace(dateStr)

		// 尝试多种日期格式
		layouts := []string{
			"1月2日",   // 1月5日
			"01月02日", // 01月05日
			"1-2",    // 1-5
			"01-02",  // 01-05
			"1/2",    // 1/5
			"01/02",  // 01/05
		}

		var parsedTime time.Time
		var err error

		// 使用当前年份
		currentYear := time.Now().Year()

		for _, layout := range layouts {
			parsedTime, err = time.Parse(layout, dateStr)
			if err == nil {
				// 设置年份为当前年份
				parsedTime = time.Date(currentYear, parsedTime.Month(), parsedTime.Day(), 0, 0, 0, 0, time.UTC)
				return parsedTime, nil
			}
		}

		return time.Time{}, fmt.Errorf("无法解析日期: %s", dateStr)
	}

	startTime, err := parseMonthDay(startDateStr)
	if err != nil {
		return 0, err
	}

	endTime, err := parseMonthDay(endDateStr)
	if err != nil {
		return 0, err
	}

	// 计算天数差，使用天为单位
	days := int(endTime.Sub(startTime).Hours() / 24)

	if days < 0 {
		return 0, fmt.Errorf("结束日期不能早于开始日期")
	}

	return days, nil
}

// Statistic 执行销量统计
func (s *CycleSalesService) Statistic(req *CycleSalesRequest) (*CycleSalesResult, error) {
	// 1. 补全默认值
	if req.BaseFileName == "" {
		req.BaseFileName = "kucun.xlsx"
	}

	// 2. 拼接文件路径并检查文件存在性
	filePath := filepath.Join(req.BasePath, req.BaseFileName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("文件不存在：%s", filePath)
	}

	// 3. 打开Excel文件
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取Excel文件失败：%w", err)
	}
	defer f.Close()

	// 4. 获取第一个工作表
	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, fmt.Errorf("Excel文件无有效工作表")
	}

	// 5. 列字母转数字
	startCol := columnLetterToNumber(req.StartColumn) // 起始列（如C列，期初库存）
	endCol := columnLetterToNumber(req.EndColumn)     // 结束列（如D列，期末库存）
	if startCol == 0 || endCol == 0 {
		return nil, fmt.Errorf("列字母格式错误（仅支持A-Z）")
	}

	// 检查列数是否正确
	if endCol <= startCol {
		return nil, fmt.Errorf("结束列必须在起始列之后")
	}

	// 6. 读取所有行数据
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("读取Excel行数据失败：%w", err)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("Excel文件为空")
	}

	// 7. 核心逻辑：处理数据
	var (
		resultData   [][]string
		productCount int
		cycleDays    int
	)

	// 7.1 计算周期天数（从第一行的起始列和结束列标题获取日期）
	if len(rows) > 0 {
		firstRow := rows[0]

		// 确保起始列和结束列不超出第一行的范围
		if startCol <= len(firstRow) && endCol <= len(firstRow) {
			startDateStr := strings.TrimSpace(firstRow[startCol-1])
			endDateStr := strings.TrimSpace(firstRow[endCol-1])

			if startDateStr != "" && endDateStr != "" {
				// 尝试解析日期字符串
				days, err := calculateDateDiff(startDateStr, endDateStr)
				if err != nil {
					// 如果日期解析失败，通过列数差计算天数
					cycleDays = endCol - startCol
				} else {
					// 使用解析出的天数
					cycleDays = days
				}
			} else {
				// 如果日期字符串为空，通过列数差计算天数
				cycleDays = endCol - startCol
			}
		} else {
			// 如果列超出范围，通过列数差计算天数
			cycleDays = endCol - startCol
		}
	}

	// 确保cycleDays不为负数
	if cycleDays < 0 {
		cycleDays = 0
	}

	// 7.2 处理数据行（从第2行开始，只处理偶数行）
	for i := 1; i < len(rows); i++ {
		// 修复：只处理偶数列（2、4、6...行），即Excel行号为偶数的行
		// 注意：i从1开始（第2行），所以判断 (i+1)%2 是否为0来判断是否是偶数行
		if (i+1)%2 != 0 {
			continue
		}

		row := rows[i]

		// 跳过完全空的行
		if len(row) == 0 {
			continue
		}

		// 获取产品名、产品编码
		productName := ""
		productCode := ""

		if len(row) > 0 {
			productName = strings.TrimSpace(row[0])
		}
		if len(row) > 1 {
			productCode = strings.TrimSpace(row[1])
		}

		// 如果产品名和产品编码都为空，跳过
		if productName == "" && productCode == "" {
			continue
		}

		// 解析起始列和结束列数值
		var (
			startVal float64 // 起始列值（期初库存）
			endVal   float64 // 结束列值（期末库存）
			sales    float64 // 销量 = 期初库存 - 期末库存
			stockStr string  // 现有库存字符串（期末库存）
		)

		// 解析起始列值（期初库存）
		if startCol <= len(row) && strings.TrimSpace(row[startCol-1]) != "" {
			valStr := strings.TrimSpace(row[startCol-1])
			// 尝试转换为浮点数
			if val, err := strconv.ParseFloat(valStr, 64); err == nil {
				startVal = val
			} else {
				// 如果不是数字，默认为0
				startVal = 0
			}
		}

		// 解析结束列值（期末库存，即现有库存）
		if endCol <= len(row) && strings.TrimSpace(row[endCol-1]) != "" {
			valStr := strings.TrimSpace(row[endCol-1])
			// 尝试转换为浮点数
			if val, err := strconv.ParseFloat(valStr, 64); err == nil {
				endVal = val
			} else {
				// 如果不是数字，默认为0
				endVal = 0
			}
			// 保留现有库存的原始字符串
			stockStr = valStr
		} else {
			// 空值显示为0
			stockStr = "0"
		}

		// 销量计算：期初库存 - 期末库存
		sales = startVal - endVal

		// 如果销量为负数，设为0（表示库存增加，没有销售）
		if sales < 0 {
			sales = 0
		}

		// 累加产品数量
		productCount++

		// 加入结果数据：[产品, 产品编码, 现有库存, 销量]
		resultData = append(resultData, []string{
			productName,
			productCode,
			stockStr,                               // 现有库存（原始值）
			strconv.FormatFloat(sales, 'f', 2, 64), // 销量，保留2位小数
		})
	}

	// 8. 生成结果文件名
	fileName := fmt.Sprintf("%d天_销量统计.xlsx", cycleDays)
	if cycleDays <= 0 {
		fileName = "销量统计"
	}

	message := fmt.Sprintf("%d个产品%d天周期销量统计已完成", productCount, cycleDays)

	// 9. 生成Excel文件并转换为Base64
	base64Content, err := s.GenerateExcel(&CycleSalesResult{
		FileName:     fileName,
		Data:         resultData,
		ProductCount: productCount,
		CycleDays:    cycleDays,
		Message:      message,
	})
	if err != nil {
		return nil, fmt.Errorf("生成结果Excel失败：%w", err)
	}

	// 10. 返回统计结果
	return &CycleSalesResult{
		FileName:      fileName,
		Data:          resultData,
		ProductCount:  productCount,
		CycleDays:     cycleDays,
		Message:       message,
		Base64Content: base64Content,
	}, nil
}

// GenerateExcel 生成结果Excel文件
func (s *CycleSalesService) GenerateExcel(result *CycleSalesResult) (string, error) {
	f := excelize.NewFile()
	defer f.Close()

	// 设置工作表名称
	f.SetSheetName("Sheet1", "销量统计")

	// 设置列名：产品、产品编码、现有库存、销量
	headers := []string{"产品", "产品编码", "现有库存", "销量"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue("销量统计", cell, header)
	}

	// 写入数据
	for i, row := range result.Data {
		rowIdx := i + 2
		for j, value := range row {
			cell, _ := excelize.CoordinatesToCellName(j+1, rowIdx)
			f.SetCellValue("销量统计", cell, value)
		}
	}

	// 写入统计信息
	infoRow := len(result.Data) + 3
	f.SetCellValue("销量统计", fmt.Sprintf("A%d", infoRow), "统计信息:")
	f.SetCellValue("销量统计", fmt.Sprintf("B%d", infoRow), fmt.Sprintf("产品数量: %d", result.ProductCount))
	f.SetCellValue("销量统计", fmt.Sprintf("B%d", infoRow+1), fmt.Sprintf("统计周期: %d天", result.CycleDays))
	f.SetCellValue("销量统计", fmt.Sprintf("B%d", infoRow+2), fmt.Sprintf("生成时间: %s", time.Now().Format("2006-01-02 15:04:05")))

	// 保存到缓冲区
	buf := new(bytes.Buffer)
	if err := f.Write(buf); err != nil {
		return "", fmt.Errorf("保存结果Excel到缓冲区失败：%v", err)
	}
	base64Content := base64.StdEncoding.EncodeToString(buf.Bytes())
	return base64Content, nil
}
