/**
 * 订单汇总模块
 * 功能：下载模板文件、上传并处理订单数据
 * 初始化函数：initorder_summary
 */

const OrderSummaryModule = {
    // 模块配置
    config: {
        api: {
            downloadTemplate: '/api/v1/order/download-template',
            uploadProcess: '/api/v1/order/upload-process'
        },
        allowedFormats: ['.xlsx', '.xls'],
        maxFileSize: 20 * 1024 * 1024 // 20MB
    },
    
    // DOM元素引用
    elements: {},
    
    // 模块数据
    data: {
        uploadedFile: null,
        processing: false,
        fileInput: null
    },
    
    /**
     * 初始化模块
     * @param {HTMLElement} container - 模块容器
     */
    init: function(container) {
        console.log('初始化订单汇总模块');
        
        // 缓存DOM元素
        this.cacheElements(container);
        
        // 创建文件输入框
        this.createFileInput();
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化组件
        this.initComponents();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('order-summary', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            personSelect: container.querySelector('#order-person-select'),
            fileUploadArea: container.querySelector('#order-file-upload-area'),
            uploadIcon: container.querySelector('#order-upload-icon'),
            uploadText: container.querySelector('#order-upload-text'),
            uploadFormatHint: container.querySelector('#order-upload-format-hint'),
            
            // 数据卡片
            dataCards: container.querySelectorAll('.data-card'),
            shopCountValue: container.querySelector('#order-shop-count'),
            totalOrderValue: container.querySelector('#order-total-order'),
            totalAmountValue: container.querySelector('#order-total-amount'),
            duplicateOrderValue: container.querySelector('#order-duplicate-order'),
            
            // 按钮
            downloadTemplateBtn: container.querySelector('#order-download-template-btn'),
            uploadProcessBtn: container.querySelector('#order-upload-process-btn')
        };
    },
    
    /**
     * 创建文件输入框
     */
    createFileInput: function() {
        this.data.fileInput = document.createElement('input');
        this.data.fileInput.type = 'file';
        this.data.fileInput.accept = '.xlsx,.xls';
        this.data.fileInput.style.display = 'none';
        
        this.data.fileInput.addEventListener('change', (e) => {
            this.handleFileChange(e);
        });
        
        if (document.body) {
            document.body.appendChild(this.data.fileInput);
        }
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents: function() {
        const el = this.elements;
        
        // 下载模板按钮点击
        if (el.downloadTemplateBtn) {
            el.downloadTemplateBtn.addEventListener('click', (e) => this.handleDownloadTemplate(e));
        }
        
        // 上传处理按钮点击
        if (el.uploadProcessBtn) {
            el.uploadProcessBtn.addEventListener('click', (e) => this.handleUploadProcess(e));
        }
        
        // 文件上传区域点击
        if (el.fileUploadArea) {
            el.fileUploadArea.addEventListener('click', () => this.handleFileSelect());
        }
        
        // 文件上传区域拖放
        if (el.fileUploadArea) {
            el.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            el.fileUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            el.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
    },
    
    /**
     * 初始化组件
     */
    initComponents: function() {
        // 更新UI状态
        this.updateUIState();
    },
    
    /**
     * 处理文件选择
     */
    handleFileSelect: function() {
        if (this.data.fileInput) {
            this.data.fileInput.click();
        }
    },
    
    /**
     * 处理文件变更
     */
    handleFileChange: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 验证文件
        if (!this.validateFile(file)) {
            this.showError('文件格式不支持或文件过大');
            return;
        }
        
        this.data.uploadedFile = file;
        this.updateFileUploadArea(file);
        this.updateUIState();
    },
    
    /**
     * 验证文件
     */
    validateFile: function(file) {
        // 检查文件大小
        if (file.size > this.config.maxFileSize) {
            this.showError(`文件大小不能超过 ${this.config.maxFileSize / 1024 / 1024}MB`);
            return false;
        }
        
        // 检查文件格式
        const fileName = file.name.toLowerCase();
        const isValidFormat = this.config.allowedFormats.some(format => 
            fileName.endsWith(format)
        );
        
        if (!isValidFormat) {
            this.showError('只支持 .xlsx 和 .xls 格式的文件');
            return false;
        }
        
        return true;
    },
    
    /**
     * 更新文件上传区域显示
     */
    updateFileUploadArea: function(file) {
        const el = this.elements;
        if (!el.fileUploadArea || !el.uploadIcon || !el.uploadText || !el.uploadFormatHint) return;
        
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        el.fileUploadArea.classList.add('has-file');
        el.uploadIcon.className = 'fas fa-file-excel';
        el.uploadIcon.style.color = '#10b981';
        el.uploadText.textContent = file.name;
        el.uploadFormatHint.textContent = `${fileSize} MB`;
    },
    
    /**
     * 处理拖放
     */
    handleDragOver: function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const el = this.elements;
        if (el.fileUploadArea) {
            el.fileUploadArea.style.borderColor = '#10b981';
            el.fileUploadArea.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        }
    },
    
    /**
     * 处理拖放离开
     */
    handleDragLeave: function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const el = this.elements;
        if (el.fileUploadArea) {
            el.fileUploadArea.style.borderColor = '';
            el.fileUploadArea.style.backgroundColor = '';
        }
    },
    
    /**
     * 处理文件拖放
     */
    handleDrop: function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const el = this.elements;
        if (el.fileUploadArea) {
            el.fileUploadArea.style.borderColor = '';
            el.fileUploadArea.style.backgroundColor = '';
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            
            // 验证文件
            if (!this.validateFile(file)) {
                return;
            }
            
            this.data.uploadedFile = file;
            this.updateFileUploadArea(file);
            this.updateUIState();
        }
    },
    
    /**
     * 处理下载模板
     */
    handleDownloadTemplate: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        this.setProcessing(true);
        
        try {
            // 调用API
            const response = await this.downloadTemplateFile();
            
            // 处理响应
            await this.handleTemplateDownloadResponse(response);
            
        } catch (error) {
            console.error('下载模板失败:', error);
            this.showError(`下载模板失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 下载模板文件
     */
    downloadTemplateFile: async function() {
        this.showButtonLoading(this.elements.downloadTemplateBtn, '正在下载...');
        
        try {
            const response = await fetch(this.config.api.downloadTemplate, {
                method: 'GET'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.downloadTemplateBtn, '<i class="fas fa-cogs"></i> 下载模板文件');
        }
    },
    
    /**
     * 处理模板下载响应
     */
    handleTemplateDownloadResponse: async function(response) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'budan.xlsx';
        
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
        
        this.showSuccess(`模板文件下载成功: ${filename}`);
    },
    
    /**
     * 处理上传并处理数据
     */
    handleUploadProcess: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证文件
        if (!this.data.uploadedFile) {
            this.showError('请先选择要上传的文件');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 获取负责人
            const person = this.getSelectedPerson();
            
            // 创建表单数据
            const formData = this.createUploadFormData(person);
            
            // 调用API
            const response = await this.uploadAndProcessFile(formData);
            
            // 处理响应
            await this.handleUploadProcessResponse(response);
            
        } catch (error) {
            console.error('上传处理失败:', error);
            this.showError(`上传处理失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 获取选择的负责人
     */
    getSelectedPerson: function() {
        const el = this.elements;
        if (!el.personSelect) return '';
        
        return el.personSelect.value || '';
    },
    
    /**
     * 创建上传表单数据
     */
    createUploadFormData: function(person) {
        const formData = new FormData();
        formData.append('excel_file', this.data.uploadedFile);
        
        // 只有当选择了负责人才传递username参数
        if (person) {
            formData.append('username', person);
        }
        
        return formData;
    },
    
    /**
     * 上传并处理文件
     */
    uploadAndProcessFile: async function(formData) {
        this.showButtonLoading(this.elements.uploadProcessBtn, '正在处理...');
        
        try {
            const response = await fetch(this.config.api.uploadProcess, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.uploadProcessBtn, '<i class="fas fa-rocket"></i> 上传并处理数据');
        }
    },
    
    /**
     * 处理上传处理响应
     */
    handleUploadProcessResponse: async function(response) {
        const contentType = response.headers.get('content-type');
        
        // 检查是否为错误响应
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.msg || `错误码: ${errorData.code}`);
        }
        
        // 检查是否为Excel文件
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            await this.handleResultFileDownload(response);
        } else {
            throw new Error('未知的响应类型');
        }
    },
    
    /**
     * 处理结果文件下载
     */
    handleResultFileDownload: async function(response) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        let filename = '订单汇总结果.xlsx';
        
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
        
        // 从响应头获取统计信息
        this.updateStatsFromHeaders(response.headers);
        
        // 显示成功消息
        this.showSuccess(`文件处理完成，结果已下载: ${filename}`);
    },
    
    /**
     * 从响应头更新统计信息
     */
    updateStatsFromHeaders: function(headers) {
        const el = this.elements;
        
        // 获取店铺数量
        const shopCount = headers.get('X-Shop-Count');
        if (shopCount && el.shopCountValue) {
            el.shopCountValue.textContent = parseInt(shopCount).toLocaleString();
        }
        
        // 获取去重后总订单数
        const totalUniqueOrder = headers.get('X-Total-Unique-Order');
        if (totalUniqueOrder && el.totalOrderValue) {
            el.totalOrderValue.textContent = parseInt(totalUniqueOrder).toLocaleString();
        }
        
        // 获取去重后总金额
        const totalUniqueAmount = headers.get('X-Total-Unique-Amount');
        if (totalUniqueAmount && el.totalAmountValue) {
            const amount = parseFloat(totalUniqueAmount);
            el.totalAmountValue.textContent = '¥' + amount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        // 获取重复订单数
        const duplicateCount = headers.get('X-Duplicate-Count');
        if (duplicateCount && el.duplicateOrderValue) {
            el.duplicateOrderValue.textContent = parseInt(duplicateCount);
        }
        
        // 添加动画效果
        if (el.dataCards) {
            el.dataCards.forEach(card => {
                card.classList.add('updated');
                setTimeout(() => {
                    card.classList.remove('updated');
                }, 1000);
            });
        }
    },
    
    /**
     * 清除已上传的文件
     */
    clearUploadedFile: function() {
        this.data.uploadedFile = null;
        
        if (this.data.fileInput) {
            this.data.fileInput.value = '';
        }
        
        const el = this.elements;
        if (el.fileUploadArea && el.uploadIcon && el.uploadText && el.uploadFormatHint) {
            el.fileUploadArea.classList.remove('has-file');
            el.uploadIcon.className = 'fas fa-cloud-upload-alt';
            el.uploadIcon.style.color = '';
            el.uploadText.textContent = '点击或拖拽文件上传';
            el.uploadFormatHint.textContent = '支持 .xlsx, .xls 格式';
        }
        
        this.updateUIState();
        this.showInfo('已清除上传的文件');
    },
    
    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        console.log('成功:', message);
        
        // 在按钮组上方显示临时成功提示
        this.showTemporaryMessage(message, 'success');
    },
    
    /**
     * 显示错误消息
     */
    showError: function(message) {
        console.error('错误:', message);
        
        // 在按钮组上方显示临时错误提示
        this.showTemporaryMessage(message, 'error');
    },
    
    /**
     * 显示信息消息
     */
    showInfo: function(message) {
        console.info('信息:', message);
        
        // 在按钮组上方显示临时信息提示
        this.showTemporaryMessage(message, 'info');
    },
    
    /**
     * 显示临时消息提示
     */
    showTemporaryMessage: function(message, type) {
        const el = this.elements;
        if (!el.container) return;
        
        // 移除已存在的临时消息
        const existingMessage = el.container.querySelector('.temporary-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message temporary-message-${type}`;
        
        // 根据类型设置图标和样式
        let iconClass = 'info-circle';
        if (type === 'success') iconClass = 'check-circle';
        if (type === 'error') iconClass = 'exclamation-triangle';
        
        messageDiv.innerHTML = `
            <i class="fas fa-${iconClass}"></i>
            <span>${message}</span>
        `;
        
        // 在按钮组前插入消息
        if (el.container.querySelector('.btn-group-2')) {
            el.container.querySelector('.btn-group-2').before(messageDiv);
        } else {
            el.container.appendChild(messageDiv);
        }
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
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
        const hasFile = !!this.data.uploadedFile;
        
        // 更新按钮状态
        if (el.uploadProcessBtn) {
            el.uploadProcessBtn.disabled = !hasFile || this.data.processing;
        }
        
        if (el.downloadTemplateBtn) {
            el.downloadTemplateBtn.disabled = this.data.processing;
        }
    },
    
    /**
     * 重置模块
     */
    reset: function() {
        // 清除上传的文件
        this.clearUploadedFile();
        
        // 重置负责人选择
        const el = this.elements;
        if (el.personSelect) {
            el.personSelect.value = '';
        }
        
        // 重置数据卡片为初始值
        if (el.shopCountValue) el.shopCountValue.textContent = '48';
        if (el.totalOrderValue) el.totalOrderValue.textContent = '1,204';
        if (el.totalAmountValue) el.totalAmountValue.textContent = '¥58,430';
        if (el.duplicateOrderValue) el.duplicateOrderValue.textContent = '0';
        
        this.showInfo('模块已重置');
    },
    
    /**
     * 销毁模块
     */
    destroy: function() {
        // 清理事件监听器
        const el = this.elements;
        if (el.downloadTemplateBtn) {
            el.downloadTemplateBtn.removeEventListener('click', this.handleDownloadTemplate);
        }
        if (el.uploadProcessBtn) {
            el.uploadProcessBtn.removeEventListener('click', this.handleUploadProcess);
        }
        if (el.fileUploadArea) {
            el.fileUploadArea.removeEventListener('click', this.handleFileSelect);
        }
        
        // 清理文件输入框
        if (this.data.fileInput && document.body) {
            document.body.removeChild(this.data.fileInput);
        }
        
        console.log('订单汇总模块已销毁');
    }
};

// 全局初始化函数
function initorder_summary(container) {
    OrderSummaryModule.init(container);
}

// 确保模块在全局可用
window.OrderSummaryModule = OrderSummaryModule;
