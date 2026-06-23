package v1_service

import (
	"encoding/base64"
	"fmt"
	"go-gin/pkg/logger"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/extrame/xls"
	"github.com/xuri/excelize/v2"
)

// ExcelFillRequest 填充请求参数
type ExcelFillRequest struct {
	RootDir        string `json:"root_dir"`         // 文件根目录路径
	SourceMatchCol string `json:"source_match_col"` // 待输入表匹配列（字母，如A/B/C）
	SourceFillCol  string `json:"source_fill_col"`  // 待输入表待填充列（字母）
	TargetMatchCol string `json:"target_match_col"` // 目标表匹配列（字母）
	TargetValueCol string `json:"target_value_col"` // 目标表取值列（字母）
}

// ExcelFillResponse 填充响应
type ExcelFillResponse struct {
	Message    string `json:"message"`     // 处理结果
	TotalRows  int    `json:"total_rows"`  // 待输入表总行数
	FilledRows int    `json:"filled_rows"` // 成功填充行数
	EmptyRows  int    `json:"empty_rows"`  // 跳过的空行数
	OutputFile string `json:"output_file"` // 输出文件名
	FileSize   int64  `json:"file_size"`   // 文件大小（字节）
	Base64Data string `json:"base64_data"` // 文件Base64编码
}

// ExcelFillService 填充服务接口
type ExcelFillService interface {
	ProcessFill(req ExcelFillRequest) (*ExcelFillResponse, error)
}

type excelFillService struct{}

// NewExcelFillService 创建填充服务实例
func NewExcelFillService() ExcelFillService {
	return &excelFillService{}
}

// ========== 工具函数：列字母转索引（A→0，B→1） ==========
func colToIndex(col string) (int, error) {
	col = strings.ToUpper(col)
	index := 0
	for _, c := range col {
		if !unicode.IsLetter(c) {
			return 0, fmt.Errorf("无效的列格式: %s（仅支持字母A-Z）", col)
		}
		index = index*26 + int(c-'A') + 1
	}
	return index - 1, nil
}

// ========== 检查并获取目标表文件 ==========
func (s *excelFillService) findTargetFile(rootDir string) (string, error) {
	// 尝试查找目标表文件（支持.xls和.xlsx格式）
	possibleTargetFiles := []string{
		filepath.Join(rootDir, "目标表.xlsx"),
		filepath.Join(rootDir, "目标表.xls"),
		filepath.Join(rootDir, "target.xlsx"),
		filepath.Join(rootDir, "target.xls"),
		filepath.Join(rootDir, "目标表.xlsm"),
		filepath.Join(rootDir, "target.xlsm"),
	}

	for _, filePath := range possibleTargetFiles {
		if _, err := os.Stat(filePath); err == nil {
			// 检查文件扩展名
			ext := strings.ToLower(filepath.Ext(filePath))
			if ext == ".xls" || ext == ".xlsx" || ext == ".xlsm" {
				return filePath, nil
			}
		}
	}

	return "", fmt.Errorf("在目录 '%s' 中未找到目标表文件（请确保存在目标表.xlsx或目标表.xls）", rootDir)
}

// ========== 前置检查：文件合法性 ==========
func (s *excelFillService) checkFileValid(filePath string) error {
	// 1. 检查文件是否存在
	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return fmt.Errorf("文件不存在: %s", filePath)
	}
	if err != nil {
		return fmt.Errorf("访问文件失败: %v", err)
	}

	// 2. 检查文件大小（避免空文件/超大文件）
	fileInfo, _ := os.Stat(filePath)
	if fileInfo.Size() == 0 {
		return fmt.Errorf("文件为空: %s", filePath)
	}
	// 限制最大100MB（可根据需求调整）
	if fileInfo.Size() > 100*1024*1024 {
		return fmt.Errorf("文件过大（超过100MB）: %s", filePath)
	}

	// 3. 检查文件扩展名
	ext := strings.ToLower(filepath.Ext(filePath))
	if ext != ".xls" && ext != ".xlsx" && ext != ".xlsm" {
		return fmt.Errorf("不支持的文件格式: %s（仅支持.xls/.xlsx/.xlsm）", ext)
	}

	return nil
}

// ========== 读取Excel文件（支持XLS/XLSX/XLSM，增强容错） ==========
func (s *excelFillService) readExcel(filePath string) ([][]string, error) {
	// 前置文件合法性检查
	if err := s.checkFileValid(filePath); err != nil {
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".xlsx", ".xlsm":
		return s.readXLSX(filePath)
	case ".xls":
		return s.readXLS(filePath)
	default:
		return nil, fmt.Errorf("不支持的文件格式: %s", ext)
	}
}

// 读取XLSX/XLSM文件（增强容错）
func (s *excelFillService) readXLSX(filePath string) ([][]string, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("打开XLSX/XLSM失败: %v", err)
	}
	defer f.Close()

	// 获取第一个工作表（容错：无工作表时返回错误）
	sheetNames := f.GetSheetList()
	if len(sheetNames) == 0 {
		return nil, fmt.Errorf("文件无工作表")
	}
	sheet := sheetNames[0]

	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("读取行失败: %v", err)
	}

	// 过滤全空白行
	var validRows [][]string
	for _, row := range rows {
		isEmpty := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				isEmpty = false
				break
			}
		}
		if !isEmpty {
			validRows = append(validRows, row)
		}
	}

	return validRows, nil
}

// 读取XLS文件（安全处理，修复Close()问题+增强容错）
func (s *excelFillService) readXLS(filePath string) ([][]string, error) {
	// 支持多种编码（解决中文乱码问题）
	encodings := []string{"utf-8", "gbk", "gb2312", "latin1"}
	var file *xls.WorkBook
	var err error

	// 尝试多种编码打开
	for _, enc := range encodings {
		file, err = xls.Open(filePath, enc)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, fmt.Errorf("打开XLS失败（尝试编码：%v）: %v", encodings, err)
	}

	// 容错：无工作表
	sheet := file.GetSheet(0)
	if sheet == nil {
		return nil, fmt.Errorf("XLS文件无工作表")
	}

	var rows [][]string
	maxRow := int(sheet.MaxRow)
	// 容错：MaxRow为0（空表）
	if maxRow == 0 {
		return nil, fmt.Errorf("XLS文件无数据行")
	}

	// 遍历行（从1开始，跳过标题行？可根据需求调整）
	for i := 1; i <= maxRow; i++ {
		row := sheet.Row(i)
		if row == nil {
			continue
		}

		lastCol := row.LastCol()
		var cols []string
		// 容错：LastCol为0（空行）
		if lastCol == 0 {
			continue
		}

		for j := 0; j < lastCol; j++ {
			cellVal := row.Col(j)
			trimmedVal := strings.TrimSpace(cellVal)
			cols = append(cols, trimmedVal)
		}

		// 过滤全空白行
		isEmpty := true
		for _, col := range cols {
			if col != "" {
				isEmpty = false
				break
			}
		}
		if !isEmpty {
			rows = append(rows, cols)
		}
	}

	// 容错：无有效数据
	if len(rows) == 0 {
		return nil, fmt.Errorf("XLS文件无有效数据行")
	}

	return rows, nil
}

// ========== 构建目标表匹配映射（增强容错） ==========
func (s *excelFillService) buildTargetMap(targetRows [][]string, matchIdx, valueIdx int) map[string]string {
	m := make(map[string]string)
	for _, row := range targetRows {
		// 匹配列索引越界则跳过
		if matchIdx >= len(row) {
			continue
		}
		matchVal := strings.TrimSpace(row[matchIdx])
		if matchVal == "" {
			continue
		}
		// 取值列存在则赋值，否则空字符串
		var valueVal string
		if valueIdx < len(row) {
			valueVal = strings.TrimSpace(row[valueIdx])
		}
		// 避免重复键覆盖（保留第一个匹配值）
		if _, exists := m[matchVal]; !exists {
			m[matchVal] = valueVal
		}
	}
	return m
}

// ========== 核心填充逻辑 ==========
func (s *excelFillService) ProcessFill(req ExcelFillRequest) (*ExcelFillResponse, error) {
	// 1. 检查根目录是否存在
	if _, err := os.Stat(req.RootDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("根目录不存在: %s", req.RootDir)
	}

	// 2. 检查待输入表文件是否存在
	sourcePath := filepath.Join(req.RootDir, "待输入表.xlsx")
	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("待输入表文件不存在: %s", sourcePath)
	}

	// 3. 查找目标表文件
	targetPath, err := s.findTargetFile(req.RootDir)
	if err != nil {
		return nil, fmt.Errorf("查找目标表文件失败: %v", err)
	}

	// 4. 列字母转索引（增强错误提示）
	srcMatchIdx, err := colToIndex(req.SourceMatchCol)
	if err != nil {
		return nil, fmt.Errorf("待输入表匹配列格式错误: %v", err)
	}
	srcFillIdx, err := colToIndex(req.SourceFillCol)
	if err != nil {
		return nil, fmt.Errorf("待输入表填充列格式错误: %v", err)
	}
	tgtMatchIdx, err := colToIndex(req.TargetMatchCol)
	if err != nil {
		return nil, fmt.Errorf("目标表匹配列格式错误: %v", err)
	}
	tgtValueIdx, err := colToIndex(req.TargetValueCol)
	if err != nil {
		return nil, fmt.Errorf("目标表取值列格式错误: %v", err)
	}

	// 5. 读取目标表
	tgtRows, err := s.readExcel(targetPath)
	if err != nil {
		return nil, fmt.Errorf("读取目标表失败: %v", err)
	}

	// 6. 构建目标表映射（容错：空映射）
	targetMap := s.buildTargetMap(tgtRows, tgtMatchIdx, tgtValueIdx)
	if len(targetMap) == 0 {
		return nil, fmt.Errorf("目标表无有效匹配数据（匹配列/取值列可能无数据）")
	}

	// 7. 打开待输入表文件
	sourceFile, err := excelize.OpenFile(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("打开待输入表失败: %v", err)
	}
	defer sourceFile.Close()

	// 8. 获取待输入表数据
	sheetNames := sourceFile.GetSheetList()
	if len(sheetNames) == 0 {
		return nil, fmt.Errorf("待输入表无工作表")
	}
	sheet := sheetNames[0]

	rows, err := sourceFile.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("读取待输入表行失败: %v", err)
	}

	// 9. 填充数据
	totalRows := len(rows)
	filledRows := 0
	emptyRows := 0

	for rowIdx, row := range rows {
		// 匹配列越界则跳过
		if srcMatchIdx >= len(row) {
			continue
		}

		// 获取匹配值
		matchVal := strings.TrimSpace(row[srcMatchIdx])
		if matchVal == "" {
			emptyRows++
			continue
		}

		// 查找目标值并填充
		if targetVal, ok := targetMap[matchVal]; ok && targetVal != "" {
			// 计算单元格位置
			colName, err := excelize.ColumnNumberToName(srcFillIdx + 1)
			if err != nil {
				logger.Warnf("列索引转列名失败: %v", err)
				continue
			}
			cellName := fmt.Sprintf("%s%d", colName, rowIdx+1)

			// 设置单元格值
			if err := sourceFile.SetCellValue(sheet, cellName, targetVal); err != nil {
				logger.Warnf("设置单元格[%s]值失败: %v", cellName, err)
				continue
			}
			filledRows++
		}
	}

	// 10. 保存到原文件
	if err := sourceFile.Save(); err != nil {
		return nil, fmt.Errorf("保存待输入表失败: %v", err)
	}

	// 11. 获取文件信息
	fileInfo, err := os.Stat(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("获取文件信息失败: %v", err)
	}
	//12.读取更新后的文件并进行Base64编码
	excelContent, err := os.ReadFile(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("读取更新后的文件失败: %v", err)
	}
	base64Data := base64.StdEncoding.EncodeToString(excelContent)

	// 12. 构建响应
	resp := &ExcelFillResponse{
		Message:    fmt.Sprintf("处理完成！总计%d行，成功填充%d行，跳过空行%d行", totalRows, filledRows, emptyRows),
		TotalRows:  totalRows,
		FilledRows: filledRows,
		EmptyRows:  emptyRows,
		OutputFile: "待输入表_已填充.xlsx",
		FileSize:   fileInfo.Size(),
		Base64Data: base64Data,
	}

	logger.Infof("Excel填充完成：%s，文件大小：%d字节", resp.Message, resp.FileSize)
	return resp, nil
}
