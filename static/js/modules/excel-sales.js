/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */

(function () {
    // 防止重复声明
    if (window.ExcelSalesModule && window.ExcelSalesModule.initialized) {
        console.warn('ExcelSalesModule已经初始化，跳过重复定义');
        return;
    }

    // 定义Excel分组汇总模块
    const ExcelSalesModule = {
        config: {
            api: {
                process: '/api/v1/excel/process'
            }
        },

        elements: {},
        data: {
            processing: false,
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
                console.log('模块已初始化，跳过重复初始化');
                return;
            }

            console.log('开始初始化Excel分组汇总模块');

            this.cacheElements(container);
            this.bindEvents();
            this.initComponents();
            this.initResponseContainer();

            this.data.initialized = true;
            console.log('Excel分组汇总模块初始化完成');

            if (typeof window.ModulesManager !== 'undefined') {
                window.ModulesManager.registerModule('excel-sales', this);
            }
        },

        cacheElements(container) {
            this.elements = {
                container: container,
                basePathInput: container.querySelector('#excel-base-path'),
                matchColumnInput: container.querySelector('#excel-match-column'),
                matchValueInput: container.querySelector('#excel-match-value'),
                keepColumnsInput: container.querySelector('#excel-keep-columns'),
                sumColumnInput: container.querySelector('#excel-sum-column'),
                processBtn: container.querySelector('#excel-process-btn'),
                dataRow: container.querySelector('#data-row'),
                dataFile: container.querySelector('#data-file'),
                dataSkip: container.querySelector('#data-skip'),
                dataSum: container.querySelector('#data-sum'),
                responseContent: document.querySelector('#excel-response-content')
            };
        },

        initResponseContainer() {
            if (this.elements.responseContent) {
                this.elements.responseContent.innerHTML = '';
                this.elements.responseContent.classList.remove('success', 'error', 'loading');
            }
        },

        bindEvents() {


            if (this.elements.processBtn) {

                this.elements.processBtn.addEventListener('click', (e) => {
                    this.handleProcess(e);
                });
            } else {
                console.error('处理按钮元素未找到');
            }

            if (this.elements.basePathInput) {
                this.elements.basePathInput.addEventListener('input', () => this.validateInputs());
            }

            if (this.elements.matchColumnInput) {
                this.elements.matchColumnInput.addEventListener('input', () => this.validateInputs());
            }

            if (this.elements.keepColumnsInput) {
                this.elements.keepColumnsInput.addEventListener('input', () => this.validateInputs());
            }

            if (this.elements.sumColumnInput) {
                this.elements.sumColumnInput.addEventListener('input', () => this.validateInputs());
            }
        },

        initComponents() {
            this.validateInputs();
            this.updateUIState();
        },

        validateInputs() {
            let isValid = true;

            if (this.elements.basePathInput && !this.elements.basePathInput.value.trim()) {
                this.markInvalid(this.elements.basePathInput, '请输入Excel文件根目录');
                isValid = false;
            } else if (this.elements.basePathInput) {
                this.markValid(this.elements.basePathInput);
            }

            if (this.elements.matchColumnInput && !this.elements.matchColumnInput.value.trim()) {
                this.markInvalid(this.elements.matchColumnInput, '请输入匹配列');
                isValid = false;
            } else if (this.elements.matchColumnInput) {
                this.markValid(this.elements.matchColumnInput);
            }

            if (this.elements.keepColumnsInput && !this.elements.keepColumnsInput.value.trim()) {
                this.markInvalid(this.elements.keepColumnsInput, '请输入保留列');
                isValid = false;
            } else if (this.elements.keepColumnsInput) {
                this.markValid(this.elements.keepColumnsInput);
            }

            if (this.elements.sumColumnInput && !this.elements.sumColumnInput.value.trim()) {
                this.markInvalid(this.elements.sumColumnInput, '请输入求和列');
                isValid = false;
            } else if (this.elements.sumColumnInput) {
                this.markValid(this.elements.sumColumnInput);
            }

            return isValid;
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

        async handleProcess(e) {
            e.preventDefault();


            if (this.data.processing) {

                return;
            }

            if (!this.validateInputs()) {
                this.showError('请填写所有必填项');
                return;
            }

            this.setProcessing(true);

            try {
                const requestData = this.getRequestData();

                this.showProcessing('正在处理Excel文件，请稍候...');

                const response = await this.callProcessAPI(requestData);
                const responseData = await this.handleProcessResponse(response);

                if (responseData.code === 0) {
                    await this.handleBase64FileDownload(responseData.data.base64_content);
                    this.updateDataCards(responseData.data);
                    this.showSuccess('分组汇总已完成并自动下载Excel文件');
                } else {
                    this.showError(responseData.msg || '分组汇总失败，请检查后再进行操作');
                }
            } catch (error) {
                console.error('处理失败:', error);
                this.showError(`处理失败: ${error.message}`);
            } finally {
                this.setProcessing(false);
            }
        },

        getRequestData() {
            const keepColumnsStr = this.elements.keepColumnsInput ? this.elements.keepColumnsInput.value.trim() : '';
            const keepColumns = keepColumnsStr.split(',').map(col => col.trim()).filter(col => col);

            return {
                base_path: this.elements.basePathInput ? this.elements.basePathInput.value.trim() : '',
                match_column: this.elements.matchColumnInput ? this.elements.matchColumnInput.value.trim() : '',
                match_value: this.elements.matchValueInput ? this.elements.matchValueInput.value.trim() : '',
                keep_columns: keepColumns,
                sum_column: this.elements.sumColumnInput ? this.elements.sumColumnInput.value.trim() : ''
            };
        },

        async callProcessAPI(requestData) {
            this.showButtonLoading(this.elements.processBtn, '正在处理...');

            try {
                const response = await fetch(this.config.api.process, {
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
                        // 忽略JSON解析错误
                    }
                    throw new Error(errorMsg);
                }

                return response;
            } catch (error) {
                console.error('API请求错误:', error);
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    throw new Error('网络连接失败，请检查网络连接');
                }
                throw error;
            } finally {
                this.hideButtonLoading(this.elements.processBtn);
            }
        },

        async handleProcessResponse(response) {
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const responseData = await response.json();
                return responseData;
            } else {
                throw new Error('未知的响应类型');
            }
        },

        async handleBase64FileDownload(base64Content) {
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
                a.download = `${this.getCurrentMonthDayString()}分组汇总表.xlsx`;
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

        updateDataCards(data) {
            // 处理行数
            if (this.elements.dataRow) {
                this.elements.dataRow.textContent = data.total_count || 0;
            }

            // 处理文件数量
            if (this.elements.dataFile) {
                const totalFiles = (data.xlsx_count || 0) + (data.xls_count || 0);
                this.elements.dataFile.textContent = totalFiles;
            }

            // 跳过文件数量
            if (this.elements.dataSkip) {
                this.elements.dataSkip.textContent = data.skipped || 0;
            }

            // 求和汇总
            if (this.elements.dataSum) {
                const sumValue = data.total_all_num || 0;
                this.elements.dataSum.textContent = sumValue.toLocaleString('zh-CN');
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

            if (this.elements.processBtn) {
                this.elements.processBtn.disabled = isProcessing;
            }
        },

        updateUIState() {
            this.setProcessing(this.data.processing);
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
            if (this.elements.basePathInput) this.elements.basePathInput.value = 'E:/excel_files';
            if (this.elements.matchColumnInput) this.elements.matchColumnInput.value = 'A';
            if (this.elements.matchValueInput) this.elements.matchValueInput.value = '';
            if (this.elements.keepColumnsInput) this.elements.keepColumnsInput.value = 'B,C';
            if (this.elements.sumColumnInput) this.elements.sumColumnInput.value = 'D';

            this.initResponseContainer();

            this.updateDataCards({
                total_count: 0,
                xlsx_count: 0,
                xls_count: 0,
                skipped: 0,
                total_all_num: 0
            });
        },

        destroy() {
            if (this.elements.processBtn) {
                this.elements.processBtn.replaceWith(this.elements.processBtn.cloneNode(true));
            }

            this.data.initialized = false;
        }
    };

    window.ExcelSalesModule = ExcelSalesModule;
})();

function initexcel_sales(container) {
    if (typeof window.ExcelSalesModule !== 'undefined' && !window.ExcelSalesModule.data.initialized) {
        window.ExcelSalesModule.init(container);
    } else if (window.ExcelSalesModule.data.initialized) {
        console.log('Excel分组汇总模块已初始化，跳过重复初始化');
    } else {
        console.error('ExcelSalesModule未定义，请确保excel_sales_module_fixed.js已正确加载');
    }
}
