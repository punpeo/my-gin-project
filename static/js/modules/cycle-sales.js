/**
 * 产品周期销量统计模块（优化版）
 * 修复：操作结果区域消息显示异常
 * 优化：统一消息渲染逻辑，避免状态残留与样式冲突
 */
const CycleSalesModule = {
    config: {
        api: { statistic: '/api/v1/cycle-sales/statistic' }
    },
    elements: {},
    data: { processing: false },

    init(container) {
        console.log('初始化产品周期销量统计模块（优化版）');
        this.cacheElements(container);
        this.bindEvents();
        this.initComponents();
        if (typeof ModulesManager !== 'undefined') {
            ModulesManager.registerModule('cycle-sales', this);
        }
    },

    cacheElements(container) {
        this.elements = {
            basePathInput: container.querySelector('#cycle-sales-base-path'),
            baseFileNameInput: container.querySelector('#cycle-sales-base-filename'),
            startColumnSelect: container.querySelector('#cycle-sales-start-column'),
            endColumnSelect: container.querySelector('#cycle-sales-end-column'),
            cycleTypeValue: container.querySelector('#cycle-sales-cycle-type'),
            cycleDaysValue: container.querySelector('#cycle-sales-cycle-days'),
            productCountValue: container.querySelector('#cycle-sales-product-count'),
            statisticBtn: container.querySelector('#cycle-sales-statistic-btn'),
            responseContainer: container.querySelector('#stock-response-container'),
            responseContent: container.querySelector('#stock-response-content')
        };
        console.log('DOM元素缓存结果:', {
            responseContainer: !!this.elements.responseContainer,
            responseContent: !!this.elements.responseContent
        });
    },

    bindEvents() {
        const el = this.elements;
        if (el.statisticBtn) {
            el.statisticBtn.addEventListener('click', e => this.handleStatistic(e));
        }
        [el.basePathInput, el.baseFileNameInput].forEach(input => {
            if (input) input.addEventListener('input', () => this.validateInputs());
        });
    },

    initComponents() {
        this.validateInputs();
        this.updateUIState();
        this.initResponseContainer();
    },

    initResponseContainer() {
        const { responseContainer, responseContent } = this.elements;
        if (!responseContainer || !responseContent) {
            console.error('响应容器元素未找到');
            return;
        }
        responseContainer.style.display = 'block';
        this.clearResponseStyle();
        responseContent.innerHTML = '<span style="color: var(--gray-400);">等待执行统计操作...</span>';
    },

    clearResponseStyle() {
        const { responseContent } = this.elements;
        if (!responseContent) return;
        responseContent.className = 'response-content';
        responseContent.style.cssText = '';
    },

    async handleStatistic(e) {
        e.preventDefault();
        if (this.data.processing) return;
        if (!this.validateInputs()) {
            this.showMessage('请填写所有必填项并确保格式正确', 'error');
            return;
        }
        this.setProcessing(true);
        try {
            const requestData = this.getRequestData();
            this.showMessage('正在统计产品周期销量，请稍候...', 'loading');
            const response = await this.callStatisticAPI(requestData);
            await this.handleStatisticResponse(response);
        } catch (error) {
            console.error('周期销量统计失败:', error);
            this.showMessage(`统计失败: ${error.message}`, 'error');
        } finally {
            this.setProcessing(false);
        }
    },

    getRequestData() {
        const el = this.elements;
        return {
            base_path: el.basePathInput?.value.trim() || '',
            base_file_name: el.baseFileNameInput?.value.trim() || 'kucun.xlsx',
            start_column: el.startColumnSelect?.value || 'C',
            end_column: el.endColumnSelect?.value || 'D'
        };
    },

    async callStatisticAPI(requestData) {
        const { statisticBtn } = this.elements;
        this.showButtonLoading(statisticBtn, '正在统计...');
        try {
            const response = await fetch(this.config.api.statistic, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.msg || `服务端响应异常，状态码：${response.status}`);
            }
            return response;
        } finally {
            this.hideButtonLoading(statisticBtn, '<i class="fas fa-chart-pie"></i> 执行周期销量统计');
        }
    },

    async handleStatisticResponse(response) {
        const resData = await response.json();
        if (resData.code !== 0) {
            throw new Error(resData.msg || '周期销量统计业务处理失败');
        }
        const data = resData.data;
        if (!data) throw new Error('后端未返回统计结果数据');
        if (!data.base64) throw new Error('后端未返回统计文件Base64内容');
        if (data.cycleDays === undefined || data.productCount === undefined) {
            throw new Error('后端统计数据不完整（缺少周期天数/产品数）');
        }
        this.downloadExcelFromBase64(data.base64, data.fileName);
        this.updateStatsFromData(data);
        this.showMessage(data.message || '产品周期销量统计完成，结果文件已自动下载', 'success');
    },

    downloadExcelFromBase64(base64Str, fileName) {
        try {
            const byteCharacters = atob(base64Str);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`统计文件下载成功，文件名：${fileName}`);
        } catch (error) {
            throw new Error(`文件解析/下载失败：${error.message}`);
        }
    },

    updateStatsFromData(data) {
        const el = this.elements;
        if (!data) return;
        if (el.cycleDaysValue) {
            const targetDays = parseInt(data.cycleDays);
            this.animateValue(el.cycleDaysValue, targetDays);
        }
        if (el.productCountValue) {
            const targetCount = parseInt(data.productCount);
            this.animateValue(el.productCountValue, targetCount);
        }
        this.updateCycleType(parseInt(data.cycleDays));
        this.addStatsAnimation();
    },

    animateValue(element, targetValue) {
        if (!element || isNaN(targetValue)) return;
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === targetValue) return;
        element.classList.add('counting');
        element.textContent = targetValue;
        setTimeout(() => element.classList.remove('counting'), 500);
    },

    addStatsAnimation() {
        const statItems = document.querySelectorAll('.stat-item');
        if (statItems.length > 0) {
            statItems.forEach(item => {
                item.classList.add('updated');
                setTimeout(() => item.classList.remove('updated'), 1000);
            });
        }
    },

    updateCycleType(days) {
        const el = this.elements;
        if (!el.cycleTypeValue || isNaN(days)) {
            el.cycleTypeValue.textContent = '周/月/季';
            return;
        }
        if (days === 7) {
            el.cycleTypeValue.textContent = '周';
        } else if (days >= 28 && days <= 31) {
            el.cycleTypeValue.textContent = '月';
        } else if (days >= 89 && days <= 92) {
            el.cycleTypeValue.textContent = '季';
        } else {
            el.cycleTypeValue.textContent = `${days}天`;
        }
    },

    validateInputs() {
        const el = this.elements;
        let isValid = true;
        if (el.basePathInput && !el.basePathInput.value.trim()) {
            this.markInvalid(el.basePathInput, '请输入文件根目录（如：E:\\kucun）');
            isValid = false;
        } else {
            this.markValid(el.basePathInput);
        }
        if (el.baseFileNameInput && !el.baseFileNameInput.value.trim()) {
            this.markInvalid(el.baseFileNameInput, '请输入基准文件名（如：kucun.xlsx）');
            isValid = false;
        } else {
            this.markValid(el.baseFileNameInput);
        }
        return isValid;
    },

    markInvalid(element, message) {
        if (!element) return;
        element.classList.add('is-invalid');
        element.classList.remove('is-valid');
        let feedback = element.nextElementSibling;
        if (!feedback || !feedback.classList.contains('invalid-feedback')) {
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
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.remove();
        }
    },

    showMessage(message, type) {
        const { responseContainer, responseContent } = this.elements;
        if (!responseContainer || !responseContent) return;
        this.clearResponseStyle();
        responseContainer.style.display = 'block';
        responseContent.classList.add(type);
        switch (type) {
            case 'loading':
                responseContent.style.cssText = `
                    border: 1px solid #dee2e6;
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 4px;
                `;
                responseContent.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 16px; justify-content: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #6c757d;"></i>
                        <div style="text-align: left;">
                            <h5 style="margin: 0; color: #495057; font-weight: 500;">处理中</h5>
                            <p style="margin: 4px 0 8px 0; color: #6c757d; font-size: 0.95rem;">${message}</p>
                            <div style="height: 4px; width: 200px; background-color: #e9ecef; border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: 100%; background-color: #0d6efd; animation: progress-animated 1.5s infinite ease-in-out;"></div>
                            </div>
                        </div>
                    </div>
                    <style>@keyframes progress-animated { 0% { width: 0; } 100% { width: 100%; } }</style>
                `;
                break;
            case 'success':
                responseContent.style.cssText = `
                    border: 1px solid #198754;
                    background-color: rgba(25, 135, 84, 0.05);
                    padding: 20px;
                    border-radius: 4px;
                `;
                responseContent.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <i class="fas fa-check-circle" style="font-size: 28px; color: #198754; margin-top: 4px;"></i>
                        <div>
                            <h5 style="margin: 0; color: #198754; font-weight: 500;">统计完成</h5>
                            <p style="margin: 6px 0 12px 0; color: #212529; font-size: 0.95rem;">${message}</p>
                            <div style="display: flex; align-items: center; gap: 8px; color: #0d6efd; font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i>
                                <span>文件已自动下载，如未触发请检查浏览器下载设置</span>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'error':
                responseContent.style.cssText = `
                    border: 1px solid #dc3545;
                    background-color: rgba(220, 53, 69, 0.05);
                    padding: 20px;
                    border-radius: 4px;
                `;
                responseContent.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 28px; color: #dc3545; margin-top: 4px;"></i>
                        <div>
                            <h5 style="margin: 0; color: #dc3545; font-weight: 500;">统计失败</h5>
                            <p style="margin: 6px 0 16px 0; color: #212529; font-size: 0.95rem;">${message}</p>
                            <button onclick="window.CycleSalesModule.retry()" style="padding: 4px 12px; border: 1px solid #0d6efd; background: transparent; color: #0d6efd; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                                <i class="fas fa-redo"></i> 重新统计
                            </button>
                        </div>
                    </div>
                `;
                break;
        }
    },

    showButtonLoading(button, loadingText) {
        if (!button) return;
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${loadingText}`;
        button.disabled = true;
    },

    hideButtonLoading(button, defaultText) {
        if (!button) return;
        const originalText = button.getAttribute('data-original-text');
        button.innerHTML = originalText || defaultText;
        button.disabled = false;
        button.removeAttribute('data-original-text');
    },

    retry() {
        this.initResponseContainer();
        this.validateInputs();
        this.updateUIState();
    },

    setProcessing(isProcessing) {
        this.data.processing = isProcessing;
        this.updateUIState();
    },

    updateUIState() {
        const { statisticBtn } = this.elements;
        if (statisticBtn) {
            statisticBtn.disabled = this.data.processing;
        }
    },

    reset() {
        const el = this.elements;
        if (el.basePathInput) el.basePathInput.value = 'E:\\kucun';
        if (el.baseFileNameInput) el.baseFileNameInput.value = 'kucun.xlsx';
        if (el.startColumnSelect) el.startColumnSelect.value = 'C';
        if (el.endColumnSelect) el.endColumnSelect.value = 'D';
        [el.basePathInput, el.baseFileNameInput].forEach(input => {
            if (input) {
                input.classList.remove('is-invalid', 'is-valid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.remove();
                }
            }
        });
        if (el.cycleTypeValue) el.cycleTypeValue.textContent = '周/月/季';
        if (el.cycleDaysValue) el.cycleDaysValue.textContent = '5';
        if (el.productCountValue) el.productCountValue.textContent = '256';
        this.initResponseContainer();
        this.showMessage('模块已重置为初始状态', 'success');
        setTimeout(() => this.initResponseContainer(), 3000);
    },

    destroy() {
        const el = this.elements;
        if (el.statisticBtn) {
            el.statisticBtn.removeEventListener('click', this.handleStatistic.bind(this));
        }
        [el.basePathInput, el.baseFileNameInput].forEach(input => {
            if (input) input.removeEventListener('input', this.validateInputs.bind(this));
        });
        this.elements = {};
        this.data = { processing: false };
        console.log('产品周期销量统计模块已销毁');
    }
};

function initcycle_sales(container) {
    CycleSalesModule.init(container);
}

window.CycleSalesModule = CycleSalesModule;
