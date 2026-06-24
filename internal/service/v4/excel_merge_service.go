package v4_service

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/extrame/xls"
	"github.com/xuri/excelize/v2"

	"go-gin/config"
)

const ResultFileName = "merged_result.xlsx"

// ExcelMergeService Excel合并服务
type ExcelMergeService struct {
	sourceDir string // E:\V4\excel_merge\data
	outputDir string // E:\V4\excel_merge\output_data
}

func NewExcelMergeService() *ExcelMergeService {
	cfg := config.GlobalConfig.ExcelMerge
	return &ExcelMergeService{
		sourceDir: cfg.SourceDir,
		outputDir: cfg.OutputDir,
	}
}

// GetResultFilePath 获取最终合并文件完整路径 E:\V4\excel_merge\output_data\merged_result.xlsx
func (s *ExcelMergeService) GetResultFilePath() string {
	return filepath.Join(s.outputDir, ResultFileName)
}

// RunMerge 执行合并逻辑
// iColIndex: 需要写入文件名的列下标(0开始)，外部不传参传8作为默认
func (s *ExcelMergeService) RunMerge(iColIndex int) (string, error) {
	// 简单参数校验，不能小于0
	if iColIndex < 0 {
		return "", errors.New("列下标不能小于0")
	}

	// 自动创建源目录、输出目录
	if err := os.MkdirAll(s.sourceDir, 0755); err != nil {
		return "", fmt.Errorf("创建源文件目录失败：%w", err)
	}
	if err := os.MkdirAll(s.outputDir, 0755); err != nil {
		return "", fmt.Errorf("创建输出目录失败：%w", err)
	}

	targetDir := s.sourceDir
	stat, err := os.Stat(targetDir)
	if err != nil {
		return "", fmt.Errorf("读取源目录失败：%w", err)
	}
	if !stat.IsDir() {
		return "", errors.New("excel_merge.source_dir 不是有效文件夹")
	}

	// 扫描所有xls、xlsx
	var allPaths []string
	xlsList, err := filepath.Glob(filepath.Join(targetDir, "*.xls"))
	if err != nil {
		return "", fmt.Errorf("扫描xls文件失败：%w", err)
	}
	xlsxList, err := filepath.Glob(filepath.Join(targetDir, "*.xlsx"))
	if err != nil {
		return "", fmt.Errorf("扫描xlsx文件失败：%w", err)
	}
	allPaths = append(allPaths, xlsList...)
	allPaths = append(allPaths, xlsxList...)

	var targetFiles []string
	for _, p := range allPaths {
		base := filepath.Base(p)
		if base != ResultFileName {
			targetFiles = append(targetFiles, p)
		}
	}
	if len(targetFiles) == 0 {
		return "", errors.New("E:\\V4\\excel_merge\\data 目录下无xls/xlsx文件")
	}

	outFile := excelize.NewFile()
	defer outFile.Close()
	sheetName := "Sheet1"
	headerWritten := false
	writeRow := 1

	for _, filePath := range targetFiles {
		baseName := filepath.Base(filePath)
		ext := strings.ToLower(filepath.Ext(baseName))
		var errProc error

		switch ext {
		case ".xls":
			errProc = s.processXls(filePath, outFile, sheetName, &headerWritten, &writeRow, iColIndex)
		case ".xlsx":
			errProc = s.processXlsx(filePath, outFile, sheetName, &headerWritten, &writeRow, iColIndex)
		default:
			log.Printf("跳过不支持文件：%s", baseName)
			continue
		}
		if errProc != nil {
			log.Printf("文件 %s 处理异常：%v", baseName, errProc)
		}
	}

	// 保存到 output_data 文件夹
	outPath := s.GetResultFilePath()
	if err := outFile.SaveAs(outPath); err != nil {
		return "", fmt.Errorf("保存合并结果到output_data失败：%w", err)
	}
	return outPath, nil
}

// processXls 处理xls
func (s *ExcelMergeService) processXls(
	filePath string,
	out *excelize.File,
	sheet string,
	headerFlag *bool,
	rowPtr *int,
	iColIndex int,
) error {
	baseName := filepath.Base(filePath)
	fileNameNoExt := strings.TrimSuffix(baseName, ".xls")

	wb, err := xls.Open(filePath, "utf-8")
	if err != nil {
		return err
	}

	for sheetIdx := 0; sheetIdx < wb.NumSheets(); sheetIdx++ {
		ws := wb.GetSheet(sheetIdx)
		if ws == nil || ws.MaxRow == 0 {
			continue
		}
		for rowIdx := 0; rowIdx <= int(ws.MaxRow); rowIdx++ {
			rowData := ws.Row(rowIdx)
			if rowData == nil {
				continue
			}
			var row []string
			for colIdx := 0; ; colIdx++ {
				val := rowData.Col(colIdx)
				if val == "" && colIdx > iColIndex {
					break
				}
				row = append(row, val)
			}
			if len(row) <= iColIndex {
				fill := make([]string, iColIndex-len(row)+1)
				row = append(row, fill...)
			}

			if rowIdx == 0 {
				if !*headerFlag {
					row[iColIndex] = "文件名"
				} else {
					continue
				}
			} else {
				row[iColIndex] = fileNameNoExt
			}

			cell, _ := excelize.CoordinatesToCellName(1, *rowPtr)
			if err := out.SetSheetRow(sheet, cell, &row); err != nil {
				return err
			}
			*rowPtr++
		}
		if !*headerFlag {
			*headerFlag = true
		}
	}
	return nil
}

// processXlsx 处理xlsx
func (s *ExcelMergeService) processXlsx(
	filePath string,
	out *excelize.File,
	sheet string,
	headerFlag *bool,
	rowPtr *int,
	iColIndex int,
) error {
	baseName := filepath.Base(filePath)
	fileNameNoExt := strings.TrimSuffix(baseName, ".xlsx")

	wb, err := excelize.OpenFile(filePath)
	if err != nil {
		return err
	}
	defer wb.Close()

	for _, sheetName := range wb.GetSheetList() {
		rows, err := wb.GetRows(sheetName)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			continue
		}
		for rowIdx, row := range rows {
			if len(row) <= iColIndex {
				fill := make([]string, iColIndex-len(row)+1)
				row = append(row, fill...)
			}
			if rowIdx == 0 {
				if !*headerFlag {
					row[iColIndex] = "文件名"
				} else {
					continue
				}
			} else {
				row[iColIndex] = fileNameNoExt
			}
			cell, _ := excelize.CoordinatesToCellName(1, *rowPtr)
			if err := out.SetSheetRow(sheet, cell, &row); err != nil {
				return err
			}
			*rowPtr++
		}
		if !*headerFlag {
			*headerFlag = true
		}
	}
	return nil
}

// ClearExcelSourceFile 只清理 E:\V4\excel_merge\data 下xls/xlsx，不碰output_data
func ClearExcelSourceFile() error {
	sourceDir := config.GlobalConfig.ExcelMerge.SourceDir
	entries, err := os.ReadDir(sourceDir)
	if err != nil {
		return fmt.Errorf("遍历数据源目录失败：%w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".xls" || ext == ".xlsx" {
			fullPath := filepath.Join(sourceDir, name)
			_ = os.Remove(fullPath)
		}
	}
	return nil
}
