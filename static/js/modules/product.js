/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */

(function() {
    // 防止模块重复初始化
    if (window.ProductModule && window.ProductModule.initialized) {
        return;
    }

    // 商品信息管理核心模块
    const ProductModule = {
        // 配置项：接口地址、文件限制
        config: {
            api: {
                batchImport: '/api/v2/product/import' // 对接后端批量导入接口
            },
            allowedFormats: ['.xlsx', '.xls'], // 支持的Excel格式
            maxFileSize: 20 * 1024 * 1024 // 文件大小限制：20MB
        },
        
        // 页面元素缓存
        elements: {},
        // 模块状态数据
        data: {
            uploadedFile: null, // 已上传的文件对象
            processing: false,  // 是否正在处理请求
            fileInput: null,    // 隐藏的文件选择框
            initialized: false  // 模块是否已初始化
        },
        
        // 初始化模块（入口方法，接收容器节点）
        init(container) {
            if (this.data.initialized) return;
            
            this.cacheElements(container); // 缓存页面元素
            this.createFileInput();        // 创建隐藏的文件选择框
            this.bindEvents();             // 绑定所有事件
            this.initUIState();            // 初始化页面状态
            this.initResponseContainer();  // 初始化操作结果区
            
            this.data.initialized = true;
            // 注册到项目模块管理器（与现有模块统一管理）
            if (typeof window.ModulesManager !== 'undefined') {
                window.ModulesManager.registerModule('product', this);
            }
        },
        
        // 缓存页面元素（与product.html的ID严格对应）
        cacheElements(container) {
            this.elements = {
                container: container,
                fileUploadArea: container.querySelector('.file-upload-area'),
                uploadIcon: container.querySelector('.file-upload-area i'),
                uploadText: container.querySelector('#shop-order-upload-text'),
                uploadFormatHint: container.querySelector('#shop-order-upload-format-hint'),
                importBtn: container.querySelector('.btn-group-2 button:last-child'), // 批量导入按钮
                responseContainer: container.querySelector('.response-container'),
                responseContent: container.querySelector('.response-content')
            };
        },
        
        // 创建隐藏的原生文件选择框（避免样式冲突）
        createFileInput() {
            this.data.fileInput = document.createElement('input');
            this.data.fileInput.type = 'file';
            this.data.fileInput.accept = '.xlsx,.xls'; // 仅允许Excel文件
            this.data.fileInput.style.display = 'none';
            
            // 绑定文件选择变化事件
            this.data.fileInput.addEventListener('change', (e) => {
                this.handleFileChange(e);
            });
            
            document.body.appendChild(this.data.fileInput);
        },
        
        // 绑定所有页面事件（点击、拖拽、提交等）
        bindEvents() {
            // 上传区域点击事件：触发文件选择
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleFileSelect();
                });
                
                // 拖拽相关事件：样式反馈
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
            
            // 批量导入按钮点击事件
            if (this.elements.importBtn) {
                this.elements.importBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleBatchImport(e);
                });
            }
        },
        
        // 初始化页面初始状态
        initUIState() {
            this.updateButtonState(); // 初始化按钮禁用状态
        },
        
        // 初始化操作结果区（清空内容、移除样式）
        initResponseContainer() {
            if (this.elements.responseContent) {
                this.elements.responseContent.innerHTML = '';
                this.elements.responseContent.classList.remove('success', 'error', 'loading');
            }
        },
        
        // 触发文件选择框点击
        handleFileSelect() {
            if (this.data.fileInput) {
                this.data.fileInput.click();
            }
        },
        
        // 文件选择框内容变化：校验并更新上传区
        handleFileChange(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // 校验文件格式和大小
            if (!this.validateFile(file)) return;
            
            this.data.uploadedFile = file;
            this.updateFileUploadArea(file); // 更新上传区样式和内容
            this.updateButtonState();        // 更新按钮状态
        },
        
        // 校验文件：格式+大小
        validateFile(file) {
            // 大小校验
            if (file.size > this.config.maxFileSize) {
                this.showError(`文件大小不能超过 ${this.config.maxFileSize / 1024 / 1024}MB`);
                return false;
            }
            
            // 格式校验
            const fileName = file.name.toLowerCase();
            const isValidFormat = this.config.allowedFormats.some(format => 
                fileName.endsWith(format)
            );
            if (!isValidFormat) {
                this.showError('仅支持 .xlsx / .xls 格式的Excel文件');
                return false;
            }
            
            return true;
        },
        
        // 更新文件上传区：展示文件名、大小，修改样式
        updateFileUploadArea(file) {
            if (!this.elements.fileUploadArea || !this.elements.uploadIcon || 
                !this.elements.uploadText || !this.elements.uploadFormatHint) return;
            
            const fileSize = (file.size / 1024 / 1024).toFixed(2); // 转换为MB并保留2位小数
            
            // 修改上传区样式
            this.elements.fileUploadArea.classList.add('has-file');
            this.elements.uploadIcon.className = 'fas fa-file-excel';
            this.elements.uploadIcon.style.color = '#10b981'; // 绿色：文件选择成功
            // 展示文件名和大小
            this.elements.uploadText.textContent = file.name;
            this.elements.uploadFormatHint.textContent = `文件大小：${fileSize} MB`;
        },
        
        // 拖拽悬浮：上传区样式反馈
        handleDragOver(e) {
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '#10b981';
                this.elements.fileUploadArea.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            }
        },
        
        // 拖拽离开：恢复上传区样式
        handleDragLeave(e) {
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '';
                this.elements.fileUploadArea.style.backgroundColor = '';
            }
        },
        
        // 拖拽释放：处理上传的文件
        handleDrop(e) {
            // 恢复上传区样式
            if (this.elements.fileUploadArea) {
                this.elements.fileUploadArea.style.borderColor = '';
                this.elements.fileUploadArea.style.backgroundColor = '';
            }
            
            // 获取拖拽的文件
            const files = e.dataTransfer.files;
            if (files.length === 0) return;
            
            const file = files[0];
            if (!this.validateFile(file)) return;
            
            this.data.uploadedFile = file;
            this.updateFileUploadArea(file);
            this.updateButtonState();
        },
        
        // 批量导入核心方法：请求后端接口
        async handleBatchImport(e) {
            // 防止重复提交
            if (this.data.processing) return;
            // 校验是否已选择文件
            if (!this.data.uploadedFile) {
                this.showError('请先选择要导入的Excel文件');
                return;
            }
            
            this.setProcessing(true); // 设置处理中状态
            try {
                this.showProcessing('正在批量导入商品数据...'); // 展示加载状态
                await this.callBatchImportAPI(); // 调用后端导入接口
                this.showSuccess('商品数据批量导入成功！'); // 展示成功提示
                this.clearUploadedFile(); // 清空上传的文件，恢复初始状态
            } catch (error) {
                console.error('商品批量导入失败：', error);
                this.showError(`导入失败：${error.message}`); // 展示错误提示
            } finally {
                this.setProcessing(false); // 恢复处理完成状态
            }
        },
        
        // 调用后端批量导入API
        async callBatchImportAPI() {
            // 展示按钮加载状态
            this.showButtonLoading(this.elements.importBtn, '导入中...');
            
            try {
                // 构造FormData（文件上传专用）
                const formData = new FormData();
                formData.append('file', this.data.uploadedFile); // 字段名「file」与后端保持一致
                
                // 发起POST请求
                const response = await fetch(this.config.api.batchImport, {
                    method: 'POST',
                    body: formData // 文件上传无需设置Content-Type，浏览器自动处理
                });
                
                // 校验请求是否成功
                if (!response.ok) {
                    let errorMsg = `请求失败（状态码：${response.status}）`;
                    // 尝试解析后端返回的错误信息
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.msg || errorMsg;
                    } catch (e) {}
                    throw new Error(errorMsg);
                }
                
                // 解析成功响应
                const result = await response.json();
                if (result.code !== 0) { // 与项目统一响应格式（code=0为成功）
                    throw new Error(result.msg || '商品导入失败');
                }
                
                return result;
            } finally {
                // 恢复按钮原始状态
                this.hideButtonLoading(this.elements.importBtn);
            }
        },
        
        // 设置模块处理中状态：禁用按钮、更新标识
        setProcessing(isProcessing) {
            this.data.processing = isProcessing;
            this.updateButtonState();
        },
        
        // 更新按钮禁用状态：未选文件/处理中 则禁用
        updateButtonState() {
            if (!this.elements.importBtn) return;
            this.elements.importBtn.disabled = !this.data.uploadedFile || this.data.processing;
        },
        
        // 展示按钮加载状态：添加加载图标、修改文字、禁用
        showButtonLoading(button, loadingText) {
            if (!button) return;
            const originalText = button.innerHTML;
            button.setAttribute('data-original-text', originalText); // 保存原始文字
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText || '处理中...'}`;
            button.disabled = true;
        },
        
        // 恢复按钮原始状态：移除加载图标、恢复文字、启用
        hideButtonLoading(button) {
            if (!button) return;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.innerHTML = originalText;
                button.removeAttribute('data-original-text');
            }
            button.disabled = !this.data.uploadedFile; // 恢复禁用逻辑
        },
        
        // 清空已上传的文件，恢复上传区初始状态
        clearUploadedFile() {
            this.data.uploadedFile = null;
            // 重置原生文件选择框
            if (this.data.fileInput) {
                this.data.fileInput.value = '';
            }
            // 恢复上传区样式和文字
            if (this.elements.fileUploadArea && this.elements.uploadIcon && 
                !this.elements.uploadText || !this.elements.uploadFormatHint) return;
            
            this.elements.fileUploadArea.classList.remove('has-file');
            this.elements.uploadIcon.className = 'fas fa-cloud-upload-alt';
            this.elements.uploadIcon.style.color = '';
            this.elements.uploadText.textContent = '点击或拖拽文件上传(可选)';
            this.elements.uploadFormatHint.textContent = '支持 .xlsx, .xls 格式';
            
            this.updateButtonState();
        },
        
        // 展示处理中状态（加载样式+文字）
        showProcessing(message = '正在处理...') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('success', 'error');
                this.elements.responseContent.classList.add('loading');
            }
        },
        
        // 展示成功提示（成功样式+文字）
        showSuccess(message = '操作成功') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('loading', 'error');
                this.elements.responseContent.classList.add('success');
                // 3秒后自动清空成功提示（可选）
                setTimeout(() => {
                    this.initResponseContainer();
                }, 3000);
            }
        },
        
        // 展示错误提示（错误样式+文字）
        showError(message = '操作失败') {
            if (this.elements.responseContent) {
                this.elements.responseContent.textContent = message;
                this.elements.responseContent.classList.remove('loading', 'success');
                this.elements.responseContent.classList.add('error');
            }
        },
        
        // 销毁模块：移除事件、清理元素，用于页面卸载
        destroy() {
            // 重新创建按钮，移除原有事件绑定
            if (this.elements.importBtn) {
                this.elements.importBtn.replaceWith(this.elements.importBtn.cloneNode(true));
            }
            // 移除隐藏的文件选择框
            if (this.data.fileInput && document.body) {
                document.body.removeChild(this.data.fileInput);
            }
            // 重置模块状态
            this.data.initialized = false;
            this.data.uploadedFile = null;
            this.data.processing = false;
        }
    };
    
    // 挂载到window，供外部初始化方法调用
    window.ProductModule = ProductModule;
})();

// 商品模块外部初始化入口（与项目现有模块初始化规范一致，如initshop_order）
function initproduct(container) {
    if (typeof window.ProductModule !== 'undefined' && !window.ProductModule.data.initialized) {
        window.ProductModule.init(container);
    } else if (window.ProductModule.data.initialized) {
        // 模块已初始化，无需重复执行
    } else {
        console.error('ProductModule未定义，请确保product.js已正确加载！');
    }
}