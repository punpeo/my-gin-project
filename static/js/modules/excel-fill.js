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
            
            // 数据卡片
            totalRows: container.querySelector('#excel-fill-total-rows'),
            filledRows: container.querySelector('#excel-fill-filled-rows'),
            emptyRows: container.querySelector('#excel-fill-empty-rows'),
            
            // 响应容器（修复ID匹配）
            responseContainer: container.querySelector('#excel-fill-response-container'),
            responseContent: container.querySelector('#excel-fill-response-content')
        };
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents: function() {
        const el = this.elements;
        
        // 处理按钮点击（修复this指向）
        if (el.processBtn) {
            el.processBtn.addEventListener('click', (e) => this.handleProcess(e));
        }
        
        // 输入框实时验证
        [el.rootDirInput, el.sourceMatchColInput, el.sourceFillColInput, 
         el.targetMatchColInput, el.targetValueColInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    if (input.id.includes('col')) {
                        this.validateColumnInput(input);
                    } else {
                        this.validateInputs();
                    }
                });
            }
        });
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
        
        [el.sourceMatchColInput, el.sourceFillColInput, el.targetMatchColInput, el.targetValueColInput].forEach(input => {
            if (input && !input.value) {
                input.value = input.id.includes('match') ? 'A' : (input.id.includes('fill') ? 'B' : 'C');
            }
        });
    },
    
    /**
     * 处理Excel数据匹配填充（核心调整：适配后端200+业务码响应）
     */
    handleProcess: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证输入
        if (!this.validateInputs()) {
            this.showError('请填写所有必填项并确保格式正确');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取请求参数
            const requestData = this.getRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在匹配填充Excel数据...');
            
            // 调用API（适配新的响应格式）
            const responseData = await this.callFillAPI(requestData);
            
            // 处理响应（解析业务数据+更新UI）
            this.handleResponse(responseData);
            
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
            source_match_col: el.sourceMatchColInput?.value.trim().toUpperCase() || 'A',
            source_fill_col: el.sourceFillColInput?.value.trim().toUpperCase() || 'B',
            target_match_col: el.targetMatchColInput?.value.trim().toUpperCase() || 'A',
            target_value_col: el.targetValueColInput?.value.trim().toUpperCase() || 'C'
        };
    },
    
    /**
     * 调用填充API（核心调整：适配后端统一返回200 + 业务码）
     */
    callFillAPI: async function(requestData) {
        const el = this.elements;
        this.showButtonLoading(el.processBtn, '正在处理...');
        
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
            
            // 无论HTTP状态码如何，都解析JSON（后端已统一返回200）
            const responseData = await response.json();
            
            // 判断业务码
            if (responseData.code !== 0) {
                throw new Error(responseData.msg || `业务错误码: ${responseData.code}`);
            }
            
            return responseData.data; // 返回真正的业务数据
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(el.processBtn);
        }
    },
    
    /**
     * 处理API响应（核心调整：解析Base64并下载文件）
     */
    handleResponse: function(responseData) {
        const el = this.elements;
        
        // 更新数据卡片
        if (el.totalRows) el.totalRows.textContent = responseData.TotalRows || 0;
        if (el.filledRows) el.filledRows.textContent = responseData.FilledRows || 0;
        if (el.emptyRows) el.emptyRows.textContent = responseData.EmptyRows || 0;
        
        // 处理Base64文件下载（后端返回Base64编码，而非直接返回文件）
        if (responseData.Base64Data) {
            this.downloadExcelFromBase64(responseData.Base64Data, responseData.OutputFile || '待输入表_已填充.xlsx');
        }
        
        // 显示成功消息
        this.showSuccess(responseData.Message || '处理完成！');
    },
    
    /**
     * 从Base64数据下载Excel文件
     */
    downloadExcelFromBase64: function(base64Data, filename) {
        try {
            // 解码Base64数据
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // 清理资源
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            console.log(`文件已下载: ${filename}`);
        } catch (error) {
            throw new Error(`文件下载失败: ${error.message}`);
        }
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
        
        // 验证列输入
        [el.sourceMatchColInput, el.sourceFillColInput, el.targetMatchColInput, el.targetValueColInput].forEach(input => {
            if (input) {
                if (!input.value.trim()) {
                    this.markInvalid(input, `请输入${this.getInputLabel(input)}`);
                    isValid = false;
                } else if (!this.validateColumnLetter(input)) {
                    isValid = false;
                } else {
                    this.markValid(input);
                }
            }
        });
        
        return isValid;
    },
    
    /**
     * 获取输入框标签文本（辅助验证提示）
     */
    getInputLabel: function(input) {
        if (!input) return '列名';
        const id = input.id;
        if (id.includes('source-match')) return '待输入表匹配列';
        if (id.includes('source-fill')) return '待输入表填充列';
        if (id.includes('target-match')) return '目标表匹配列';
        if (id.includes('target-value')) return '目标表取值列';
        return '列名';
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
        
        // 自动转为大写
        inputElement.value = inputElement.value.trim().toUpperCase();
        
        return this.validateColumnLetter(inputElement);
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
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="ExcelFillModule.handleProcess(event)">
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
            <i class="fas fa-spinner fa-spin"></i> ${loadingText || '正在处理...'}
        `;
        button.disabled = true;
    },
    
    /**
     * 隐藏按钮加载状态
     */
    hideButtonLoading: function(button) {
        if (!button) return;
        
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
        button.disabled = false;
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
        [el.sourceMatchColInput, el.sourceFillColInput, el.targetMatchColInput, el.targetValueColInput].forEach(input => {
            if (input) {
                input.value = input.id.includes('match') ? 'A' : (input.id.includes('fill') ? 'B' : 'C');
            }
        });
        
        // 重置数据卡片
        [el.totalRows, el.filledRows, el.emptyRows].forEach(card => {
            if (card) card.textContent = '0';
        });
        
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
        
        // 3秒后恢复占位
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