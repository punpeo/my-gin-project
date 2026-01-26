/**
 * 产品周期销量统计模块
 * 功能：统计指定周期内的产品销量
 * 初始化函数：initcycle_sales
 */

const CycleSalesModule = {
    // 模块配置
    config: {
        api: {
            statistic: '/api/v1/cycle-sales/statistic'
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
        console.log('初始化产品周期销量统计模块');
        
        // 缓存DOM元素
        this.cacheElements(container);
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化组件
        this.initComponents();
        
        // 注册到模块管理器
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('cycle-sales', this);
        }
    },
    
    /**
     * 缓存DOM元素
     */
    cacheElements: function(container) {
        this.elements = {
            container: container,
            // 表单元素
            basePathInput: container.querySelector('#cycle-sales-base-path'),
            baseFileNameInput: container.querySelector('#cycle-sales-base-filename'),
            startColumnSelect: container.querySelector('#cycle-sales-start-column'),
            endColumnSelect: container.querySelector('#cycle-sales-end-column'),
            
            // 统计信息区域
            cycleTypeValue: container.querySelector('#cycle-sales-cycle-type'),
            cycleDaysValue: container.querySelector('#cycle-sales-cycle-days'),
            productCountValue: container.querySelector('#cycle-sales-product-count'),
            
            // 按钮
            statisticBtn: container.querySelector('#cycle-sales-statistic-btn'),
            
            // 响应容器
            responseContainer: container.querySelector('#cycle-sales-response-container'),
            responseContent: container.querySelector('#cycle-sales-response-content'),
            responsePlaceholder: container.querySelector('#cycle-sales-response-placeholder')
        };
    },
    
    /**
     * 绑定事件监听器
     */
    bindEvents: function() {
        const el = this.elements;
        
        // 统计按钮点击
        if (el.statisticBtn) {
            el.statisticBtn.addEventListener('click', (e) => this.handleStatistic(e));
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
     * 初始化组件
     */
    initComponents: function() {
        // 验证输入
        this.validateInputs();
        
        // 更新UI状态
        this.updateUIState();
    },
    
    /**
     * 处理统计请求
     */
    handleStatistic: async function(e) {
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
            this.showProcessing('正在统计产品周期销量...');
            
            // 调用API
            const response = await this.callStatisticAPI(requestData);
            
            // 处理响应
            await this.handleStatisticResponse(response);
            
        } catch (error) {
            console.error('统计失败:', error);
            this.showError(`统计失败: ${error.message}`);
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
            base_path: el.basePathInput?.value.trim() || '',
            base_file_name: el.baseFileNameInput?.value.trim() || 'kucun.xlsx',
            start_column: el.startColumnSelect?.value || 'C',
            end_column: el.endColumnSelect?.value || 'D'
        };
    },
    
    /**
     * 调用统计API
     */
    callStatisticAPI: async function(requestData) {
        this.showButtonLoading(this.elements.statisticBtn, '正在统计...');
        
        try {
            const response = await fetch(this.config.api.statistic, {
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
            this.hideButtonLoading(this.elements.statisticBtn, '<i class="fas fa-chart-pie"></i> 执行周期销量统计');
        }
    },
    
    /**
     * 处理统计响应
     */
    handleStatisticResponse: async function(response) {
        const contentType = response.headers.get('content-type');
        
        // 检查是否为错误响应
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.msg || `错误码: ${errorData.code}`);
        }
        
        // 检查是否为Excel文件
        if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
            // 从响应头获取统计信息
            this.updateStatsFromHeaders(response.headers);
            
            // 处理Excel文件下载
            const filename = await this.handleExcelFileDownload(response);
            
            // 显示成功消息
            this.showSuccess(`统计完成，结果已下载: ${filename}`);
        } else {
            throw new Error('未知的响应类型');
        }
    },
    
    /**
     * 从响应头更新统计信息
     */
    updateStatsFromHeaders: function(headers) {
        const el = this.elements;
        
        // 获取产品数
        const productCount = headers.get('X-Product-Count');
        if (productCount && el.productCountValue) {
            el.productCountValue.textContent = productCount;
            
            // 添加动画效果
            this.animateValue(el.productCountValue, productCount);
        }
        
        // 获取周期天数
        const cycleDays = headers.get('X-Cycle-Days');
        if (cycleDays && el.cycleDaysValue) {
            el.cycleDaysValue.textContent = cycleDays;
            
            // 根据周期天数更新周期类型
            this.updateCycleType(parseInt(cycleDays));
            
            // 添加动画效果
            this.animateValue(el.cycleDaysValue, cycleDays);
        }
        
        // 添加卡片动画效果
        this.addStatsAnimation();
    },
    
    /**
     * 数字动画效果
     */
    animateValue: function(element, targetValue) {
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        const target = parseInt(targetValue) || 0;
        
        if (currentValue === target) return;
        
        // 简单的数值变化动画
        element.classList.add('counting');
        element.textContent = target;
        
        // 动画结束后移除类
        setTimeout(() => {
            element.classList.remove('counting');
        }, 300);
    },
    
    /**
     * 添加统计区域动画效果
     */
    addStatsAnimation: function() {
        const el = this.elements;
        const statItems = document.querySelectorAll('.stat-item');
        
        if (statItems.length > 0) {
            statItems.forEach(item => {
                item.classList.add('updated');
                setTimeout(() => {
                    item.classList.remove('updated');
                }, 1000);
            });
        }
    },
    
    /**
     * 更新周期类型
     */
    updateCycleType: function(days) {
        const el = this.elements;
        if (!el.cycleTypeValue) return;
        
        if (isNaN(days)) {
            el.cycleTypeValue.textContent = '周/月/季';
            return;
        }
        
        if (days === 7) {
            el.cycleTypeValue.textContent = '周';
        } else if (days === 30 || days === 31) {
            el.cycleTypeValue.textContent = '月';
        } else if (days === 90 || days === 91 || days === 92) {
            el.cycleTypeValue.textContent = '季';
        } else {
            el.cycleTypeValue.textContent = `${days}天`;
        }
        
        // 添加动画效果
        this.animateValue(el.cycleTypeValue, days);
    },
    
    /**
     * 处理Excel文件下载
     */
    handleExcelFileDownload: async function(response) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        let filename = '销量统计.xlsx';
        
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
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.CycleSalesModule.retry()">
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
                <p class="response-placeholder">点击「执行周期销量统计」后，执行结果将展示在此处</p>
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
        if (el.statisticBtn) {
            el.statisticBtn.disabled = this.data.processing;
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
        
        // 重置统计信息
        if (el.cycleTypeValue) el.cycleTypeValue.textContent = '周/月/季';
        if (el.cycleDaysValue) el.cycleDaysValue.textContent = '5';
        if (el.productCountValue) el.productCountValue.textContent = '256';
        
        // 重置响应容器
        if (el.responseContent) {
            el.responseContent.innerHTML = `
                <p class="response-placeholder">点击「执行周期销量统计」后，执行结果将展示在此处</p>
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
                    <p class="response-placeholder">点击「执行周期销量统计」后，执行结果将展示在此处</p>
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
        if (el.statisticBtn) {
            el.statisticBtn.removeEventListener('click', this.handleStatistic);
        }
        
        console.log('产品周期销量统计模块已销毁');
    }
};

// 全局初始化函数
function initcycle_sales(container) {
    CycleSalesModule.init(container);
}

// 确保模块在全局可用
window.CycleSalesModule = CycleSalesModule;
