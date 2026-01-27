/**
 * 库存统计模块
 * 功能：库存统计、删除日期列、清理库存文件
 * 初始化函数：initstock
 */

const StockModule = {
    // 模块配置
    config: {
        api: {
            statistics: '/api/v1/stock/statistic',
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
        
        // 初始化响应容器（设置为空白）
        this.initResponseContainer();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('stock', this);
        }
    },
    
    /**
     * 初始化响应容器（初始空白）
     */
    initResponseContainer: function() {
        const el = this.elements;
        if (el.responseContent) {
            el.responseContent.innerHTML = ''; // 清空占位文字，实现初始空白
            // 移除所有状态类，确保初始样式干净
            el.responseContent.classList.remove('loading', 'success', 'error');
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
            
            // 统计数据卡片（新增缓存，避免重复查询DOM）
            productCountCard: container.querySelector('#product-count-card .data-value'),
            totalStockCard: container.querySelector('#total-stock-card .data-value')
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
                this.showTemporaryInfo('日期已自动更新为当前日期');
            }
        }
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
     * 通用API调用函数（适配后端统一返回HTTP 200）
     * @param {string} apiPath - API地址
     * @param {object} requestData - 请求参数
     * @param {HTMLElement} button - 操作按钮
     * @param {string} loadingText - 按钮加载文本
     * @returns {object} 后端响应数据
     */
    callAPI: async function(apiPath, requestData, button, loadingText) {
        this.showButtonLoading(button, loadingText);
        
        try {
            const response = await fetch(apiPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            // 仅解析响应，后端已保证HTTP 200
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                // 解析失败时构造标准化错误
                responseData = {
                    code: 500,
                    msg: `响应解析失败：${e.message}`,
                    data: null
                };
            }
            
            // 仅判断业务码，无需判断HTTP状态
            if (responseData.code !== 0) {
                const errorMsg = responseData.msg || `操作失败（错误码：${responseData.code}）`;
                throw new Error(errorMsg);
            }
            
            return responseData;
        } catch (error) {
            // 仅处理网络错误（如断网、跨域）
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('网络连接失败，请检查服务器是否在线');
            } else {
                throw new Error(error.message);
            }
        } finally {
            this.hideButtonLoading(button);
        }
    },
    
    /**
     * 新增：更新统计数据显示（优化版，使用缓存的DOM元素）
     */
    updateStatisticsDisplay: function(productCount, totalStock) {
        // 产品数量显示（使用缓存的DOM元素，提升性能）
        if (this.elements.productCountCard) {
            this.elements.productCountCard.textContent = Number(productCount).toLocaleString();
            // 添加强调动画
            this.elements.productCountCard.parentElement.classList.add('is-updated');
            setTimeout(() => {
                this.elements.productCountCard.parentElement.classList.remove('is-updated');
            }, 1500);
        }

        // 总库存显示（保留两位小数，格式化数字）
        if (this.elements.totalStockCard) {
            this.elements.totalStockCard.textContent = Number(totalStock).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            // 添加强调动画
            this.elements.totalStockCard.parentElement.classList.add('is-updated');
            setTimeout(() => {
                this.elements.totalStockCard.parentElement.classList.remove('is-updated');
            }, 1500);
        }

        // 高值样式标记
        if (this.elements.productCountCard && productCount > 1000) {
            this.elements.productCountCard.parentElement.classList.add('high-value');
        } else if (this.elements.productCountCard) {
            this.elements.productCountCard.parentElement.classList.remove('high-value');
        }
        
        if (this.elements.totalStockCard && totalStock > 100000) {
            this.elements.totalStockCard.parentElement.classList.add('high-value');
        } else if (this.elements.totalStockCard) {
            this.elements.totalStockCard.parentElement.classList.remove('high-value');
        }
    },

    /**
     * 处理base64内容并下载文件（核心新增功能）
     * @param {string} base64Content - 后端返回的base64编码内容
     * @param {string} filename - 下载的文件名
     */
    downloadFileFromBase64: function(base64Content, filename = 'kucun.xlsx') {
        try {
            // 移除base64前缀（如果有的话）
            const cleanBase64 = base64Content.replace(/^data:.+;base64,/, '');
            
            // 将base64转换为二进制数据
            const binaryString = window.atob(cleanBase64);
            const binaryLen = binaryString.length;
            const bytes = new Uint8Array(binaryLen);
            
            for (let i = 0; i < binaryLen; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // 创建Blob对象
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // 创建下载链接并触发下载
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
            
            return true;
        } catch (error) {
            console.error('文件下载失败：', error);
            throw new Error(`文件下载失败：${error.message}`);
        }
    },
    
    /**
     * 处理库存统计响应（完全重构，适配新的后端响应格式）
     */
    handleStatisticsResponse: function(responseData) {
        try {
            // 1. 提取统计数据并更新页面显示
            const { product_count = 0, total_stock = 0, column_name = '' } = responseData.data || {};
            this.updateStatisticsDisplay(product_count, total_stock);
            
            // 2. 处理base64文件下载
            if (responseData.data?.base64_content) {
                // 使用列名或默认名作为文件名
                const filename = `${column_name || 'kucun'}.xlsx`;
                this.downloadFileFromBase64(responseData.data.base64_content, filename);
            }
            
            // 3. 返回成功消息
            return responseData.data?.message || '库存统计完成';
        } catch (error) {
            throw new Error(`处理统计响应失败: ${error.message}`);
        }
    },
    
    /**
     * 处理库存统计（重构核心逻辑）
     */
    handleStatistics: async function(e) {
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
            const requestData = this.getStatisticsRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在执行库存统计...');
            
            // 调用库存统计API（使用通用callAPI，无需单独fetch）
            const responseData = await this.callAPI(
                this.config.api.statistics,
                requestData,
                this.elements.statisticsBtn,
                '正在统计...'
            );
            
            // 处理统计响应（包含数据展示和文件下载）
            const successMsg = this.handleStatisticsResponse(responseData);
            
            // 显示成功消息
            this.showSuccess(successMsg);
            
        } catch (error) {
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
     * 处理删除日期列
     */
    handleDeleteDateColumn: async function(e) {
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
            const requestData = this.getDeleteDateRequestData();
            
            // 显示处理中状态
            this.showProcessing('正在删除日期列...');
            
            // 调用通用API函数
            const responseData = await this.callAPI(
                this.config.api.deleteDateColumn,
                requestData,
                this.elements.deleteDateBtn,
                '正在删除...'
            );
            
            // 显示成功消息
            this.showSuccess(responseData.msg || '删除日期列成功');
            
        } catch (error) {
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
            
            // 调用通用API函数
            const responseData = await this.callAPI(
                this.config.api.cleanup,
                requestData,
                this.elements.cleanupBtn,
                '正在清理...'
            );
            
            // 拼接成功消息
            let successMsg = responseData.msg || '清理库存文件成功';
            if (responseData.data && responseData.data.cleanup !== undefined) {
                successMsg += `，共清理 ${responseData.data.cleanup} 个文件`;
            }
            this.showSuccess(successMsg);
            
        } catch (error) {
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
        
        // 显示容器，重置样式类
        el.responseContainer.classList.remove('d-none');
        el.responseContent.classList.remove('success', 'error');
        el.responseContent.classList.add('loading');
        
        // 简洁的加载提示
        el.responseContent.textContent = message || '正在处理，请稍候...';
    },
    
    /**
     * 显示成功消息
     */
    showSuccess: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        // 显示容器，重置样式类
        el.responseContainer.classList.remove('d-none');
        el.responseContent.classList.remove('loading', 'error');
        el.responseContent.classList.add('success');
        
        // 简洁的成功提示
        el.responseContent.textContent = message || '处理完成';
    },
    
    /**
     * 显示错误消息
     */
    showError: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        // 显示容器，重置样式类
        el.responseContainer.classList.remove('d-none');
        el.responseContent.classList.remove('loading', 'success');
        el.responseContent.classList.add('error');
        
        // 简洁的错误提示
        el.responseContent.textContent = message || '处理异常';
    },
    
    /**
     * 显示按钮加载状态
     */
    showButtonLoading: function(button, loadingText) {
        if (!button) return;
        
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i> ${loadingText || '处理中...'}
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
     * 显示临时信息消息
     */
    showTemporaryInfo: function(message) {
        const el = this.elements;
        if (!el.responseContainer || !el.responseContent) return;
        
        const originalContent = el.responseContent.innerHTML;
        const originalClasses = el.responseContent.className;
        
        // 显示临时提示
        el.responseContainer.classList.remove('d-none');
        el.responseContent.classList.remove('loading', 'success', 'error');
        el.responseContent.textContent = message;
        
        // 3秒后恢复空白状态
        setTimeout(() => {
            if (el.responseContent && el.responseContent.textContent === message) {
                this.initResponseContainer();
            }
        }, 3000);
    },
    
    /**
     * 重试
     */
    retry: function() {
        // 重置响应容器为空白
        this.initResponseContainer();
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
        
        // 重置响应容器为空白
        this.initResponseContainer();
        
        // 重置统计数据显示
        if (this.elements.productCountCard) this.elements.productCountCard.textContent = '0';
        if (this.elements.totalStockCard) this.elements.totalStockCard.textContent = '0';
        
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
    }
};

// 全局初始化函数
function initstock(container) {
    StockModule.init(container);
}

// 确保模块在全局可用
window.StockModule = StockModule;