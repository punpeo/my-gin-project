/**
 * Excel分组汇总业务模块
 */
const ExcelProcessModule = {
    init: function() {
        // 获取核心元素
        const epProcessBtn = document.getElementById('epProcessBtn');
        const basePathInput = document.getElementById('epBasePath');
        const resultEl = document.getElementById('epResult');
        const resultContentEl = document.getElementById('epResultContent');

        // 元素不存在则直接返回
        if (!epProcessBtn || !basePathInput || !resultEl || !resultContentEl) {
            console.warn('ExcelProcessModule：核心DOM元素缺失，初始化跳过');
            return;
        }

        // 页面加载时设置默认路径
        this.setDefaultBasePath(basePathInput);

        // 绑定按钮点击事件（复用全局防重复点击工具）
        CommonUtils.bindPreventRepeatClick(
            epProcessBtn,
            async () => await this.handleProcessClick(basePathInput, resultEl, resultContentEl),
            '处理中...',
            resultContentEl
        );
    },

    /**
     * 设置默认基础路径
     * @param {HTMLInputElement} input - 路径输入框元素
     */
    setDefaultBasePath: function(input) {
        if (!input.value.trim()) {
            input.value = 'E:\\excel_files';
        }
    },

    /**
     * 处理汇总按钮点击逻辑
     * @param {HTMLInputElement} basePathInput - 路径输入框
     * @param {HTMLElement} resultEl - 结果容器
     * @param {HTMLElement} resultContentEl - 结果内容展示元素
     */
    handleProcessClick: async function(basePathInput, resultEl, resultContentEl) {
        // 1. 获取并处理表单值
        const basePath = basePathInput.value.trim().replace(/\\/g, '/');
        const matchColumn = document.getElementById('epMatchColumn')?.value.trim() || '';
        const matchValue = document.getElementById('epMatchValue')?.value.trim() || '';
        const keepColumnsStr = document.getElementById('epKeepColumns')?.value.trim() || '';
        const sumColumn = document.getElementById('epSumColumn')?.value.trim() || '';

        // 2. 基础校验
        const validateResult = this.validateForm(basePath, matchColumn, keepColumnsStr, sumColumn);
        if (!validateResult.valid) {
            CommonUtils.showResult(resultContentEl, `❌ ${validateResult.msg}`, 'error');
            resultEl.style.display = 'block';
            return;
        }

        // 3. 处理保留列
        const keepColumns = keepColumnsStr.split(',').map(col => col.trim()).filter(col => col);
        if (keepColumns.length === 0) {
            CommonUtils.showResult(resultContentEl, '❌ 保留列不能为空，请输入有效列名！', 'error');
            resultEl.style.display = 'block';
            return;
        }

        // 4. 构造请求参数
        const requestData = {
            base_path: basePath,
            match_column: matchColumn,
            match_value: matchValue,
            keep_columns: keepColumns,
            sum_column: sumColumn,
            output_file: ''
        };

        try {
            // 显示加载提示
            resultEl.style.display = 'block';
            let loadingText = '正在处理Excel数据，请稍候...';
            if (matchValue) {
                loadingText = `正在筛选匹配列包含【${matchValue}】的行，请稍候...`;
            }
            CommonUtils.showResult(resultContentEl, `<div style="color: #666;">${loadingText}</div>`, 'success', true);

            // 5. 发起请求（复用全局工具）
            const response = await CommonUtils.postRequest(
                '/api/v1/excel/process',
                requestData,
                false // JSON格式请求，非FormData
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ msg: '服务器返回非JSON格式错误' }));
                CommonUtils.showResult(resultContentEl, `❌ 处理失败：${errorData.msg || '未知错误'}`, 'error');
                return;
            }

            // 6. 处理文件下载
            const fileName = await CommonUtils.handleFileDownload(response, `excel汇总结果_${new Date().getTime()}.xlsx`);

            // 7. 成功提示
            let successText = 'Excel数据处理完成，文件已开始下载！';
            if (matchValue) {
                successText = `Excel数据处理完成（仅筛选匹配列包含【${matchValue}】的行），文件已开始下载！`;
            }
            CommonUtils.showResult(resultContentEl, `<div style="color: #67c23a;">✅ ${successText}</div>`, 'success', true);

        } catch (error) {
            console.error('Excel汇总请求失败：', error);
            CommonUtils.showResult(resultContentEl, `❌ 请求失败：${error.message || '网络异常'}`, 'error');
        }
    },

    /**
     * 表单校验
     * @param {string} basePath - 基础路径
     * @param {string} matchColumn - 匹配列
     * @param {string} keepColumnsStr - 保留列字符串
     * @param {string} sumColumn - 求和列
     * @returns {Object} 校验结果 {valid: boolean, msg: string}
     */
    validateForm: function(basePath, matchColumn, keepColumnsStr, sumColumn) {
        if (!basePath) {
            return { valid: false, msg: '请输入Excel文件根目录！' };
        }
        if (!matchColumn) {
            return { valid: false, msg: '请输入匹配列名称！' };
        }
        if (!keepColumnsStr) {
            return { valid: false, msg: '请输入保留列名称（英文逗号分隔）！' };
        }
        if (!sumColumn) {
            return { valid: false, msg: '请输入求和列名称！' };
        }
        return { valid: true, msg: '' };
    }
};

// 暴露到全局（关键：让main.js能识别）
window.ExcelProcessModule = ExcelProcessModule;

// 页面加载完成后初始化（兼容单独加载，main.js会统一管理）
document.addEventListener('DOMContentLoaded', () => {
    console.log('ExcelProcessModule 初始化执行');
    ExcelProcessModule.init();
});