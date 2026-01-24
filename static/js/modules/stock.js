/**
 * 库存统计业务模块（复用日期输入框）
 */
const StockModule = {
    // 初始化日期输入框（仅处理一个operateDate）
    initDateInput: function() {
        const operateDateInput = document.getElementById('operateDate');
        const dateTip = document.getElementById('dateTip');
        
        // 1. 生成今日日期
        const getTodayDate = () => {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            return `${month}月${day}日`;
        };

        // 2. 初始化填充今日日期
        if (operateDateInput) {
            operateDateInput.value = getTodayDate();
        }

        // 3. 通用日期格式校验方法（全局复用）
        this.checkDateFormat = (value) => {
            const reg = /^\d+月\d+日$/;
            const isValid = reg.test(value.trim());
            
            // 同步更新提示
            if (dateTip) {
                dateTip.textContent = isValid ? '✅ 格式正确' : '❌ 格式错误（如：1月1日）';
                dateTip.className = isValid ? 'tip success' : 'tip error';
            }
            return isValid;
        };

        // 4. 监听输入事件（仅监听一个输入框）
        if (operateDateInput) {
            operateDateInput.addEventListener('input', () => {
                this.checkDateFormat(operateDateInput.value);
            });
            // 初始化校验
            this.checkDateFormat(operateDateInput.value);
        }
    },

    // 初始化统计按钮逻辑（改用全局防重复点击工具）
    initStatBtn: function() {
        const basePathInput = document.getElementById('basePath') || { value: '' };
        const baseFileNameInput = document.getElementById('baseFileName') || { value: '' };
        const operateDateInput = document.getElementById('operateDate') || { value: '' };
        const statBtn = document.getElementById('statBtn');
        const stockResult = document.getElementById('stockResult') || document.createElement('div');

        if (!statBtn) return;

        // 改用全局防重复点击工具
        CommonUtils.bindPreventRepeatClick(
            statBtn,
            async () => { // 点击后的业务逻辑
                // 1. 获取输入值（复用operateDate）
                const basePath = basePathInput.value.trim();
                const baseFileName = baseFileNameInput.value.trim() || 'kucun.xlsx';
                const operateDate = operateDateInput.value.trim();

                // 2. 控制台打印参数
                console.log('统计请求参数：', {
                    base_path: basePath,
                    base_file_name: baseFileName,
                    col_date_name: operateDate // 传给统计接口的参数名不变
                });

                // 3. 基础校验
                if (!basePath) {
                    CommonUtils.showResult(stockResult, '请输入文件根目录！', 'error');
                    return;
                }
                if (!operateDate) {
                    CommonUtils.showResult(stockResult, '请输入操作日期！', 'error');
                    return;
                }
                if (!this.checkDateFormat(operateDate)) {
                    CommonUtils.showResult(stockResult, '日期格式错误！请输入如「1月1日」的格式', 'error');
                    return;
                }

                // 4. 构建请求参数（col_date_name仍用原有字段名）
                const reqData = {
                    base_path: basePath,
                    base_file_name: baseFileName,
                    col_date_name: operateDate
                };

                // 5. 发送统计请求
                const res = await CommonUtils.postRequest('/api/v1/stock/statistic', reqData);

                // 6. 处理响应（核心调整：移除清理数量相关逻辑）
                const contentType = res.headers.get('Content-Type');
                if (contentType && contentType.includes('spreadsheetml.sheet')) {
                    const fileName = await CommonUtils.handleFileDownload(res, baseFileName);
                    // 移除清理数量展示，明确统计接口无清理操作
                    CommonUtils.showResult(
                        stockResult,
                        `✅ 库存统计完成！文件下载（${fileName}）`,
                        'success',
                        true
                    );
                } else {
                    const data = await res.json();
                    if (data.code === 200) {
                        // 移除cleanupCount展示，改用后端返回的hint
                        CommonUtils.showResult(
                            stockResult,
                            `✅ ${data.data.message}<br>${data.data.hint || '💡 统计接口仅计算库存，清理文件请点击「清理文件」按钮'}`,
                            'success',
                            true
                        );
                    } else {
                        CommonUtils.showResult(stockResult, '❌ ' + data.msg, 'error');
                    }
                }
            },
            '执行中...', // 加载状态文本
            stockResult  // 结果展示元素
        );
    },

    // 初始化删除日期列按钮逻辑（改用全局防重复点击工具）
    initDeleteColBtn: function() {
        const basePathInput = document.getElementById('basePath') || { value: '' };
        const baseFileNameInput = document.getElementById('baseFileName') || { value: '' };
        const operateDateInput = document.getElementById('operateDate') || { value: '' };
        const deleteColBtn = document.getElementById('deleteColBtn');
        const stockResult = document.getElementById('stockResult') || document.createElement('div');

        if (!deleteColBtn) return;

        // 改用全局防重复点击工具
        CommonUtils.bindPreventRepeatClick(
            deleteColBtn,
            async () => { // 点击后的业务逻辑
                // 1. 获取输入值
                const basePath = basePathInput.value.trim();
                const baseFileName = baseFileNameInput.value.trim() || 'kucun.xlsx';
                const operateDate = operateDateInput.value.trim();

                // 2. 基础校验
                if (!basePath) {
                    CommonUtils.showResult(stockResult, '请输入文件根目录！', 'error');
                    return;
                }
                if (!operateDate) {
                    CommonUtils.showResult(stockResult, '请输入操作日期！', 'error');
                    return;
                }
                if (!this.checkDateFormat(operateDate)) {
                    CommonUtils.showResult(stockResult, '日期格式错误！请输入如「1月1日」的格式', 'error');
                    return;
                }

                // 3. 构建请求参数
                const reqData = {
                    base_path: basePath,
                    base_file_name: baseFileName,
                    date: operateDate
                };

                // 4. 发送删除请求（修正接口路径为正确的delete-date-column）
                const res = await CommonUtils.postRequest('/api/v1/stock/delete-date-column', reqData);
                const data = await res.json();

                if (data.code === 200) {
                    CommonUtils.showResult(
                        stockResult,
                        `✅ ${data.data.message || '成功删除指定日期列！'}`,
                        'success',
                        true
                    );
                } else {
                    CommonUtils.showResult(stockResult, '❌ ' + (data.msg || '删除日期列失败！'), 'error');
                }
            },
            '删除中...', // 加载状态文本
            stockResult  // 结果展示元素
        );
    },

    // 初始化清理文件按钮逻辑（改用全局防重复点击工具）
    initCleanupBtn: function() {
        const basePathInput = document.getElementById('basePath') || { value: '' };
        const baseFileNameInput = document.getElementById('baseFileName') || { value: '' };
        const cleanupBtn = document.getElementById('cleanupBtn');
        const stockResult = document.getElementById('stockResult') || document.createElement('div');

        if (!cleanupBtn) return;

        // 改用全局防重复点击工具
        CommonUtils.bindPreventRepeatClick(
            cleanupBtn,
            async () => { // 点击后的业务逻辑
                // 1. 获取输入值
                const basePath = basePathInput.value.trim();
                const baseFileName = baseFileNameInput.value.trim() || 'kucun.xlsx';

                // 2. 基础校验
                if (!basePath) {
                    CommonUtils.showResult(stockResult, '请输入文件根目录！', 'error');
                    return;
                }

                // 3. 构建请求参数
                const reqData = {
                    base_path: basePath,
                    base_file_name: baseFileName
                };

                // 4. 发送清理请求
                const res = await CommonUtils.postRequest('/api/v1/stock/cleanup', reqData);
                const data = await res.json();

                if (data.code === 200) {
                    // 优化展示：显示清理数量+触发来源+提示
                    CommonUtils.showResult(
                        stockResult,
                        `✅ ${data.data.message}<br>🔍 触发来源：${data.data.trigger}<br>💡 ${data.data.hint}`,
                        'success',
                        true
                    );
                } else {
                    CommonUtils.showResult(stockResult, '❌ ' + (data.msg || '清理文件失败！'), 'error');
                }
            },
            '清理中...', // 加载状态文本
            stockResult  // 结果展示元素
        );
    },

    // 模块初始化入口
    init: function() {
        this.initDateInput();
        this.initStatBtn();
        this.initDeleteColBtn();
        this.initCleanupBtn(); 
    }
};

window.StockModule = StockModule;

// 页面加载完成后初始化（确保仅执行一次）
document.addEventListener('DOMContentLoaded', () => {
    console.log('StockModule 初始化执行');
    StockModule.init();
});