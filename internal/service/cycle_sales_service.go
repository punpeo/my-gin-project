package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"go-gin/internal/model"
	"go-gin/internal/utils"

	"github.com/xuri/excelize/v2"
)

// CycleSalesService 产品周期销量统计服务
type CycleSalesService struct{}

// NewCycleSalesService 创建服务实例
func NewCycleSalesService() *CycleSalesService {
	return &CycleSalesService{}
}

// Statistic 执行销量统计（新增现有库存列）
func (s *CycleSalesService) Statistic(req *model.CycleSalesRequest) (*model.CycleSalesResult, error) {
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
	startCol := utils.ColumnLetterToNumber(req.StartColumn) // 起始列（如C列）
	endCol := utils.ColumnLetterToNumber(req.EndColumn)     // 结束列（如D列，对应现有库存）
	if startCol == 0 || endCol == 0 {
		return nil, fmt.Errorf("列字母格式错误（仅支持A-Z）")
	}

	// 6. 读取所有行数据
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("读取Excel行数据失败：%w", err)
	}

	// 7. 核心逻辑：处理数据
	var (
		resultData   [][]string
		productCount int
		cycleDays    int
	)

	// 7.1 计算周期天数（第一行的起始列/结束列作为日期）
	if len(rows) > 0 {
		firstRow := rows[0]
		if startCol <= len(firstRow) && endCol <= len(firstRow) {
			startDateStr := strings.TrimSpace(firstRow[startCol-1])
			endDateStr := strings.TrimSpace(firstRow[endCol-1])
			if startDateStr != "" && endDateStr != "" {
				cycleDays, err = utils.CalculateDateDiff(startDateStr, endDateStr)
				if err != nil {
					cycleDays = 0 // 日期解析失败默认0
				}
			}
		}
	}

	// 7.2 处理偶数列数据（2、4、6...行）
	for i := 1; i < len(rows); i++ {
		// 仅处理偶数列（i+1是实际行号）
		if (i+1)%2 != 0 {
			continue
		}

		row := rows[i]
		// 跳过空行（A/B列都为空）
		if len(row) < 2 || (strings.TrimSpace(row[0]) == "" && strings.TrimSpace(row[1]) == "") {
			continue
		}

		// 获取产品名、产品编码
		productName := strings.TrimSpace(row[0])
		productCode := strings.TrimSpace(row[1])
		if productName == "" && productCode == "" {
			continue
		}

		// 解析起始列/结束列数值
		var (
			startVal float64 // 起始列值（如C列）
			endVal   float64 // 结束列值（如D列，现有库存）
			sales    float64 // 销量（起始列 - 结束列）
			stockStr string  // 现有库存字符串（保留原始格式）
		)

		// 解析起始列值（前面列，如1月5日）
		if startCol <= len(row) && strings.TrimSpace(row[startCol-1]) != "" {
			startVal, err = strconv.ParseFloat(strings.TrimSpace(row[startCol-1]), 64)
			if err != nil {
				startVal = 0
			}
		}

		// 解析结束列值（后面列，如1月6日，对应现有库存）
		if endCol <= len(row) && strings.TrimSpace(row[endCol-1]) != "" {
			endVal, err = strconv.ParseFloat(strings.TrimSpace(row[endCol-1]), 64)
			if err != nil {
				endVal = 0
			}
			// 保留现有库存的原始字符串（避免格式丢失）
			stockStr = strings.TrimSpace(row[endCol-1])
		} else {
			// 空值显示为0
			stockStr = "0"
		}

		// 销量计算：前面列 - 后面列（允许负值）
		sales = startVal - endVal

		// 累加产品数量
		productCount++

		// 加入结果数据：[产品, 产品编码, 现有库存, 销量]
		resultData = append(resultData, []string{
			productName,
			productCode,
			stockStr,                               // 现有库存（原始值）
			strconv.FormatFloat(sales, 'f', 0, 64), // 销量
		})
	}

	// 8. 生成结果文件名
	fileName := fmt.Sprintf("%d天_销量统计.xlsx", cycleDays)
	if cycleDays <= 0 {
		fileName = "销量统计.xlsx"
	}

	// 9. 返回统计结果
	return &model.CycleSalesResult{
		FileName:     fileName,
		Data:         resultData,
		ProductCount: productCount,
		CycleDays:    cycleDays,
	}, nil
}

// GenerateExcel 生成结果Excel文件（调整列名和列顺序）
func (s *CycleSalesService) GenerateExcel(result *model.CycleSalesResult) (*excelize.File, error) {
	f := excelize.NewFile()

	// 设置列名：产品、产品编码、现有库存、销量
	f.SetCellValue("Sheet1", "A1", "产品")
	f.SetCellValue("Sheet1", "B1", "产品编码")
	f.SetCellValue("Sheet1", "C1", "现有库存")
	f.SetCellValue("Sheet1", "D1", "销量")

	// 写入数据
	for i, row := range result.Data {
		rowIdx := i + 2
		f.SetCellValue("Sheet1", fmt.Sprintf("A%d", rowIdx), row[0]) // 产品
		f.SetCellValue("Sheet1", fmt.Sprintf("B%d", rowIdx), row[1]) // 产品编码
		f.SetCellValue("Sheet1", fmt.Sprintf("C%d", rowIdx), row[2]) // 现有库存
		f.SetCellValue("Sheet1", fmt.Sprintf("D%d", rowIdx), row[3]) // 销量
	}

	return f, nil
}
