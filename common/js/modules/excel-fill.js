/**
 * Excel数据匹配填充模块
 * 功能：根据后端API处理Excel数据的匹配填充
 * 初始化函数：initexcel_fill
 */

const ExcelFillModule = {
    // 模块配置
    config: {
        api: {
            fill: '/api/v1/excel/fill'
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
        console.log('初始化Excel数据匹配填充模块');
        
        // 缓存DOM元素
        this.cacheElements(container);
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化组件
        this.initComponents();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('excel-fill', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            rootDirInput: container.querySelector('#excel-fill-root-dir'),
            sourceMatchColInput: container.querySelector('#excel-fill-source-match-col'),
            sourceFillColInput: container.querySelector('#excel-fill-source-fill-col'),
            targetMatchColInput: container.querySelector('#excel-fill-target-match-col'),
            targetValueColInput: container.querySelector('#excel-fill-target-value-col'),
            processBtn: container.querySelector('#excel-fill-process-btn'),
            
            // 响应容器
            responseContainer: container.querySelector('#excel-fill-response-container'),
            responseContent: container.querySelector('#excel-fill-response-content'),
            responsePlaceholder: container.querySelector('#excel-fill-response-placeholder')
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
        
        // 输入框实时验证
        if (el.rootDirInput) {
            el.rootDirInput.addEventListener('input', () => this.validateInputs());
        }
        
        if (el.sourceMatchColInput) {
            el.sourceMatchColInput.addEventListener('input', () => this.validateColumnInput(el.sourceMatchColInput));
        }
        
        if (el.sourceFillColInput) {
            el.sourceFillColInput.addEventListener('input', () => this.validateColumnInput(el.sourceFillColInput));
        }
        
        if (el.targetMatchColInput) {
            el.targetMatchColInput.addEventListener('input', () => this.validateColumnInput(el.targetMatchColInput));
        }
        
        if (el.targetValueColInput) {
            el.targetValueColInput.addEventListener('input', () => this.validateColumnInput(el.targetValueColInput));
        }
    },
    
    /**
     * 初始化组件
     */
    initComponents: function() {
        // 初始化默认值
        this.setDefaultValues();
        
        // 验证输入
        this.validateInputs();
        
        // 更新UI状态
        this.updateUIState();
    },
    
    /**
     * 设置默认值
     */
    setDefaultValues: function() {
        const el = this.elements;
        
        // 设置默认值
        if (el.rootDirInput && !el.rootDirInput.value) {
            el.rootDirInput.value = 'E:\\Xyq-Works\\Excel_Fill';
        }
        
        if (el.sourceMatchColInput && !el.sourceMatchColInput.value) {
            el.sourceMatchColInput.value = 'A';
        }
        
        if (el.sourceFillColInput && !el.sourceFillColInput.value) {
            el.sourceFillColInput.value = 'B';
        }
        
        if (el.targetMatchColInput && !el.targetMatchColInput.value) {
            el.targetMatchColInput.value = 'A';
        }
        
        if (el.targetValueColInput && !el.targetValueColInput.value) {
            el.targetValueColInput.value = 'C';
        }
    },
    
    /**
     * 处理Excel数据匹配填充
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
            this.showProcessing('正在匹配填充Excel数据...');
            
            // 调用API
            const response = await this.callFillAPI(requestData);
            
            // 处理响应
            await this.handleResponse(response);
            
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
        
        return {
            root_dir: el.rootDirInput?.value.trim() || '',
            source_match_col: el.sourceMatchColInput?.value.trim() || 'A',
            source_fill_col: el.sourceFillColInput?.value.trim() || 'B',
            target_match_col: el.targetMatchColInput?.value.trim() || 'A',
            target_value_col: el.targetValueColInput?.value.trim() || 'C'
        };
    },
    
    /**
     * 调用填充API
     */
    callFillAPI: async function(requestData) {
        this.showButtonLoading(this.elements.processBtn, '正在处理...');
        
        try {
            // 使用FormData格式发送，与后端Handler的c.PostForm()匹配
            const formData = new FormData();
            formData.append('root_dir', requestData.root_dir);
            formData.append('source_match_col', requestData.source_match_col);
            formData.append('source_fill_col', requestData.source_fill_col);
            formData.append('target_match_col', requestData.target_match_col);
            formData.append('target_value_col', requestData.target_value_col);
            
            const response = await fetch(this.config.api.fill, {
                method: 'POST',
                body: formData
                // 不设置Content-Type，浏览器会自动设置multipart/form-data
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.processBtn, '<i class="fas fa-play-circle"></i> 开始匹配填充');
        }
    },
    
    /**
     * 处理API响应
     */
    handleResponse: async function(response) {
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
            this.showSuccess(`处理完成，结果已下载: ${filename}`);
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
        let filename = '结果表.xlsx';
        
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
        
        // 验证根目录
        if (el.rootDirInput && !el.rootDirInput.value.trim()) {
            this.markInvalid(el.rootDirInput, '请输入文件根目录');
            isValid = false;
        } else {
            this.markValid(el.rootDirInput);
        }
        
        // 验证待输入表匹配列
        if (el.sourceMatchColInput && !el.sourceMatchColInput.value.trim()) {
            this.markInvalid(el.sourceMatchColInput, '请输入待输入表匹配列');
            isValid = false;
        } else if (!this.validateColumnLetter(el.sourceMatchColInput)) {
            isValid = false;
        } else {
            this.markValid(el.sourceMatchColInput);
        }
        
        // 验证待输入表填充列
        if (el.sourceFillColInput && !el.sourceFillColInput.value.trim()) {
            this.markInvalid(el.sourceFillColInput, '请输入待输入表填充列');
            isValid = false;
        } else if (!this.validateColumnLetter(el.sourceFillColInput)) {
            isValid = false;
        } else {
            this.markValid(el.sourceFillColInput);
        }
        
        // 验证目标表匹配列
        if (el.targetMatchColInput && !el.targetMatchColInput.value.trim()) {
            this.markInvalid(el.targetMatchColInput, '请输入目标表匹配列');
            isValid = false;
        } else if (!this.validateColumnLetter(el.targetMatchColInput)) {
            isValid = false;
        } else {
            this.markValid(el.targetMatchColInput);
        }
        
        // 验证目标表取值列
        if (el.targetValueColInput && !el.targetValueColInput.value.trim()) {
            this.markInvalid(el.targetValueColInput, '请输入目标表取值列');
            isValid = false;
        } else if (!this.validateColumnLetter(el.targetValueColInput)) {
            isValid = false;
        } else {
            this.markValid(el.targetValueColInput);
        }
        
        return isValid;
    },
    
    /**
     * 验证列字母格式
     */
    validateColumnLetter: function(inputElement) {
        if (!inputElement) return true;
        
        const value = inputElement.value.trim().toUpperCase();
        if (!value) return false;
        
        // 验证格式：单字母或多字母（如"A"或"AA"）
        const isValid = /^[A-Z]+$/.test(value);
        
        if (!isValid) {
            this.markInvalid(inputElement, '格式错误，请输入字母（如A、B、C或AA、AB等）');
            return false;
        }
        
        this.markValid(inputElement);
        return true;
    },
    
    /**
     * 验证列输入
     */
    validateColumnInput: function(inputElement) {
        if (!inputElement) return true;
        
        const value = inputElement.value.trim();
        if (!value) return false;
        
        // 验证格式：单字母或多字母
        const isValid = /^[A-Z]+$/i.test(value);
        
        if (!isValid) {
            this.markInvalid(inputElement, '格式错误，请输入字母（如A、B、C或AA、AB等）');
            return false;
        }
        
        this.markValid(inputElement);
        return true;
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
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="ExcelFillModule.retry()">
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
                <p class="response-placeholder">点击「开始匹配填充」后，执行结果将展示在此处</p>
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
        if (el.rootDirInput) el.rootDirInput.value = 'E:\\Xyq-Works\\Excel_Fill';
        if (el.sourceMatchColInput) el.sourceMatchColInput.value = 'A';
        if (el.sourceFillColInput) el.sourceFillColInput.value = 'B';
        if (el.targetMatchColInput) el.targetMatchColInput.value = 'A';
        if (el.targetValueColInput) el.targetValueColInput.value = 'C';
        
        // 重置响应容器
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「开始匹配填充」后，执行结果将展示在此处</p>
            `;
        }
        
        this.showInfo('模块已重置');
    },
    
    /**
     * 显示信息消息
     */
    showInfo: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
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
        
        // 3秒后隐藏
        setTimeout(() => {
            if (el.responseContent) {
                el.responseContent.innerHTML = `
                    <p class="response-placeholder">点击「开始匹配填充」后，执行结果将展示在此处</p>
                `;
            }
        }, 3000);
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
        
        console.log('Excel数据匹配填充模块已销毁');
    }
};

// 全局初始化函数
function initexcel_fill(container) {
    ExcelFillModule.init(container);
}

// 确保模块在全局可用
window.ExcelFillModule = ExcelFillModule;
