package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ColumnLetterToNumber 列字母转数字（A=1, B=2, C=3...Z=26）
func ColumnLetterToNumber(letter string) int {
	letter = strings.ToUpper(letter)
	if len(letter) != 1 {
		return 0
	}
	return int(letter[0] - 'A' + 1)
}

// CalculateDateDiff 计算日期差值（支持 1月5日 格式，默认补全当前年份）
func CalculateDateDiff(startDateStr, endDateStr string) (int, error) {
	// 1. 解析中文日期为 月-日 格式
	startMonth, startDay, err := parseChineseDate(startDateStr)
	if err != nil {
		return 0, fmt.Errorf("起始日期解析失败：%w", err)
	}
	endMonth, endDay, err := parseChineseDate(endDateStr)
	if err != nil {
		return 0, fmt.Errorf("结束日期解析失败：%w", err)
	}

	// 2. 补全当前年份
	year := time.Now().Year()

	// 3. 构造标准日期字符串 2006-01-02
	startStr := fmt.Sprintf("%d-%02d-%02d", year, startMonth, startDay)
	endStr := fmt.Sprintf("%d-%02d-%02d", year, endMonth, endDay)

	// 4. 解析为time.Time并计算差值
	startDate, _ := time.Parse("2006-01-02", startStr)
	endDate, _ := time.Parse("2006-01-02", endStr)

	// 处理跨年份情况（如12月30日 到 1月5日，默认按跨年计算）
	if endDate.Before(startDate) {
		endDate = endDate.AddDate(1, 0, 0)
	}

	diff := endDate.Sub(startDate)
	return int(diff.Hours() / 24), nil
}

// parseChineseDate 解析 1月5日 格式为 月份和日期
func parseChineseDate(dateStr string) (month, day int, err error) {
	// 正则匹配：数字+月+数字+日 格式（如 1月5日、12月30日）
	reg := regexp.MustCompile(`(\d+)月(\d+)日`)
	match := reg.FindStringSubmatch(dateStr)
	if len(match) != 3 {
		return 0, 0, fmt.Errorf("格式错误，需为 1月5日 样式")
	}

	// 转换为数字
	month, err = strconv.Atoi(match[1])
	if err != nil || month < 1 || month > 12 {
		return 0, 0, fmt.Errorf("月份无效")
	}

	day, err = strconv.Atoi(match[2])
	if err != nil || day < 1 || day > 31 {
		return 0, 0, fmt.Errorf("日期无效")
	}

	return month, day, nil
}
