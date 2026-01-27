package service

import (
	"fmt"
	"go-gin/config"
	"os"
	"path/filepath"
	"regexp"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/xuri/excelize/v2"
)

// ========== 基础结构体定义 ==========
type stockData struct {
	shopCode    string
	productCode string
	stock       float64
}

// StockStatisticRequest 库存统计请求
type StockStatisticRequest struct {
	BasePath     string `json:"base_path"`
	BaseFileName string `json:"base_file_name"`
	ColDateName  string `json:"col_date_name"`
}

// DeleteDateColumnRequest 删除日期列请求
type DeleteDateColumnRequest struct {
	BasePath     string `json:"base_path"`
	BaseFileName string `json:"base_file_name"`
	Date         string `json:"date"`
}

// CleanupFileRequest 清理文件请求
type CleanupFileRequest struct {
	BasePath     string `json:"base_path"`
	BaseFileName string `json:"base_file_name"`
}

// StockStatisticResponse 库存统计响应
type StockStatisticResponse struct {
	Message      string  `json:"message"`
	ColName      string  `json:"col_name"`
	Cleanup      int     `json:"cleanup"`       // 固定为0，标记无清理操作
	ProductCount int     `json:"product_count"` // 新增：产品数量
	TotalStock   float64 `json:"total_stock"`   // 新增：总库存数量
}

// DeleteDateColumnResponse 删除日期列响应
type DeleteDateColumnResponse struct {
	Message string `json:"message"`
}

// CleanupFileResponse 清理文件响应
type CleanupFileResponse struct {
	Message string `json:"message"`
	Cleanup int    `json:"cleanup"`
}

// ========== 定时任务全局变量 ==========
var cronJob *cron.Cron

// ========== 核心逻辑：库存统计（无清理） ==========
// StockStatistic 核心库存统计函数
func StockStatistic(req StockStatisticRequest) (*StockStatisticResponse, error) {
	// 参数校验
	if req.BasePath == "" {
		return nil, fmt.Errorf("库存文件根目录不能为空")
	}
	if req.BaseFileName == "" {
		req.BaseFileName = "kucun.xlsx"
	}

	// 生成日期列名
	targetColName := getDateColumnName(req.ColDateName)

	// 打开基准文件
	baseFile, err := excelize.OpenFile(filepath.Join(req.BasePath, req.BaseFileName))
	if err != nil {
		return nil, fmt.Errorf("打开基准文件失败：%v", err)
	}
	defer baseFile.Close()

	baseSheet := baseFile.GetSheetName(0)
	rows, err := baseFile.GetRows(baseSheet)
	if err != nil {
		return nil, fmt.Errorf("读取基准文件行失败：%v", err)
	}

	// 检查列是否已存在
	if len(rows) > 0 {
		for _, cell := range rows[0] {
			if strings.TrimSpace(cell) == targetColName {
				return nil, fmt.Errorf("【提醒】%s列已存在", targetColName)
			}
		}
	}

	// 构建基准商品映射
	baseStockMap := make(map[string]string)
	for rowIdx, row := range rows {
		if rowIdx == 0 || len(row) < 2 || row[0] == "" || row[1] == "" {
			continue
		}
		shopCode := strings.TrimSpace(row[0])
		productCode := strings.TrimSpace(row[1])
		key := fmt.Sprintf("%s_%s", shopCode, productCode)
		baseStockMap[key] = productCode
	}

	// 新增统计变量
	productSet := make(map[string]struct{}) // 用于统计不同产品数量
	totalStock := 0.0                       // 用于统计总库存数量
	stockSumMap := make(map[string]float64) // 原有逻辑保持不变

	// 遍历文件计算库存总和
	err = filepath.Walk(req.BasePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过目录/基准文件/非Excel文件
		ext := strings.ToLower(filepath.Ext(path))
		if info.IsDir() || filepath.Base(path) == req.BaseFileName || !(ext == ".xlsx" || ext == ".xls") {
			return nil
		}

		// 读取待统计文件
		file, err := excelize.OpenFile(path)
		if err != nil {
			fmt.Printf("打开文件%s失败：%v\n", path, err)
			return nil
		}
		defer file.Close()

		sheet := file.GetSheetName(0)
		fileRows, err := file.GetRows(sheet)
		if err != nil {
			fmt.Printf("读取文件%s行失败：%v\n", path, err)
			return nil
		}

		// 定位关键列
		productCodeColIdx, stockColIdx := -1, -1
		if len(fileRows) > 0 {
			for colIdx, cell := range fileRows[0] {
				cell = strings.TrimSpace(cell)
				if cell == "事业部商品编码" {
					productCodeColIdx = colIdx
				} else if cell == "可用库存" {
					stockColIdx = colIdx
				}
			}
		}

		if productCodeColIdx == -1 || stockColIdx == -1 {
			fmt.Printf("文件%s缺少关键列\n", path)
			return nil
		}

		// 统计库存数据
		for rowIdx := 1; rowIdx < len(fileRows); rowIdx++ {
			row := fileRows[rowIdx]
			if len(row) <= productCodeColIdx || len(row) <= stockColIdx {
				continue
			}

			productCode := strings.TrimSpace(row[productCodeColIdx])
			stockStr := strings.TrimSpace(row[stockColIdx])

			if productCode == "" || stockStr == "" {
				continue
			}

			stock, err := strconv.ParseFloat(stockStr, 64)
			if err != nil {
				fmt.Printf("文件%s行%d库存解析失败：%v\n", path, rowIdx+1, err)
				continue
			}

			// 新增统计逻辑
			productSet[productCode] = struct{}{} // 记录唯一产品编码
			totalStock += stock                  // 累加总库存

			// 原有匹配逻辑保持不变
			for key, pc := range baseStockMap {
				if pc == productCode {
					stockSumMap[key] += stock
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("遍历目录失败：%v", err)
	}

	// 写入库存数据到基准文件（原有逻辑保持不变）
	headerRow := rows[0]
	newColIdx := len(headerRow)
	newColLetter, err := excelize.ColumnNumberToName(newColIdx + 1)
	if err != nil {
		return nil, fmt.Errorf("转换列索引失败：%v", err)
	}

	// 写入表头
	if err := baseFile.SetCellValue(baseSheet, fmt.Sprintf("%s1", newColLetter), targetColName); err != nil {
		return nil, fmt.Errorf("设置表头失败：%v", err)
	}

	// 写入数据
	for rowIdx := 1; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]
		excelRowNum := rowIdx + 1
		if len(row) < 2 || row[0] == "" || row[1] == "" {
			continue
		}

		shopCode := strings.TrimSpace(row[0])
		productCode := strings.TrimSpace(row[1])
		key := fmt.Sprintf("%s_%s", shopCode, productCode)

		if sum, ok := stockSumMap[key]; ok {
			if err := baseFile.SetCellValue(baseSheet, fmt.Sprintf("%s%d", newColLetter, excelRowNum), sum); err != nil {
				fmt.Printf("写入行%d库存失败：%v\n", excelRowNum, err)
			}
		}
	}

	// 保存文件
	if err := baseFile.SaveAs(filepath.Join(req.BasePath, req.BaseFileName)); err != nil {
		return nil, fmt.Errorf("保存文件失败：%v", err)
	}

	// 计算产品数量
	productCount := len(productSet)

	fmt.Printf("统计完成！产品数量：%d，总库存数量：%.2f\n", productCount, totalStock)
	// 返回包含新增字段的响应
	return &StockStatisticResponse{
		Message:      fmt.Sprintf("库存更新完成！新增列：%s。统计结果：产品数量 %d，总库存数量 %.2f", targetColName, productCount, totalStock),
		ColName:      targetColName,
		Cleanup:      0,
		ProductCount: productCount,
		TotalStock:   totalStock,
	}, nil
}

// ========== 核心逻辑：删除日期列 ==========
func DeleteDateColumn(req DeleteDateColumnRequest) (*DeleteDateColumnResponse, error) {
	if req.BasePath == "" || req.BaseFileName == "" || req.Date == "" {
		return nil, fmt.Errorf("参数不能为空")
	}
	if !regexp.MustCompile(`^\d+月\d+日$`).MatchString(req.Date) {
		return nil, fmt.Errorf("日期格式错误，需为「1月1日」格式")
	}

	filePath := filepath.Join(req.BasePath, req.BaseFileName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("文件不存在：%s", filePath)
	}

	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("打开文件失败：%v", err)
	}
	defer f.Close()

	baseSheet := f.GetSheetName(0)
	rows, err := f.GetRows(baseSheet)
	if err != nil {
		return nil, fmt.Errorf("读取行失败：%v", err)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("文件无数据")
	}

	// 定位目标列
	targetColIndex := -1
	for colIdx, cell := range rows[0] {
		if strings.TrimSpace(cell) == req.Date {
			targetColIndex = colIdx + 1 // excelize列索引从1开始
			break
		}
	}
	if targetColIndex == -1 {
		return nil, fmt.Errorf("未找到「%s」列", req.Date)
	}

	// 删除列
	targetColLetter, err := excelize.ColumnNumberToName(targetColIndex)
	if err != nil {
		return nil, fmt.Errorf("转换列索引失败：%v", err)
	}
	if err := f.RemoveCol(baseSheet, targetColLetter); err != nil {
		return nil, fmt.Errorf("删除列失败：%v", err)
	}

	// 保存
	if err := f.Save(); err != nil {
		return nil, fmt.Errorf("保存文件失败：%v", err)
	}

	return &DeleteDateColumnResponse{
		Message: fmt.Sprintf("成功删除「%s」列", req.Date),
	}, nil
}

// ========== 核心逻辑：手动清理文件 ==========
func CleanupNonBaseExcelFiles(req CleanupFileRequest) (*CleanupFileResponse, error) {
	if req.BasePath == "" {
		return nil, fmt.Errorf("目录不能为空")
	}
	if req.BaseFileName == "" {
		req.BaseFileName = "kucun.xlsx"
	}

	// 执行清理（标记：手动删除接口）
	cleanupCount, err := cleanupNonBaseExcelFiles(StockStatisticRequest{
		BasePath:     req.BasePath,
		BaseFileName: req.BaseFileName,
	}, "手动删除接口")
	if err != nil {
		return nil, fmt.Errorf("清理失败：%v", err)
	}

	return &CleanupFileResponse{
		Message: fmt.Sprintf("清理完成！共删除 %d 个非基准Excel文件", cleanupCount),
		Cleanup: cleanupCount,
	}, nil
}

// ========== 定时任务：自动清理 ==========
func StartCleanupCronJob() error {
	// 检查配置
	if config.GlobalConfig == nil {
		return fmt.Errorf("配置未加载")
	}
	// 检查定时任务开关
	if !config.GlobalConfig.StockCleanup.Enable {
		fmt.Println("【定时任务】库存清理已禁用")
		return nil
	}

	// 初始化cron
	cronJob = cron.New(cron.WithSeconds())

	// 读取配置参数
	cronExpr := config.GlobalConfig.StockCleanup.CronExpression
	basePath := config.GlobalConfig.StockCleanup.BasePath
	baseFileName := config.GlobalConfig.StockCleanup.BaseFileName

	// 定义定时任务
	job := func() {
		fmt.Printf("【定时任务】开始清理，cron：%s，目录：%s\n", cronExpr, basePath)
		cleanupCount, err := cleanupNonBaseExcelFiles(StockStatisticRequest{
			BasePath:     basePath,
			BaseFileName: baseFileName,
		}, "定时任务")
		if err != nil {
			fmt.Printf("[定时任务] 清理失败：%v\n", err)
		} else {
			fmt.Printf("[定时任务] 清理完成，共删除 %d 个文件\n", cleanupCount)
		}
	}

	// 添加任务
	_, err := cronJob.AddFunc(cronExpr, job)
	if err != nil {
		return fmt.Errorf("添加定时任务失败：%v", err)
	}

	// 启动
	cronJob.Start()
	fmt.Printf("【定时任务】已启动，cron：%s\n", cronExpr)
	return nil
}

// ========== 工具函数：底层清理逻辑 ==========
func cleanupNonBaseExcelFiles(req StockStatisticRequest, triggerType string) (int, error) {
	// 新增：打印触发来源+时间+调用栈
	fmt.Printf("【清理溯源】时间：%s，触发类型：%s，调用栈：%s\n",
		time.Now().Format("2006-01-02 15:04:05"),
		triggerType,
		string(debug.Stack()),
	)
	cleanupCount := 0

	files, err := os.ReadDir(req.BasePath)
	if err != nil {
		return 0, fmt.Errorf("读取目录失败：%v", err)
	}

	for _, file := range files {
		// 跳过Excel临时文件（~$开头）
		if strings.HasPrefix(file.Name(), "~$") {
			fmt.Printf("[%s] 跳过临时文件：%s\n", triggerType, file.Name())
			continue
		}
		// 跳过目录/基准文件
		if file.IsDir() || file.Name() == req.BaseFileName {
			continue
		}
		// 只处理Excel文件
		ext := strings.ToLower(filepath.Ext(file.Name()))
		if ext != ".xlsx" && ext != ".xls" {
			continue
		}

		// 删除文件
		filePath := filepath.Join(req.BasePath, file.Name())
		if err := os.Remove(filePath); err != nil {
			if strings.Contains(err.Error(), "being used by another process") {
				fmt.Printf("[%s] 文件%s被占用，跳过\n", triggerType, filePath)
			} else {
				fmt.Printf("[%s] 删除%s失败：%v\n", triggerType, filePath, err)
			}
			continue
		}
		cleanupCount++
		fmt.Printf("[%s] 已删除：%s\n", triggerType, filePath)
	}

	return cleanupCount, nil
}

// ========== 工具函数：生成日期列名 ==========
func getDateColumnName(customName string) string {
	if strings.TrimSpace(customName) != "" && regexp.MustCompile(`^\d+月\d+日$`).MatchString(customName) {
		return customName
	}
	now := time.Now()
	return fmt.Sprintf("%d月%d日", now.Month(), now.Day())
}

// ========== 工具函数：读取单元格浮点值 ==========
func getCellFloatValue(f *excelize.File, sheet, cell string) (float64, error) {
	val, err := f.GetCellValue(sheet, cell)
	if err != nil {
		return 0, fmt.Errorf("读取单元格%s失败：%v", cell, err)
	}
	if val == "" {
		return 0, nil
	}
	return strconv.ParseFloat(val, 64)
}

// ========== 工具函数：读取文件内容（下载用） ==========
func GetStockFileContent(req StockStatisticRequest) ([]byte, error) {
	if req.BasePath == "" || req.BaseFileName == "" {
		return nil, fmt.Errorf("参数不能为空")
	}
	return os.ReadFile(filepath.Join(req.BasePath, req.BaseFileName))
}

// ========== 工具函数：停止定时任务 ==========
func StopCleanupCronJob() {
	if cronJob != nil {
		cronJob.Stop()
		fmt.Println("【定时任务】已停止")
	}
}
