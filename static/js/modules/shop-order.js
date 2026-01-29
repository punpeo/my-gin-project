/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */

(function() {
    // 防止重复声明
    if (window.ShopOrderModule && window.ShopOrderModule.initialized) {
        return;
    }

    // 定义店铺订单统计模块
    const ShopOrderModule = {
        config: {
            api: {
                statisticByPath: '/api/v1/shop-order/statistic-by-path',
                statisticByUpload: '/api/v1/shop-order/statistic-by-upload'
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
        
        getCurrentMonthDayString() {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${month}${day}`;
        },
        
        init(container) {
            if (this.data.initialized) {
                return;
            }
            
            this.cacheElements(container);
            this.createFileInput();
            this.bindEvents();
            this.initComponents();
            this.initResponseContainer();
            
            this.data.initialized = true;
            
            if (typeof window.ModulesManager !== 'undefined') {
                window.ModulesManager.registerModule('shop-order', this);
            }
        },
        
        cacheElements(container) {
            this.elements = {
                container: container,
                basePathInput: container.querySelector('#shop-order-base-path'),
                fileUploadArea: container.querySelector('#shop-order-file-upload-area'),
                uploadIcon: container.querySelector('#shop-order-upload-icon'),
                uploadText: container.querySelector('#shop-order-upload-text'),
                uploadFormatHint: container.querySelector('#shop-order-upload-format-hint'),
                shopCountValue: container.querySelector('#shop-order-shop-count'),
                totalOrderValue: container.querySelector('#shop-order-total-order'),
                totalAmountValue: container.querySelector('#shop-order-total-amount'),
                statisticByPathBtn: container.querySelector('#shop-order-statistic-by-path-btn'),
                statisticByUploadBtn: container.querySelector('#shop-order-statistic-by-upload-btn'),
                responseContent: document.querySelector('#stock-response-content')
            };
        },
        
        createFileInput() {
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
        
        bindEvents() {
            if (this.elements.statisticByPathBtn) {
                this.elements.statisticByPathBtn.addEventListener('click', (e) => {
                    this.handleStatisticByPath(e);
                });
            }
            
            if (this.elements.statisticByUploadBtn) {
                this.elements.statisticByUploadBtn.addEventListener('click', (e) => {
                    this.handleStatisticByUpload(e);
                });
            }
            
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleFileSelect();
                });
            }
            
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
            
            if (this.elements.basePathInput) {
                this.elements.basePathInput.addEventListener('input', () => this.validateBasePathInput());
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
            if (this.data.fileInput) {
                this.data.fileInput.click();
            }
        },
        
        handleFileChange(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            
            if (!this.validateFile(file)) {
                return;
            }
            
            this.data.uploadedFile = file;
            this.updateFileUploadArea(file);
            this.updateUIState();
        },
        
        validateFile(file) {
            if (file.size > this.config.maxFileSize) {
                this.showError(`文件大小不能超过 ${this.config.maxFileSize / 1024 / 1024}MB`);
                return false;
            }
            
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
        
        async handleStatisticByPath(e) {
            e.preventDefault();
            
            if (this.data.processing) {
                return;
            }
            
            if (!this.validateBasePathInput()) {
                this.showError('请输入有效的文件根目录');
                return;
            }
            
            this.setProcessing(true);
            
            try {
                this.showProcessing('正在统计路径下的店铺订单数据...');
                const response = await this.callStatisticByPathAPI();
                await this.handleStatisticResponse(response, '路径统计');
            } catch (error) {
                console.error('路径统计失败:', error);
                this.showError(`路径统计失败: ${error.message}`);
            } finally {
                this.setProcessing(false);
            }
        },
        
        async handleStatisticByUpload(e) {
            e.preventDefault();
            
            if (this.data.processing) {
                return;
            }
            
            if (!this.validateUploadedFile()) {
                this.showError('请先选择要上传的文件');
                return;
            }
            
            this.setProcessing(true);
            
            try {
                this.showProcessing('正在统计上传文件的店铺订单数据...');
                const response = await this.callStatisticByUploadAPI();
                await this.handleStatisticResponse(response, '上传统计');
            } catch (error) {
                console.error('上传统计失败:', error);
                this.showError(`上传统计失败: ${error.message}`);
            } finally {
                this.setProcessing(false);
            }
        },
        
        validateBasePathInput() {
            if (!this.elements.basePathInput || !this.elements.basePathInput.value.trim()) {
                this.markInvalid(this.elements.basePathInput, '请输入文件根目录');
                return false;
            }
            
            this.markValid(this.elements.basePathInput);
            return true;
        },
        
        validateUploadedFile() {
            if (!this.data.uploadedFile) {
                this.showError('请先选择要上传的文件');
                return false;
            }
            
            return true;
        },
        
        markInvalid(element, message) {
            if (!element) return;
            
            element.classList.add('is-invalid');
            element.classList.remove('is-valid');
            
            let feedback = element.nextElementSibling;
            if (!feedback?.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                element.parentNode.appendChild(feedback);
            }
            feedback.textContent = message;
        },
        
        markValid(element) {
            if (!element) return;
            
            element.classList.remove('is-invalid');
            element.classList.add('is-valid');
            
            const feedback = element.nextElementSibling;
            if (feedback?.classList.contains('invalid-feedback')) {
                feedback.remove();
            }
        },
        
        getRequestDataByPath() {
            return {
                base_path: this.elements.basePathInput ? this.elements.basePathInput.value.trim() : ''
            };
        },
        
        getRequestDataByUpload() {
            const formData = new FormData();
            formData.append('file', this.data.uploadedFile);
            return formData;
        },
        
        async callStatisticByPathAPI() {
            this.showButtonLoading(this.elements.statisticByPathBtn, '正在统计...');
            
            try {
                const requestData = this.getRequestDataByPath();
                const response = await fetch(this.config.api.statisticByPath, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });
                
                if (!response.ok) {
                    let errorMsg = `请求失败 (${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (e) {
                    }
                    throw new Error(errorMsg);
                }
                
                return response;
            } finally {
                this.hideButtonLoading(this.elements.statisticByPathBtn);
            }
        },
        
        async callStatisticByUploadAPI() {
            this.showButtonLoading(this.elements.statisticByUploadBtn, '正在统计...');
            
            try {
                const formData = this.getRequestDataByUpload();
                const response = await fetch(this.config.api.statisticByUpload, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    let errorMsg = `请求失败 (${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (e) {
                    }
                    throw new Error(errorMsg);
                }
                
                return response;
            } finally {
                this.hideButtonLoading(this.elements.statisticByUploadBtn);
            }
        },
        
        async handleStatisticResponse(response, method) {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const responseData = await response.json();
                
                if (responseData.code !== 0) {
                    throw new Error(responseData.msg || '统计失败');
                }
                
                const data = responseData.data || {};
                
                if (data.base64_content) {
                    const fileName = method === '路径统计' ? 
                        `${this.getCurrentMonthDayString()}店铺订单统计.xlsx` : 
                        `${this.getCurrentMonthDayString()}_上传文件店铺订单统计.xlsx`;
                    
                    await this.handleBase64FileDownload(data.base64_content, fileName);
                }
                
                this.updateStatsFromData(data);
                
                this.showSuccess(responseData.msg || `${method}完成`);
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
            if (this.elements.shopCountValue) {
                this.elements.shopCountValue.textContent = data.shop_num || 0;
            }
            
            if (this.elements.totalOrderValue) {
                this.elements.totalOrderValue.textContent = data.total_num ? 
                    data.total_num.toLocaleString('zh-CN') : 0;
            }
            
            if (this.elements.totalAmountValue) {
                const amount = data.total_amt || 0;
                this.elements.totalAmountValue.textContent = '¥' + 
                    amount.toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
            }
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
            
            if (this.elements.statisticByPathBtn) {
                this.elements.statisticByPathBtn.disabled = isProcessing;
            }
            
            if (this.elements.statisticByUploadBtn) {
                this.elements.statisticByUploadBtn.disabled = isProcessing;
            }
        },
        
        updateUIState() {
            const hasBasePath = this.elements.basePathInput && this.elements.basePathInput.value.trim();
            const hasFile = !!this.data.uploadedFile;
            
            if (this.elements.statisticByPathBtn) {
                this.elements.statisticByPathBtn.disabled = !hasBasePath || this.data.processing;
            }
            
            if (this.elements.statisticByUploadBtn) {
                this.elements.statisticByUploadBtn.disabled = !hasFile || this.data.processing;
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
            if (this.elements.basePathInput) this.elements.basePathInput.value = 'E:\\tongjidingdan';
            
            this.clearUploadedFile();
            
            this.updateStatsFromData({
                shop_num: 0,
                total_num: 0,
                total_amt: 0
            });
            
            this.initResponseContainer();
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
                this.elements.uploadText.textContent = '点击或拖拽文件上传(可选)';
                this.elements.uploadFormatHint.textContent = '支持 .xlsx, .xls 格式';
            }
            
            this.updateUIState();
        },
        
        destroy() {
            if (this.elements.statisticByPathBtn) {
                this.elements.statisticByPathBtn.replaceWith(
                    this.elements.statisticByPathBtn.cloneNode(true)
                );
            }
            
            if (this.elements.statisticByUploadBtn) {
                this.elements.statisticByUploadBtn.replaceWith(
                    this.elements.statisticByUploadBtn.cloneNode(true)
                );
            }
            
            if (this.data.fileInput && document.body) {
                document.body.removeChild(this.data.fileInput);
            }
            
            this.data.initialized = false;
        }
    };
    
    window.ShopOrderModule = ShopOrderModule;
})();

function initshop_order(container) {
    if (typeof window.ShopOrderModule !== 'undefined' && 
        !window.ShopOrderModule.data.initialized) {
        window.ShopOrderModule.init(container);
    } else if (window.ShopOrderModule.data.initialized) {
    } else {
        console.error('ShopOrderModule未定义，请确保shop_order_module_optimized.js已正确加载');
    }
}
