/**
 * 库存统计模块
 * 功能：库存统计、删除日期列、清理库存文件
 * 初始化函数：initstock
 */

const StockModule = {
    // 模块配置
    config: {
        api: {
            statistics: '/api/v1/stock/statistics',
            deleteDateColumn: '/api/v1/stock/delete-date-column',
            cleanup: '/api/v1/stock/cleanup'
        }
    },
    
    // DOM元素引用
    elements: {},
    
    // 模块数据
    data: {
        processing: false,
        dateUpdateInterval: null // 日期更新定时器
    },
    
    /**
     * 获取当前日期字符串
     */
    getCurrentDateString: function() {
        const now = new Date();
        const month = now.getMonth() + 1; // 月份从0开始
        const day = now.getDate();
        return `${month}月${day}日`;
    },
    
    /**
     * 初始化模块
     * @param {HTMLElement} container - 模块容器
     */
    init: function(container) {
        console.log('初始化库存统计模块');
        
        // 缓存DOM元素
        this.cacheElements(container);
        
        // 设置当前日期到输入框
        this.setCurrentDate();
        
        // 开始实时日期更新
        this.startRealTimeDateUpdate();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化组件
        this.initComponents();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('stock', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            basePathInput: container.querySelector('#stock-base-path'),
            baseFileNameInput: container.querySelector('#stock-base-file-name'),
            dateInput: container.querySelector('#stock-date-input'),
            dateFormatIndicator: container.querySelector('#stock-date-format-indicator'),
            
            // 按钮
            statisticsBtn: container.querySelector('#stock-statistics-btn'),
            deleteDateBtn: container.querySelector('#stock-delete-date-btn'),
            cleanupBtn: container.querySelector('#stock-cleanup-btn'),
            
            // 响应容器
            responseContainer: container.querySelector('#stock-response-container'),
            responseContent: container.querySelector('#stock-response-content'),
            responsePlaceholder: container.querySelector('#stock-response-placeholder')
        };
    },
    
    /**
     * 设置当前日期到输入框
     */
    setCurrentDate: function() {
        if (this.elements.dateInput) {
            this.elements.dateInput.value = this.getCurrentDateString();
            this.updateDateFormatIndicator(true);
        }
    },
    
    /**
     * 开始实时日期更新
     */
    startRealTimeDateUpdate: function() {
        // 清除已有的定时器
        if (this.data.dateUpdateInterval) {
            clearInterval(this.data.dateUpdateInterval);
        }
        
        // 设置定时器，每分钟检查一次是否需要更新日期
        this.data.dateUpdateInterval = setInterval(() => {
            this.checkAndUpdateDate();
        }, 60000); // 每分钟检查一次
        
        // 立即检查一次
        this.checkAndUpdateDate();
    },
    
    /**
     * 检查并更新日期
     */
    checkAndUpdateDate: function() {
        const el = this.elements;
        if (!el.dateInput) return;
        
        const currentDateStr = this.getCurrentDateString();
        const currentInputValue = el.dateInput.value.trim();
        
        // 如果输入框为空或者是今天日期，则更新为当前日期
        if (currentInputValue === '' || currentInputValue === currentDateStr) {
            if (currentInputValue !== currentDateStr) {
                this.setCurrentDate();
                this.showDateUpdatedNotification();
            }
        }
    },
    
    /**
     * 显示日期更新通知
     */
    showDateUpdatedNotification: function() {
        console.log('日期已自动更新为当前日期');
        // 可以在响应容器显示简短提示
        this.showTemporaryInfo('日期已自动更新为当前日期');
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents: function() {
        const el = this.elements;
        
        // 执行库存统计按钮点击
        if (el.statisticsBtn) {
            el.statisticsBtn.addEventListener('click', (e) => this.handleStatistics(e));
        }
        
        // 删除日期列按钮点击
        if (el.deleteDateBtn) {
            el.deleteDateBtn.addEventListener('click', (e) => this.handleDeleteDateColumn(e));
        }
        
        // 清理库存文件按钮点击
        if (el.cleanupBtn) {
            el.cleanupBtn.addEventListener('click', (e) => this.handleCleanup(e));
        }
        
        // 日期输入框验证
        if (el.dateInput) {
            el.dateInput.addEventListener('input', () => this.validateDateFormat());
            
            // 日期输入框失去焦点时，如果是今天日期则保持实时更新
            el.dateInput.addEventListener('blur', () => {
                const currentDateStr = this.getCurrentDateString();
                const inputValue = el.dateInput.value.trim();
                
                if (inputValue === currentDateStr) {
                    // 用户输入了今天日期，重新启动实时更新
                    this.startRealTimeDateUpdate();
                }
            });
            
            // 日期输入框获得焦点时，暂停实时更新
            el.dateInput.addEventListener('focus', () => {
                this.pauseRealTimeDateUpdate();
            });
        }
        
        // 输入框验证
        if (el.basePathInput) {
            el.basePathInput.addEventListener('input', () => this.validateInputs());
        }
        
        if (el.baseFileNameInput) {
            el.baseFileNameInput.addEventListener('input', () => this.validateInputs());
        }
    },
    
    /**
     * 暂停实时日期更新
     */
    pauseRealTimeDateUpdate: function() {
        if (this.data.dateUpdateInterval) {
            clearInterval(this.data.dateUpdateInterval);
            this.data.dateUpdateInterval = null;
        }
    },
    
    /**
     * 初始化组件
     */
    initComponents: function() {
        // 验证日期格式
        this.validateDateFormat();
        
        // 更新UI状态
        this.updateUIState();
    },
    
    /**
     * 验证日期格式
     */
    validateDateFormat: function() {
        const el = this.elements;
        if (!el.dateInput || !el.dateFormatIndicator) return;
        
        const value = el.dateInput.value.trim();
        const isValid = this.isValidDateFormat(value);
        
        this.updateDateFormatIndicator(isValid);
        return isValid;
    },
    
    /**
     * 检查日期格式是否有效
     */
    isValidDateFormat: function(dateStr) {
        if (!dateStr) return false;
        
        // 格式：x月x日，例如：1月22日、12月5日
        const pattern = /^(\d{1,2})月(\d{1,2})日$/;
        const match = dateStr.match(pattern);
        
        if (!match) return false;
        
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        
        // 简单验证月份和日期的有效性
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        
        return true;
    },
    
    /**
     * 更新日期格式指示器
     */
    updateDateFormatIndicator: function(isValid) {
        const el = this.elements;
        if (!el.dateFormatIndicator) return;
        
        if (isValid) {
            el.dateFormatIndicator.innerHTML = `
                <i class="fas fa-check-circle"></i> 格式正确
            `;
            el.dateFormatIndicator.style.color = 'var(--success)';
        } else {
            el.dateFormatIndicator.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 格式错误
            `;
            el.dateFormatIndicator.style.color = 'var(--danger)';
        }
    },
    
    /**
     * 处理库存统计
     */
    handleStatistics: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证输入
        if (!this.validateInputs()) {
            this.showError('请填写所有必填项');
            return;
        }
        
        // 验证日期格式
        if (!this.validateDateFormat()) {
            this.showError('日期格式不正确，请使用"x月x日"格式');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取请求参数
            const requestData = this.getStatisticsRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在执行库存统计...');
            
            // 调用API
            const response = await this.callStatisticsAPI(requestData);
            
            // 处理响应
            await this.handleStatisticsResponse(response);
            
        } catch (error) {
            console.error('库存统计失败:', error);
            this.showError(`库存统计失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 获取库存统计请求数据
     */
    getStatisticsRequestData: function() {
        const el = this.elements;
        
        return {
            base_path: el.basePathInput?.value.trim() || '',
            base_file_name: el.baseFileNameInput?.value.trim() || '',
            col_date_name: el.dateInput?.value.trim() || ''
        };
    },
    
    /**
     * 调用库存统计API
     */
    callStatisticsAPI: async function(requestData) {
        this.showButtonLoading(this.elements.statisticsBtn, '正在统计...');
        
        try {
            const response = await fetch(this.config.api.statistics, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.statisticsBtn, '<i class="fas fa-chart-bar"></i> 执行库存统计');
        }
    },
    
    /**
     * 处理库存统计响应
     */
    handleStatisticsResponse: async function(response) {
        const contentType = response.headers.get('content-type');
        
        // 检查是否为错误响应
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.msg || `错误码: ${errorData.code}`);
        }
        
        // 检查是否为Excel文件
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            // 处理Excel文件下载
            const filename = await this.handleExcelFileDownload(response);
            
            // 显示成功消息
            this.showSuccess(`库存统计完成，结果已下载: ${filename}`);
        } else {
            throw new Error('未知的响应类型');
        }
    },
    
    /**
     * 处理Excel文件下载
     */
    handleExcelFileDownload: async function(response) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'kucun.xlsx';
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = decodeURIComponent(filenameMatch[1]);
            }
        }
        
        // 创建Blob并下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return filename;
    },
    
    /**
     * 处理删除日期列
     */
    handleDeleteDateColumn: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证输入
        if (!this.validateInputs()) {
            this.showError('请填写所有必填项');
            return;
        }
        
        // 验证日期格式
        if (!this.validateDateFormat()) {
            this.showError('日期格式不正确，请使用"x月x日"格式');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取请求参数
            const requestData = this.getDeleteDateRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在删除日期列...');
            
            // 调用API
            const response = await this.callDeleteDateAPI(requestData);
            
            // 处理响应
            await this.handleDeleteDateResponse(response);
            
        } catch (error) {
            console.error('删除日期列失败:', error);
            this.showError(`删除日期列失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 获取删除日期列请求数据
     */
    getDeleteDateRequestData: function() {
        const el = this.elements;
        
        return {
            base_path: el.basePathInput?.value.trim() || '',
            base_file_name: el.baseFileNameInput?.value.trim() || '',
            date: el.dateInput?.value.trim() || ''
        };
    },
    
    /**
     * 调用删除日期列API
     */
    callDeleteDateAPI: async function(requestData) {
        this.showButtonLoading(this.elements.deleteDateBtn, '正在删除...');
        
        try {
            const response = await fetch(this.config.api.deleteDateColumn, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.deleteDateBtn, '<i class="fas fa-trash-can"></i> 删除日期列');
        }
    },
    
    /**
     * 处理删除日期列响应
     */
    handleDeleteDateResponse: async function(response) {
        const data = await response.json();
        
        if (data.code === 200) {
            this.showSuccess(data.msg || '删除日期列成功');
        } else {
            throw new Error(data.msg || `错误码: ${data.code}`);
        }
    },
    
    /**
     * 处理清理库存文件
     */
    handleCleanup: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证输入
        if (!this.validateBaseInputs()) {
            this.showError('请填写文件根目录和基准文件名');
            return;
        }
        
        // 显示确认对话框
        if (!confirm('确定要清理库存文件吗？这将删除所有非基准Excel文件。')) {
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取请求参数
            const requestData = this.getCleanupRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在清理库存文件...');
            
            // 调用API
            const response = await this.callCleanupAPI(requestData);
            
            // 处理响应
            await this.handleCleanupResponse(response);
            
        } catch (error) {
            console.error('清理库存文件失败:', error);
            this.showError(`清理库存文件失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 获取清理库存文件请求数据
     */
    getCleanupRequestData: function() {
        const el = this.elements;
        
        return {
            base_path: el.basePathInput?.value.trim() || '',
            base_file_name: el.baseFileNameInput?.value.trim() || ''
        };
    },
    
    /**
     * 调用清理库存文件API
     */
    callCleanupAPI: async function(requestData) {
        this.showButtonLoading(this.elements.cleanupBtn, '正在清理...');
        
        try {
            const response = await fetch(this.config.api.cleanup, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.cleanupBtn, '<i class="fas fa-trash-can"></i> 删除库存文件');
        }
    },
    
    /**
     * 处理清理库存文件响应
     */
    handleCleanupResponse: async function(response) {
        const data = await response.json();
        
        if (data.code === 200) {
            const message = data.msg || '清理完成';
            const hint = data.data?.hint || '';
            
            let fullMessage = message;
            if (hint) {
                fullMessage += `<br><small>${hint}</small>`;
            }
            
            this.showSuccess(fullMessage);
        } else {
            throw new Error(data.msg || `错误码: ${data.code}`);
        }
    },
    
    /**
     * 验证所有输入
     */
    validateInputs: function() {
        const el = this.elements;
        let isValid = true;
        
        // 验证文件根目录
        if (el.basePathInput && !el.basePathInput.value.trim()) {
            this.markInvalid(el.basePathInput, '请输入文件根目录');
            isValid = false;
        } else {
            this.markValid(el.basePathInput);
        }
        
        // 验证基准文件名
        if (el.baseFileNameInput && !el.baseFileNameInput.value.trim()) {
            this.markInvalid(el.baseFileNameInput, '请输入基准文件名');
            isValid = false;
        } else {
            this.markValid(el.baseFileNameInput);
        }
        
        // 验证操作日期
        if (el.dateInput && !el.dateInput.value.trim()) {
            this.markInvalid(el.dateInput, '请输入操作日期');
            isValid = false;
        } else if (!this.validateDateFormat()) {
            this.markInvalid(el.dateInput, '日期格式不正确，请使用"x月x日"格式');
            isValid = false;
        } else {
            this.markValid(el.dateInput);
        }
        
        return isValid;
    },
    
    /**
     * 验证基础输入（仅文件根目录和基准文件名）
     */
    validateBaseInputs: function() {
        const el = this.elements;
        let isValid = true;
        
        // 验证文件根目录
        if (el.basePathInput && !el.basePathInput.value.trim()) {
            this.markInvalid(el.basePathInput, '请输入文件根目录');
            isValid = false;
        } else {
            this.markValid(el.basePathInput);
        }
        
        // 验证基准文件名
        if (el.baseFileNameInput && !el.baseFileNameInput.value.trim()) {
            this.markInvalid(el.baseFileNameInput, '请输入基准文件名');
            isValid = false;
        } else {
            this.markValid(el.baseFileNameInput);
        }
        
        return isValid;
    },
    
    /**
     * 标记为无效
     */
    markInvalid: function(element, message) {
        if (!element) return;
        
        element.classList.add('is-invalid');
        element.classList.remove('is-valid');
        
        // 显示错误消息
        let feedback = element.nextElementSibling;
        if (!feedback || !feedback.classList.contains('invalid-feedback')) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            element.parentNode.appendChild(feedback);
        }
        feedback.textContent = message;
    },
    
    /**
     * 标记为有效
     */
    markValid: function(element) {
        if (!element) return;
        
        element.classList.remove('is-invalid');
        element.classList.add('is-valid');
        
        // 移除错误消息
        const feedback = element.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.remove();
        }
    },
    
    /**
     * 显示处理中状态
     */
    showProcessing: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        el.responseContainer.classList.remove('d-none');
        el.responseContent.innerHTML = `
            <div class="processing-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <div class="processing-text">
                    <h5>${message || '正在处理'}</h5>
                    <p>请稍候...</p>
                    <div class="progress" style="height: 4px; margin-top: 10px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        el.responseContent.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle text-success"></i>
                <div class="message-text">
                    <h5>处理完成</h5>
                    <p>${message}</p>
                </div>
            </div>
        `;
    },
    
    /**
     * 显示错误消息
     */
    showError: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        el.responseContainer.classList.remove('d-none');
        el.responseContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <div class="message-text">
                    <h5>处理失败</h5>
                    <p>${message}</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.StockModule.retry()">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * 显示按钮加载状态
     */
    showButtonLoading: function(button, loadingText) {
        if (!button) return;
        
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i> ${loadingText}
        `;
        button.disabled = true;
    },
    
    /**
     * 隐藏按钮加载状态
     */
    hideButtonLoading: function(button, defaultText) {
        if (!button) return;
        
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
        } else if (defaultText) {
            button.innerHTML = defaultText;
        }
        button.disabled = false;
    },
    
    /**
     * 显示临时信息消息
     */
    showTemporaryInfo: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        const originalContent = el.responseContent.innerHTML;
        
        el.responseContainer.classList.remove('d-none');
        el.responseContent.innerHTML = `
            <div class="info-message">
                <i class="fas fa-info-circle text-info"></i>
                <div class="message-text">
                    <h5>提示</h5>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        // 3秒后恢复原始内容
        setTimeout(() => {
            if (el.responseContent) {
                el.responseContent.innerHTML = originalContent;
            }
        }, 3000);
    },
    
    /**
     * 重试
     */
    retry: function() {
        const el = this.elements;
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「操作」后，执行结果将展示在此处</p>
            `;
        }
    },
    
    /**
     * 设置处理状态
     */
    setProcessing: function(isProcessing) {
        this.data.processing = isProcessing;
        this.updateUIState();
    },
    
    /**
     * 更新UI状态
     */
    updateUIState: function() {
        const el = this.elements;
        if (el.statisticsBtn) {
            el.statisticsBtn.disabled = this.data.processing;
        }
        if (el.deleteDateBtn) {
            el.deleteDateBtn.disabled = this.data.processing;
        }
        if (el.cleanupBtn) {
            el.cleanupBtn.disabled = this.data.processing;
        }
    },
    
    /**
     * 重置模块
     */
    reset: function() {
        const el = this.elements;
        
        // 重置输入框
        if (el.basePathInput) el.basePathInput.value = 'E:\\kucun';
        if (el.baseFileNameInput) el.baseFileNameInput.value = 'kucun.xlsx';
        
        // 重置日期为当前日期
        this.setCurrentDate();
        
        // 重启实时日期更新
        this.startRealTimeDateUpdate();
        
        // 重置响应容器
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「操作」后，执行结果将展示在此处</p>
            `;
        }
        
        this.showTemporaryInfo('模块已重置');
    },
    
    /**
     * 销毁模块
     */
    destroy: function() {
        // 清理事件监听器
        const el = this.elements;
        if (el.statisticsBtn) {
            el.statisticsBtn.removeEventListener('click', this.handleStatistics);
        }
        if (el.deleteDateBtn) {
            el.deleteDateBtn.removeEventListener('click', this.handleDeleteDateColumn);
        }
        if (el.cleanupBtn) {
            el.cleanupBtn.removeEventListener('click', this.handleCleanup);
        }
        
        // 清除日期更新定时器
        if (this.data.dateUpdateInterval) {
            clearInterval(this.data.dateUpdateInterval);
            this.data.dateUpdateInterval = null;
        }
        
        console.log('库存统计模块已销毁');
    }
};

// 全局初始化函数
function initstock(container) {
    StockModule.init(container);
}

// 确保模块在全局可用
window.StockModule = StockModule;
