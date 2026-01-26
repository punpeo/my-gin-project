/**
 * 店铺订单统计模块
 * 功能：支持文件路径和上传文件两种方式统计店铺订单
 * 初始化函数：initshop_order
 */

const ShopOrderModule = {
    // 模块配置
    config: {
        api: {
            statisticByPath: '/api/v1/shop-order/statistic-by-path',
            statisticByUpload: '/api/v1/shop-order/statistic-by-upload'
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
        console.log('初始化店铺订单统计模块');
        
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
            ModulesManager.registerModule('shop-order', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            basePathInput: container.querySelector('#shop-order-base-path'),
            fileUploadArea: container.querySelector('#shop-order-file-upload-area'),
            uploadIcon: container.querySelector('#shop-order-upload-icon'),
            uploadText: container.querySelector('#shop-order-upload-text'),
            uploadFormatHint: container.querySelector('#shop-order-upload-format-hint'),
            
            // 数据卡片
            dataCards: container.querySelectorAll('.data-card'),
            shopCountValue: container.querySelector('#shop-order-shop-count'),
            totalOrderValue: container.querySelector('#shop-order-total-order'),
            totalAmountValue: container.querySelector('#shop-order-total-amount'),
            
            // 按钮
            statisticByPathBtn: container.querySelector('#shop-order-statistic-by-path-btn'),
            statisticByUploadBtn: container.querySelector('#shop-order-statistic-by-upload-btn'),
            
            // 按钮组容器
            btnGroup: container.querySelector('.btn-group-2')
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
        
        // 路径统计按钮点击
        if (el.statisticByPathBtn) {
            el.statisticByPathBtn.addEventListener('click', (e) => this.handleStatisticByPath(e));
        }
        
        // 上传统计按钮点击
        if (el.statisticByUploadBtn) {
            el.statisticByUploadBtn.addEventListener('click', (e) => this.handleStatisticByUpload(e));
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
        
        // 输入框验证
        if (el.basePathInput) {
            el.basePathInput.addEventListener('input', () => this.validateBasePathInput());
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
     * 处理路径统计请求
     */
    handleStatisticByPath: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证文件根目录
        if (!this.validateBasePathInput()) {
            this.showError('请输入有效的文件根目录');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 显示处理中消息
            this.showProcessing('正在统计路径下的店铺订单数据...');
            
            // 调用路径统计API
            const response = await this.callStatisticByPathAPI();
            
            // 处理响应
            await this.handleStatisticResponse(response, '路径统计');
            
        } catch (error) {
            console.error('路径统计失败:', error);
            this.showError(`路径统计失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 处理上传统计请求
     */
    handleStatisticByUpload: async function(e) {
        e.preventDefault();
        
        if (this.data.processing) return;
        
        // 验证上传文件
        if (!this.validateUploadedFile()) {
            this.showError('请先选择要上传的文件');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // 显示处理中消息
            this.showProcessing('正在统计上传文件的店铺订单数据...');
            
            // 调用上传统计API
            const response = await this.callStatisticByUploadAPI();
            
            // 处理响应
            await this.handleStatisticResponse(response, '上传统计');
            
        } catch (error) {
            console.error('上传统计失败:', error);
            this.showError(`上传统计失败: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    },
    
    /**
     * 通过文件路径调用统计API
     */
    callStatisticByPathAPI: async function() {
        this.showButtonLoading(this.elements.statisticByPathBtn, '正在统计...');
        
        try {
            const el = this.elements;
            const basePath = el.basePathInput?.value.trim() || '';
            
            const response = await fetch(this.config.api.statisticByPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base_path: basePath })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            throw new Error(`API调用失败: ${error.message}`);
        } finally {
            this.hideButtonLoading(this.elements.statisticByPathBtn, '<i class="fas fa-chart-line"></i> 执行路径下统计');
        }
    },
    
    /**
     * 通过上传文件调用统计API
     */
    callStatisticByUploadAPI: async function() {
        this.showButtonLoading(this.elements.statisticByUploadBtn, '正在统计...');
        
        try {
            const formData = new FormData();
            formData.append('file', this.data.uploadedFile);
            
            const response = await fetch(this.config.api.statisticByUpload, {
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
            this.hideButtonLoading(this.elements.statisticByUploadBtn, '<i class="fas fa-chart-line"></i> 执行上传文件统计');
        }
    },
    
    /**
     * 处理统计响应
     */
    handleStatisticResponse: async function(response, method) {
        const contentType = response.headers.get('content-type');
        
        // 检查是否为错误响应
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.msg || `错误码: ${errorData.code}`);
        }
        
        // 检查是否为Excel文件
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            // 从响应头获取统计数据
            this.updateStatsFromHeaders(response.headers);
            
            // 处理Excel文件下载
            const filename = await this.handleExcelFileDownload(response);
            
            // 显示成功消息
            this.showSuccess(`${method}完成，结果文件已开始下载: ${filename}`);
        } else {
            throw new Error('未知的响应类型');
        }
    },
    
    /**
     * 从响应头更新统计数据
     */
    updateStatsFromHeaders: function(headers) {
        const el = this.elements;
        
        // 获取店铺数量
        const shopCount = headers.get('X-Shop-Count');
        if (shopCount && el.shopCountValue) {
            el.shopCountValue.textContent = shopCount;
        }
        
        // 获取总订单数
        const totalOrder = headers.get('X-Total-All-Num');
        if (totalOrder && el.totalOrderValue) {
            el.totalOrderValue.textContent = parseInt(totalOrder).toLocaleString();
        }
        
        // 获取总金额
        const totalAmount = headers.get('X-Total-All-Amt');
        if (totalAmount && el.totalAmountValue) {
            el.totalAmountValue.textContent = '¥' + parseFloat(totalAmount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
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
     * 处理Excel文件下载
     */
    handleExcelFileDownload: async function(response) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        let filename = '店铺订单统计结果.xlsx';
        
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
     * 验证文件根目录输入
     */
    validateBasePathInput: function() {
        const el = this.elements;
        if (!el.basePathInput || !el.basePathInput.value.trim()) {
            this.markInvalid(el.basePathInput, '请输入文件根目录');
            return false;
        }
        
        this.markValid(el.basePathInput);
        return true;
    },
    
    /**
     * 验证上传文件
     */
    validateUploadedFile: function() {
        if (!this.data.uploadedFile) {
            this.showError('请先选择要上传的文件');
            return false;
        }
        
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
            el.uploadText.textContent = '点击或拖拽文件上传(可选)';
            el.uploadFormatHint.textContent = '支持 .xlsx, .xls 格式';
        }
        
        this.updateUIState();
        this.showInfo('已清除上传的文件');
    },
    
    /**
     * 显示处理中消息
     */
    showProcessing: function(message) {
        console.log('处理中:', message);
        
        // 在按钮组上方显示临时消息
        this.showTemporaryMessage(message, 'processing');
    },
    
    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        console.log('成功:', message);
        
        // 在按钮组上方显示临时消息
        this.showTemporaryMessage(message, 'success');
    },
    
    /**
     * 显示错误消息
     */
    showError: function(message) {
        console.error('错误:', message);
        
        // 在按钮组上方显示临时消息
        this.showTemporaryMessage(message, 'error');
    },
    
    /**
     * 显示信息消息
     */
    showInfo: function(message) {
        console.info('信息:', message);
        
        // 在按钮组上方显示临时消息
        this.showTemporaryMessage(message, 'info');
    },
    
    /**
     * 显示临时消息提示
     */
    showTemporaryMessage: function(message, type) {
        const el = this.elements;
        if (!el.container || !el.btnGroup) return;
        
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
        let iconColor = '#3b82f6'; // 蓝色
        
        if (type === 'success') {
            iconClass = 'check-circle';
            iconColor = '#10b981'; // 绿色
        } else if (type === 'error') {
            iconClass = 'exclamation-triangle';
            iconColor = '#ef4444'; // 红色
        } else if (type === 'processing') {
            iconClass = 'spinner fa-spin';
            iconColor = '#3b82f6'; // 蓝色
        }
        
        messageDiv.innerHTML = `
            <i class="fas fa-${iconClass}" style="color: ${iconColor}; margin-right: 8px;"></i>
            <span>${message}</span>
        `;
        
        // 在按钮组前插入消息
        el.btnGroup.before(messageDiv);
        
        // 如果不是处理中状态，3秒后自动移除
        if (type !== 'processing') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
        
        return messageDiv; // 返回消息元素引用，便于处理中状态移除
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
        
        // 如果处理结束，移除处理中的临时消息
        if (!isProcessing) {
            const el = this.elements;
            if (el.container) {
                const processingMessage = el.container.querySelector('.temporary-message-processing');
                if (processingMessage) {
                    processingMessage.remove();
                }
            }
        }
    },
    
    /**
     * 更新UI状态
     */
    updateUIState: function() {
        const el = this.elements;
        const hasBasePath = el.basePathInput && el.basePathInput.value.trim();
        const hasFile = !!this.data.uploadedFile;
        
        // 更新按钮状态
        if (el.statisticByPathBtn) {
            el.statisticByPathBtn.disabled = !hasBasePath || this.data.processing;
        }
        
        if (el.statisticByUploadBtn) {
            el.statisticByUploadBtn.disabled = !hasFile || this.data.processing;
        }
    },
    
    /**
     * 重置模块
     */
    reset: function() {
        const el = this.elements;
        
        // 清除输入框
        if (el.basePathInput) el.basePathInput.value = 'E:\\tongjidingdan';
        
        // 清除上传的文件
        this.clearUploadedFile();
        
        // 重置数据卡片为初始值
        if (el.shopCountValue) el.shopCountValue.textContent = '48';
        if (el.totalOrderValue) el.totalOrderValue.textContent = '1,204';
        if (el.totalAmountValue) el.totalAmountValue.textContent = '¥58,430';
        
        this.showInfo('模块已重置');
    },
    
    /**
     * 销毁模块
     */
    destroy: function() {
        // 清理事件监听器
        const el = this.elements;
        if (el.statisticByPathBtn) {
            el.statisticByPathBtn.removeEventListener('click', this.handleStatisticByPath);
        }
        if (el.statisticByUploadBtn) {
            el.statisticByUploadBtn.removeEventListener('click', this.handleStatisticByUpload);
        }
        if (el.fileUploadArea) {
            el.fileUploadArea.removeEventListener('click', this.handleFileSelect);
        }
        
        // 清理文件输入框
        if (this.data.fileInput && document.body) {
            document.body.removeChild(this.data.fileInput);
        }
        
        console.log('店铺订单统计模块已销毁');
    }
};

// 全局初始化函数
function initshop_order(container) {
    ShopOrderModule.init(container);
}

// 确保模块在全局可用
window.ShopOrderModule = ShopOrderModule;
