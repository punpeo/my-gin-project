/**
 * Excel分组汇总模块
 * 功能：批量处理Excel文件，按匹配列分组并求和
 * 初始化函数：initexcel_sales
 */

const ExcelSalesModule = {
    // 模块配置
    config: {
        api: {
            process: '/api/v1/excel/process'
        }
    },
    
    // DOM元素引用
    elements: {},
    
    // 模块数据
    data: {
        processing: false
    },
    
    /**
     * 初始化模块
     * @param {HTMLElement} container - 模块容器
     */
    init: function(container) {
        console.log('初始化Excel分组汇总模块');
        
        // 缓存DOM元素
        this.cacheElements(container);
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化组件
        this.initComponents();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('excel-sales', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            basePathInput: container.querySelector('#excel-base-path'),
            matchColumnInput: container.querySelector('#excel-match-column'),
            matchValueInput: container.querySelector('#excel-match-value'),
            keepColumnsInput: container.querySelector('#excel-keep-columns'),
            sumColumnInput: container.querySelector('#excel-sum-column'),
            
            // 按钮
            processBtn: container.querySelector('#excel-process-btn'),
            
            // 响应容器
            responseContainer: container.querySelector('#excel-response-container'),
            responseContent: container.querySelector('#excel-response-content'),
            responsePlaceholder: container.querySelector('#excel-response-placeholder')
        };
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents: function() {
        const el = this.elements;
        
        // 处理按钮点击
        if (el.processBtn) {
            el.processBtn.addEventListener('click', (e) => this.handleProcess(e));
        }
        
        // 输入框验证
        if (el.basePathInput) {
            el.basePathInput.addEventListener('input', () => this.validateInputs());
        }
        
        if (el.matchColumnInput) {
            el.matchColumnInput.addEventListener('input', () => this.validateInputs());
        }
        
        if (el.keepColumnsInput) {
            el.keepColumnsInput.addEventListener('input', () => this.validateInputs());
        }
        
        if (el.sumColumnInput) {
            el.sumColumnInput.addEventListener('input', () => this.validateInputs());
        }
    },
    
    /**
     * 初始化组件
     */
    initComponents: function() {
        // 验证输入
        this.validateInputs();
        
        // 更新UI状态
        this.updateUIState();
    },
    
    /**
     * 处理Excel处理请求
     */
    handleProcess: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证输入
        if (!this.validateInputs()) {
            this.showError('请填写所有必填项');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取请求参数
            const requestData = this.getRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在处理Excel文件，请稍候...');
            
            // 调用API
            const response = await this.callProcessAPI(requestData);
            
            // 处理响应
            await this.handleProcessResponse(response);
            
        } catch (error) {
            console.error('处理失败:', error);
            this.showError(`处理失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 获取请求数据
     */
    getRequestData: function() {
        const el = this.elements;
        
        // 解析保留列为数组
        const keepColumnsStr = el.keepColumnsInput?.value.trim() || '';
        const keepColumns = keepColumnsStr.split(',').map(col => col.trim()).filter(col => col);
        
        return {
            base_path: el.basePathInput?.value.trim() || '',
            match_column: el.matchColumnInput?.value.trim() || '',
            match_value: el.matchValueInput?.value.trim() || '',
            keep_columns: keepColumns,
            sum_column: el.sumColumnInput?.value.trim() || ''
        };
    },
    
    /**
     * 调用处理API
     */
    callProcessAPI: async function(requestData) {
        this.showButtonLoading(this.elements.processBtn, '正在处理...');
        
        try {
            const response = await fetch(this.config.api.process, {
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
            this.hideButtonLoading(this.elements.processBtn, '<i class="fas fa-cogs"></i> 开始分组汇总');
        }
    },
    
    /**
     * 处理响应
     */
    handleProcessResponse: async function(response) {
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
            this.showSuccess(`处理完成，结果文件已开始下载: ${filename}`);
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
        let filename = '汇总表.xlsx';
        
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
     * 验证输入
     */
    validateInputs: function() {
        const el = this.elements;
        let isValid = true;
        
        // 验证文件根目录
        if (el.basePathInput && !el.basePathInput.value.trim()) {
            this.markInvalid(el.basePathInput, '请输入Excel文件根目录');
            isValid = false;
        } else {
            this.markValid(el.basePathInput);
        }
        
        // 验证匹配列
        if (el.matchColumnInput && !el.matchColumnInput.value.trim()) {
            this.markInvalid(el.matchColumnInput, '请输入匹配列');
            isValid = false;
        } else {
            this.markValid(el.matchColumnInput);
        }
        
        // 验证保留列
        if (el.keepColumnsInput && !el.keepColumnsInput.value.trim()) {
            this.markInvalid(el.keepColumnsInput, '请输入保留列');
            isValid = false;
        } else {
            this.markValid(el.keepColumnsInput);
        }
        
        // 验证求和列
        if (el.sumColumnInput && !el.sumColumnInput.value.trim()) {
            this.markInvalid(el.sumColumnInput, '请输入求和列');
            isValid = false;
        } else {
            this.markValid(el.sumColumnInput);
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
                    <div class="mt-2">
                        <i class="fas fa-info-circle text-info"></i>
                        <small>文件已开始下载，如未自动下载，请检查浏览器设置</small>
                    </div>
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
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.ExcelSalesModule.retry()">
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
     * 重试
     */
    retry: function() {
        const el = this.elements;
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「开始分组汇总」后，执行结果将展示在此处</p>
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
        if (el.processBtn) {
            el.processBtn.disabled = this.data.processing;
        }
    },
    
    /**
     * 重置模块
     */
    reset: function() {
        const el = this.elements;
        
        // 重置输入框
        if (el.basePathInput) el.basePathInput.value = 'E:/excel_files';
        if (el.matchColumnInput) el.matchColumnInput.value = 'A';
        if (el.matchValueInput) el.matchValueInput.value = '';
        if (el.keepColumnsInput) el.keepColumnsInput.value = 'B,C';
        if (el.sumColumnInput) el.sumColumnInput.value = 'D';
        
        // 重置响应容器
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「开始分组汇总」后，执行结果将展示在此处</p>
            `;
        }
        
        this.showInfo('模块已重置');
    },
    
    /**
     * 销毁模块
     */
    destroy: function() {
        // 清理事件监听器
        const el = this.elements;
        if (el.processBtn) {
            el.processBtn.removeEventListener('click', this.handleProcess);
        }
        
        console.log('Excel分组汇总模块已销毁');
    }
};

// 全局初始化函数
function initexcel_sales(container) {
    ExcelSalesModule.init(container);
}

// 确保模块在全局可用
window.ExcelSalesModule = ExcelSalesModule;
