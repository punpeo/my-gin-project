/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */

(function() {
    // 防止重复声明
    if (window.OrderSummaryModule && window.OrderSummaryModule.initialized) {
        console.warn('OrderSummaryModule已经初始化，跳过重复定义');
        return;
    }

    // 定义订单汇总模块
    const OrderSummaryModule = {
        config: {
            api: {
                downloadTemplate: '/api/v1/order/download-template',
                uploadProcess: '/api/v1/order/upload-process'
            },
            allowedFormats: ['.xlsx', '.xls'],
            maxFileSize: 20 * 1024 * 1024 // 20MB
        },
        
        elements: {},
        data: {
            uploadedFile: null,
            processing: false,
            fileInput: null,
            initialized: false
        },
        
        init(container) {
            if (this.data.initialized) {
                console.log('模块已初始化，跳过重复初始化');
                return;
            }
            
            console.log('开始初始化订单汇总模块');
            
            this.cacheElements(container);
            this.createFileInput();
            this.bindEvents();
            this.initComponents();
            this.initResponseContainer();
            
            this.data.initialized = true;
            console.log('订单汇总模块初始化完成');
            
            if (typeof window.ModulesManager !== 'undefined') {
                window.ModulesManager.registerModule('order-summary', this);
            }
        },
        
        cacheElements(container) {
            this.elements = {
                container: container,
                personSelect: container.querySelector('#order-person-select'),
                fileUploadArea: container.querySelector('#order-file-upload-area'),
                uploadIcon: container.querySelector('#order-upload-icon'),
                uploadText: container.querySelector('#order-upload-text'),
                uploadFormatHint: container.querySelector('#order-upload-format-hint'),
                shopCountValue: container.querySelector('#order-shop-count'),
                totalOrderValue: container.querySelector('#order-total-order'),
                totalAmountValue: container.querySelector('#order-total-amount'),
                duplicateOrderValue: container.querySelector('#order-duplicate-order'),
                downloadTemplateBtn: container.querySelector('#order-download-template-btn'),
                uploadProcessBtn: container.querySelector('#order-upload-process-btn'),
                responseContainer: document.querySelector('#stock-response-container'),
                responseContent: document.querySelector('#stock-response-content')
            };
            
            console.log('缓存元素结果:', {
                fileUploadArea: !!this.elements.fileUploadArea,
                responseContent: !!this.elements.responseContent,
                uploadProcessBtn: !!this.elements.uploadProcessBtn
            });
        },
        
        createFileInput() {
            // 创建隐藏的文件输入框
            this.data.fileInput = document.createElement('input');
            this.data.fileInput.type = 'file';
            this.data.fileInput.accept = '.xlsx,.xls';
            this.data.fileInput.style.display = 'none';
            
            // 修复：添加change事件监听
            this.data.fileInput.addEventListener('change', (e) => {
                this.handleFileChange(e);
            });
            
            if (document.body) {
                document.body.appendChild(this.data.fileInput);
            }
        },
        
        bindEvents() {
            console.log('绑定事件监听器');
            
            // 下载模板按钮
            if (this.elements.downloadTemplateBtn) {
                console.log('绑定下载模板按钮点击事件');
                this.elements.downloadTemplateBtn.addEventListener('click', (e) => {
                    console.log('下载模板按钮被点击');
                    this.handleDownloadTemplate(e);
                });
            } else {
                console.error('下载模板按钮元素未找到');
            }
            
            // 上传处理按钮
            if (this.elements.uploadProcessBtn) {
                console.log('绑定上传处理按钮点击事件');
                this.elements.uploadProcessBtn.addEventListener('click', (e) => {
                    console.log('上传处理按钮被点击');
                    this.handleUploadProcess(e);
                });
            } else {
                console.error('上传处理按钮元素未找到');
            }
            
            // 文件上传区域点击事件
            if (this.elements.fileUploadArea) {
                console.log('绑定文件上传区域点击事件');
                this.elements.fileUploadArea.addEventListener('click', (e) => {
                    console.log('文件上传区域被点击');
                    // 阻止事件冒泡，避免重复触发
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleFileSelect();
                });
            } else {
                console.error('文件上传区域元素未找到');
            }
            
            // 文件上传区域拖放事件
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDragOver(e);
                });
                
                this.elements.fileUploadArea.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDragLeave(e);
                });
                
                this.elements.fileUploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDrop(e);
                });
            }
        },
        
        initComponents() {
            this.updateUIState();
        },
        
        initResponseContainer() {
            if (this.elements.responseContent) {
                this.elements.responseContent.innerHTML = '';
                this.elements.responseContent.classList.remove('success', 'error', 'loading');
            }
        },
        
        handleFileSelect() {
            console.log('触发文件选择');
            if (this.data.fileInput) {
                this.data.fileInput.click();
            }
        },
        
        handleFileChange(event) {
            console.log('文件选择变更');
            const file = event.target.files[0];
            if (!file) {
                console.log('未选择文件');
                return;
            }
            
            console.log('选择文件:', file.name, file.size, file.type);
            
            // 验证文件
            if (!this.validateFile(file)) {
                return;
            }
            
            this.data.uploadedFile = file;
            this.updateFileUploadArea(file);
            this.updateUIState();
        },
        
        validateFile(file) {
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
        
        updateFileUploadArea(file) {
            if (!this.elements.fileUploadArea || !this.elements.uploadIcon || 
                !this.elements.uploadText || !this.elements.uploadFormatHint) {
                return;
            }
            
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            
            this.elements.fileUploadArea.classList.add('has-file');
            this.elements.uploadIcon.className = 'fas fa-file-excel';
            this.elements.uploadIcon.style.color = '#10b981';
            this.elements.uploadText.textContent = file.name;
            this.elements.uploadFormatHint.textContent = `${fileSize} MB`;
        },
        
        handleDragOver(e) {
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '#10b981';
                this.elements.fileUploadArea.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            }
        },
        
        handleDragLeave(e) {
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '';
                this.elements.fileUploadArea.style.backgroundColor = '';
            }
        },
        
        handleDrop(e) {
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '';
                this.elements.fileUploadArea.style.backgroundColor = '';
            }
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                
                if (!this.validateFile(file)) {
                    return;
                }
                
                this.data.uploadedFile = file;
                this.updateFileUploadArea(file);
                this.updateUIState();
            }
        },
        
        async handleDownloadTemplate(e) {
            e.preventDefault();
            console.log('开始处理下载模板请求');
            
            if (this.data.processing) {
                console.log('当前有处理中的请求，跳过');
                return;
            }
            
            this.setProcessing(true);
            
            try {
                this.showProcessing('正在下载模板文件...');
                const response = await this.downloadTemplateFile();
                await this.handleTemplateDownloadResponse(response);
            } catch (error) {
                console.error('下载模板失败:', error);
                this.showError(`下载模板失败: ${error.message}`);
            } finally {
                this.setProcessing(false);
            }
        },
        
        async downloadTemplateFile() {
            this.showButtonLoading(this.elements.downloadTemplateBtn, '正在下载...');
            
            try {
                console.log('发送下载模板请求到:', this.config.api.downloadTemplate);
                const response = await fetch(this.config.api.downloadTemplate, {
                    method: 'GET'
                });
                
                console.log('收到API响应:', response.status, response.statusText);
                
                if (!response.ok) {
                    let errorMsg = `请求失败 (${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (e) {
                        // 忽略JSON解析错误
                    }
                    throw new Error(errorMsg);
                }
                
                return response;
            } finally {
                this.hideButtonLoading(this.elements.downloadTemplateBtn);
            }
        },
        
        async handleTemplateDownloadResponse(response) {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const responseData = await response.json();
                console.log('收到JSON响应数据:', responseData);
                
                if (responseData.code !== 0) {
                    throw new Error(responseData.msg || '下载模板失败');
                }
                
                if (responseData.data && responseData.data.base64_content) {
                    await this.handleBase64FileDownload(
                        responseData.data.base64_content, 
                        '订单模板.xlsx'
                    );
                    this.showSuccess(responseData.msg || '模板下载成功');
                } else {
                    throw new Error('模板文件内容为空');
                }
            } else {
                throw new Error('未知的响应类型');
            }
        },
        
        async handleUploadProcess(e) {
            e.preventDefault();
            console.log('开始处理上传订单数据请求');
            
            if (this.data.processing) {
                console.log('当前有处理中的请求，跳过');
                return;
            }
            
            if (!this.data.uploadedFile) {
                this.showError('请先选择要上传的文件');
                return;
            }
            
            this.setProcessing(true);
            
            try {
                const person = this.getSelectedPerson();
                const formData = this.createUploadFormData(person);
                
                this.showProcessing('正在上传并处理订单数据...');
                const response = await this.uploadAndProcessFile(formData);
                await this.handleUploadProcessResponse(response);
            } catch (error) {
                console.error('上传处理失败:', error);
                this.showError(`上传处理失败: ${error.message}`);
            } finally {
                this.setProcessing(false);
            }
        },
        
        getSelectedPerson() {
            if (!this.elements.personSelect) return '';
            return this.elements.personSelect.value || '';
        },
        
        createUploadFormData(person) {
            const formData = new FormData();
            formData.append('excel_file', this.data.uploadedFile);
            
            if (person) {
                formData.append('username', person);
            }
            
            return formData;
        },
        
        async uploadAndProcessFile(formData) {
            this.showButtonLoading(this.elements.uploadProcessBtn, '正在处理...');
            
            try {
                console.log('发送上传处理请求到:', this.config.api.uploadProcess);
                const response = await fetch(this.config.api.uploadProcess, {
                    method: 'POST',
                    body: formData
                });
                
                console.log('收到API响应:', response.status, response.statusText);
                
                if (!response.ok) {
                    let errorMsg = `请求失败 (${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (e) {
                        // 忽略JSON解析错误
                    }
                    throw new Error(errorMsg);
                }
                
                return response;
            } finally {
                this.hideButtonLoading(this.elements.uploadProcessBtn);
            }
        },
        
        async handleUploadProcessResponse(response) {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const responseData = await response.json();
                console.log('收到订单处理响应数据:', responseData);
                
                if (responseData.code !== 0) {
                    throw new Error(responseData.msg || '订单处理失败');
                }
                
                const data = responseData.data || {};
                
                // 生成文件名：fills_name + 补单订单汇总表.xlsx
                const fileName = data.fills_name ? 
                    `${data.fills_name}补单订单汇总表.xlsx` : 
                    '补单订单汇总表.xlsx';
                
                // 处理Base64文件下载
                if (data.base64_content) {
                    await this.handleBase64FileDownload(data.base64_content, fileName);
                }
                
                // 更新统计信息
                this.updateStatsFromData(data);
                
                // 显示成功消息
                this.showSuccess(responseData.msg || '订单处理完成');
            } else {
                throw new Error('未知的响应类型');
            }
        },
        
        async handleBase64FileDownload(base64Content, fileName) {
            if (!base64Content) {
                throw new Error('文件内容为空');
            }
            
            try {
                const cleanBase64 = base64Content.replace(/^data:[^;]+;base64,/, '');
                
                if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
                    throw new Error('Base64内容格式无效');
                }
                
                const binaryString = atob(cleanBase64);
                const bytes = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
            } catch (error) {
                console.error('文件下载失败:', error);
                throw new Error(`文件下载失败: ${error.message}`);
            }
        },
        
        updateStatsFromData(data) {
            // 店铺数量
            if (this.elements.shopCountValue) {
                this.elements.shopCountValue.textContent = data.shop_count || 0;
            }
            
            // 总订单数
            if (this.elements.totalOrderValue) {
                this.elements.totalOrderValue.textContent = data.total_unique_order || 0;
            }
            
            // 总金额
            if (this.elements.totalAmountValue) {
                const amount = data.total_unique_amount || 0;
                this.elements.totalAmountValue.textContent = '¥' + 
                    amount.toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
            }
            
            // 重复订单
            if (this.elements.duplicateOrderValue) {
                this.elements.duplicateOrderValue.textContent = data.duplicate_count || 0;
            }
            
            console.log('数据卡片已更新:', data);
        },
        
        showProcessing(message = '正在处理...') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('success', 'error');
                this.elements.responseContent.classList.add('loading');
            }
        },
        
        showSuccess(message = '操作成功') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('loading', 'error');
                this.elements.responseContent.classList.add('success');
            }
        },
        
        showError(message = '操作失败') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('loading', 'success');
                this.elements.responseContent.classList.add('error');
            }
        },
        
        setProcessing(isProcessing) {
            this.data.processing = isProcessing;
            
            if (this.elements.uploadProcessBtn) {
                this.elements.uploadProcessBtn.disabled = isProcessing;
            }
            
            if (this.elements.downloadTemplateBtn) {
                this.elements.downloadTemplateBtn.disabled = isProcessing;
            }
        },
        
        updateUIState() {
            const hasFile = !!this.data.uploadedFile;
            
            if (this.elements.uploadProcessBtn) {
                this.elements.uploadProcessBtn.disabled = !hasFile || this.data.processing;
            }
        },
        
        showButtonLoading(button, loadingText) {
            if (!button) return;
            
            const originalText = button.innerHTML;
            button.setAttribute('data-original-text', originalText);
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText || '处理中...'}`;
            button.disabled = true;
        },
        
        hideButtonLoading(button) {
            if (!button) return;
            
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            button.disabled = false;
        },
        
        reset() {
            // 清除上传的文件
            this.clearUploadedFile();
            
            // 重置负责人选择
            if (this.elements.personSelect) {
                this.elements.personSelect.value = '';
            }
            
            // 重置数据卡片
            this.updateStatsFromData({
                shop_count: 0,
                total_unique_order: 0,
                total_unique_amount: 0,
                duplicate_count: 0
            });
            
            // 重置响应容器
            this.initResponseContainer();
            
            console.log('模块已重置');
        },
        
        clearUploadedFile() {
            this.data.uploadedFile = null;
            
            if (this.data.fileInput) {
                this.data.fileInput.value = '';
            }
            
            if (this.elements.fileUploadArea && this.elements.uploadIcon && 
                this.elements.uploadText && this.elements.uploadFormatHint) {
                this.elements.fileUploadArea.classList.remove('has-file');
                this.elements.uploadIcon.className = 'fas fa-cloud-upload-alt';
                this.elements.uploadIcon.style.color = '';
                this.elements.uploadText.textContent = '点击或拖拽文件上传';
                this.elements.uploadFormatHint.textContent = '支持 .xlsx, .xls 格式';
            }
            
            this.updateUIState();
        },
        
        destroy() {
            if (this.elements.downloadTemplateBtn) {
                this.elements.downloadTemplateBtn.replaceWith(
                    this.elements.downloadTemplateBtn.cloneNode(true)
                );
            }
            
            if (this.elements.uploadProcessBtn) {
                this.elements.uploadProcessBtn.replaceWith(
                    this.elements.uploadProcessBtn.cloneNode(true)
                );
            }
            
            if (this.data.fileInput && document.body) {
                document.body.removeChild(this.data.fileInput);
            }
            
            this.data.initialized = false;
        }
    };
    
    window.OrderSummaryModule = OrderSummaryModule;
})();

function initorder_summary(container) {
    if (typeof window.OrderSummaryModule !== 'undefined' && 
        !window.OrderSummaryModule.data.initialized) {
        window.OrderSummaryModule.init(container);
    } else if (window.OrderSummaryModule.data.initialized) {
        console.log('订单汇总模块已初始化，跳过重复初始化');
    } else {
        console.error('OrderSummaryModule未定义，请确保order_summary_fixed.js已正确加载');
    }
}
