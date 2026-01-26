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
            this.showError(error.message);
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
            
            // 检查HTTP状态码
            if (!response.ok) {
                // 对于400和500错误，解析JSON错误响应
                if (response.status === 400 || response.status === 500) {
                    const errorData = await response.json().catch(() => null);
                    
                    if (errorData && errorData.msg) {
                        // 使用后端返回的错误信息
                        throw new Error(errorData.msg);
                    } else {
                        // 如果没有错误信息，使用默认消息
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } else {
                    // 其他HTTP错误
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            return response;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('网络连接失败，请检查网络连接');
            }
            throw error; // 重新抛出已处理的错误
        } finally {
            this.hideButtonLoading(this.elements.processBtn, '<i class="fas fa-cogs"></i> 开始分组汇总');
        }
    },
    
    /**
     * 处理响应
     */
    handleProcessResponse: async function(response) {
        const contentType = response.headers.get('content-type');
        
        // 检查是否为Excel文件
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            // 处理Excel文件下载
            const filename = await this.handleExcelFileDownload(response);
            
            // 显示成功消息
            this.showSuccess(`处理完成，结果文件已开始下载: ${filename}`);
        } else {
            // 如果不是Excel文件，尝试解析错误
            const errorData = await response.json().catch(() => null);
            if (errorData && errorData.msg) {
                throw new Error(errorData.msg);
            } else {
                throw new Error('未知的响应类型');
            }
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
     * 清除响应容器状态
     */
    clearResponseContainer: function() {
        const el = this.elements;
        if (!el.responseContent) return;
        
        // 移除所有状态类
        el.responseContent.classList.remove('success', 'error', 'loading');
        
        // 恢复默认样式
        el.responseContent.style.border = '1px solid var(--gray-200)';
        el.responseContent.style.background = 'linear-gradient(135deg, var(--gray-50), white)';
        el.responseContent.style.color = 'var(--gray-700)';
    },
    
    /**
     * 显示处理中状态
     */
    showProcessing: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        // 清除之前的样式
        this.clearResponseContainer();
        
        // 应用加载中样式
        el.responseContent.classList.add('loading');
        
        el.responseContainer.classList.remove('d-none');
        el.responseContent.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--gray-500);"></i>
                <div style="font-size: 0.9rem; color: var(--gray-600);">${message || '正在处理'}</div>
            </div>
        `;
    },
    
    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        // 清除之前的样式
        this.clearResponseContainer();
        
        // 应用成功样式
        el.responseContent.classList.add('success');
        
        el.responseContent.innerHTML = `
            <div style="display: flex; align-items: center; height: 100%;">
                <i class="fas fa-check-circle" style="font-size: 20px; margin-right: 10px; color: var(--success);"></i>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px; color: var(--success);">处理完成</div>
                    <div style="font-size: 0.9rem;">${message}</div>
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
        
        // 清除之前的样式
        this.clearResponseContainer();
        
        // 应用错误样式
        el.responseContent.classList.add('error');
        
        el.responseContainer.classList.remove('d-none');
        el.responseContent.innerHTML = `
            <div style="display: flex; align-items: center; height: 100%;">
                <i class="fas fa-exclamation-triangle" style="font-size: 20px; margin-right: 10px; color: var(--danger);"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px; color: var(--danger);">操作失败</div>
                    <div style="font-size: 0.9rem; margin-bottom: 8px;">${message}</div>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.ExcelSalesModule.retry()" style="padding: 4px 12px; font-size: 0.85rem;">
                        <i class="fas fa-redo" style="margin-right: 4px;"></i> 重试
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
            // 清除响应容器样式
            this.clearResponseContainer();
            
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
            this.clearResponseContainer();
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「开始分组汇总」后，执行结果将展示在此处</p>
            `;
        }
        
        this.showInfo('模块已重置');
    },
    
    /**
     * 显示信息消息
     */
    showInfo: function(message) {
        console.info('信息:', message);
        
        const el = this.elements;
        if (el.responseContainer && el.responseContent) {
            this.clearResponseContainer();
            el.responseContainer.classList.remove('d-none');
            el.responseContent.innerHTML = `
                <div style="display: flex; align-items: center; height: 100%;">
                    <i class="fas fa-info-circle" style="font-size: 20px; margin-right: 10px; color: var(--info);"></i>
                    <div style="font-size: 0.9rem;">${message}</div>
                </div>
            `;
            
            // 3秒后重置
            setTimeout(() => {
                if (el.responseContent) {
                    this.clearResponseContainer();
                    el.responseContent.innerHTML = `
                        <p class="response-placeholder">点击「开始分组汇总」后，执行结果将展示在此处</p>
                    `;
                }
            }, 3000);
        }
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
