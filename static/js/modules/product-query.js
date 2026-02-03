/**
 * 商品查询模块 - 最终完整版（行操作UI重设计）
 * 核心功能：1.表格行编辑/复制按钮UI全新设计（整洁美观、清晰区分）2.输入框右侧清除叉号 3.表格复制编码自动解析
 * 4.双复制按钮（顶部批量+行内单行）5.仅查询loading提示 6.防表单冲突 7.完整业务功能（增删改查/导入/分页）
 */
(function () {
    if (window.ProductQueryModule && window.ProductQueryModule.initialized) {
        console.warn('ProductQueryModule已经初始化，跳过重复定义');
        return;
    }

    const ProductQueryModule = {
        initialized: false,
        container: null,
        state: {
            currentPage: 1,
            pageSize: 10,
            barCodes: [],
            businessCodes: [],
            total: 0,
            editId: null
        },
        el: {},
        apiBase: '/api/v2/product',

        init: function (container) {
            try {
                if (!(container instanceof HTMLElement)) {
                    throw new Error('初始化失败：容器必须是有效的HTMLElement');
                }
                this.container = container;
                this.initialized = true;

                this._cacheDOM();
                this._checkDOMValid();
                this._createClearIcons();
                this._bindEvents();
                this._initPagination();
                this._initModal();
                this._updateBatchCopyBtnStatus();
                this._updateClearIconStatus();

                console.log('ProductQueryModule 初始化成功（行操作UI重设计版）');
            } catch (e) {
                console.error('ProductQueryModule 初始化失败：', e.message);
                this.initialized = false;
            }
        },

        _cacheDOM: function () {
            const c = this.container;
            this.el = {
                inputBarCode: c.querySelector('#input-barCode'),
                inputBusinessCode: c.querySelector('#input-businessCode'),
                btnQuery: c.querySelector('#btn-query'),
                responseContainer: c.querySelector('#query-response-container'),
                tableBody: c.querySelector('#table-body'),
                tableEmpty: c.querySelector('#table-empty'),
                checkAll: c.querySelector('#check-all'),
                selectPageSize: c.querySelector('#select-pageSize'),
                totalCount: c.querySelector('#total-count'),
                currentPage: c.querySelector('#current-page'),
                totalPage: c.querySelector('#total-page'),
                btnPrevPage: c.querySelector('#btn-prevPage'),
                btnNextPage: c.querySelector('#btn-nextPage'),
                btnAdd: c.querySelector('#btn-add'),
                btnImport: c.querySelector('#btn-import'),
                btnCopyBatch: c.querySelector('#btn-copy-batch'),
                modalMask: c.querySelector('#modal-mask'),
                modalAdd: c.querySelector('#modal-add-product'),
                formAdd: c.querySelector('#form-add-product'),
                inputAddShop: c.querySelector('#input-add-shop'),
                inputAddProductName: c.querySelector('#input-add-productName'),
                inputAddBarCode: c.querySelector('#input-add-barCode'),
                inputAddBusinessCode: c.querySelector('#input-add-businessCode'),
                inputAddMerchantCode: c.querySelector('#input-add-merchantCode'),
                modalCloseAdd: c.querySelector('#modal-close-add'),
                btnCancelAdd: c.querySelector('#btn-cancel-add'),
                btnSubmitAdd: c.querySelector('#btn-submit-add'),
                modalImport: c.querySelector('#modal-import-excel'),
                inputExcelFile: c.querySelector('#input-excelFile'),
                textFileName: c.querySelector('#text-fileName'),
                modalCloseImport: c.querySelector('#modal-close-import'),
                btnCancelImport: c.querySelector('#btn-cancel-import'),
                btnSubmitImport: c.querySelector('#btn-submit-import'),
            };
        },

        _checkDOMValid: function () {
            const coreElements = [
                { key: 'btnQuery', name: '查询按钮#btn-query' },
                { key: 'inputBarCode', name: '条码输入框#input-barCode' },
                { key: 'inputBusinessCode', name: '事业部编码输入框#input-businessCode' },
                { key: 'tableBody', name: '表格主体#table-body' },
                { key: 'btnCopyBatch', name: '批量复制按钮#btn-copy-batch' }
            ];
            const missing = [];
            coreElements.forEach(item => {
                if (!this.el[item.key]) missing.push(item.name);
            });
            if (missing.length > 0) {
                throw new Error(`核心DOM元素缺失：${missing.join('、')}，请检查HTML结构`);
            }
        },

        _createClearIcons: function () {
            const createIcon = (input) => {
                if (input.nextElementSibling?.classList.contains('input-clear-icon')) return;
                const icon = document.createElement('i');
                icon.className = 'fas fa-times input-clear-icon';
                Object.assign(icon.style, {
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#999',
                    fontSize: '14px',
                    display: 'none',
                    zIndex: '10'
                });
                if (input.parentElement) {
                    input.parentElement.style.position = 'relative';
                    input.parentElement.style.paddingRight = '24px';
                }
                input.parentNode.insertBefore(icon, input.nextSibling);
                icon.addEventListener('click', () => {
                    input.value = '';
                    this._updateClearIconStatus();
                });
            };
            createIcon(this.el.inputBarCode);
            createIcon(this.el.inputBusinessCode);
        },

        _updateClearIconStatus: function () {
            const updateSingleIcon = (input) => {
                const icon = input.nextElementSibling;
                if (icon?.classList.contains('input-clear-icon')) {
                    icon.style.display = input.value.trim() ? 'block' : 'none';
                }
            };
            updateSingleIcon(this.el.inputBarCode);
            updateSingleIcon(this.el.inputBusinessCode);
        },

        _parseCodeText: function (text) {
            if (!text) return '';
            return text
                .replace(/[\n\r\t\s]+/g, ',')
                .replace(/,+/g, ',')
                .replace(/^,|,$/g, '');
        },

        _bindEvents: function () {
            const el = this.el;
            const that = this;

            el.inputBarCode.addEventListener('paste', function (e) {
                e.preventDefault();
                const pasteText = e.clipboardData?.getData('text') || '';
                this.value = that._parseCodeText(pasteText);
                that._updateClearIconStatus();
            });
            el.inputBarCode.addEventListener('input', () => that._updateClearIconStatus());

            el.inputBusinessCode.addEventListener('paste', function (e) {
                e.preventDefault();
                const pasteText = e.clipboardData?.getData('text') || '';
                this.value = that._parseCodeText(pasteText);
                that._updateClearIconStatus();
            });
            el.inputBusinessCode.addEventListener('input', () => that._updateClearIconStatus());

            el.btnQuery.addEventListener('click', () => that._handleQuery());
            el.selectPageSize.addEventListener('change', function () {
                that.state.pageSize = Number(this.value);
                that.state.currentPage = 1;
                that._handleQuery();
            });
            el.btnPrevPage.addEventListener('click', () => {
                if (that.state.currentPage > 1) {
                    that.state.currentPage--;
                    that._handleQuery();
                }
            });
            el.btnNextPage.addEventListener('click', () => {
                const totalPage = Math.ceil(that.state.total / that.state.pageSize) || 1;
                if (that.state.currentPage < totalPage) {
                    that.state.currentPage++;
                    that._handleQuery();
                }
            });

            el.btnAdd.addEventListener('click', () => that._openAddModal());
            el.btnImport.addEventListener('click', () => that._openImportModal());
            el.btnCopyBatch.addEventListener('click', () => that._handleBatchCopy());

            el.modalCloseAdd.addEventListener('click', () => that._closeAddModal());
            el.btnCancelAdd.addEventListener('click', () => that._closeAddModal());
            el.formAdd.addEventListener('submit', function (e) {
                e.preventDefault();
                that._handleAddOrEdit();
            });

            el.modalCloseImport.addEventListener('click', () => that._closeImportModal());
            el.btnCancelImport.addEventListener('click', () => that._closeImportModal());
            el.inputExcelFile.addEventListener('change', (e) => that._handleFileSelect(e.target.files));
            el.btnSubmitImport.addEventListener('click', () => that._handleImport());

            el.tableBody.addEventListener('click', function (e) {
                const target = e.target;
                const editBtn = target.closest('.btn-row-edit');
                const copyBtn = target.closest('.btn-row-copy');
                if (editBtn) {
                    that._handleEdit(editBtn.dataset.code);
                    return;
                }
                if (copyBtn) {
                    that._handleSingleCopy(copyBtn.dataset.code);
                    return;
                }
            });

            el.checkAll.addEventListener('change', function () {
                const checkItems = el.tableBody.querySelectorAll('.check-item');
                checkItems.forEach(item => item.checked = this.checked);
                that._updateBatchCopyBtnStatus();
            });
            el.tableBody.addEventListener('change', function (e) {
                if (e.target.classList.contains('check-item')) {
                    that._updateBatchCopyBtnStatus();
                    const allChecked = Array.from(el.tableBody.querySelectorAll('.check-item')).every(item => item.checked);
                    el.checkAll.checked = allChecked;
                }
            });
        },

        _initPagination: function () {
            this.el.selectPageSize.value = this.state.pageSize;
            this._updatePaginationUI();
        },

        _initModal: function () {
            this.el.modalMask.style.display = 'none';
            this.el.modalAdd.style.display = 'none';
            this.el.modalImport.style.display = 'none';
        },

        _updateBatchCopyBtnStatus: function () {
            const checkItems = this.el.tableBody.querySelectorAll('.check-item');
            this.el.btnCopyBatch.disabled = !Array.from(checkItems).some(item => item.checked);
        },

        _formatTableData: function (rowData) {
            return [
                rowData.shop || '',
                rowData.product_name || '',
                rowData.bar_code || '',
                rowData.business_code || '',
                rowData.merchant_code || ''
            ].join('\t');
        },

        _copyToClipboard: async function (text) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                console.error('复制失败：', e);
            }
        },

        _handleQuery: async function () {
            try {
                const { valid, errorInput } = this._validateQueryForm();
                if (!valid) {
                    errorInput?.focus();
                    return;
                }
                const barCodes = this.el.inputBarCode.value.trim().split(',').map(item => item.trim()).filter(Boolean);
                const businessCodes = this.el.inputBusinessCode.value.trim().split(',').map(item => item.trim()).filter(Boolean);
                this.state.barCodes = barCodes;
                this.state.businessCodes = businessCodes;

                this._showMessage('loading', '正在查询数据，请稍候...');
                const res = await this.queryProduct({
                    currentPage: this.state.currentPage,
                    pageSize: this.state.pageSize,
                    barCodes,
                    businessCodes
                });

                this._clearMessage();
                if (res.code === 0) {
                    this.state.total = res.data.total;
                    this._renderTable(res.data.list);
                    this._updatePaginationUI();
                } else {
                    console.warn('查询失败：', res.msg);
                }
            } catch (e) {
                this._clearMessage();
                console.error('查询异常：', e);
            } finally {
                this._updateBatchCopyBtnStatus();
            }
        },

        _validateQueryForm: function () {
            const barCodeVal = this.el.inputBarCode.value.trim();
            if (barCodeVal) {
                const barCodes = barCodeVal.split(',').map(item => item.trim());
                for (const code of barCodes) {
                    if (!/^\d{13}$/.test(code)) {
                        this._showMessage('error', '❌ 商品条码必须为13位纯数字，多个用英文逗号分隔');
                        return { valid: false, errorInput: this.el.inputBarCode };
                    }
                }
            }
            return { valid: true, errorInput: null };
        },

        _handleBatchCopy: async function () {
            const checkItems = this.el.tableBody.querySelectorAll('.check-item:checked');
            if (!checkItems.length) return;
            const copyData = [];
            checkItems.forEach(item => {
                const row = item.closest('.table-item');
                copyData.push(this._formatTableData({
                    shop: row.querySelector('.col-shop').textContent.trim(),
                    product_name: row.querySelector('.col-prod-name').textContent.trim(),
                    bar_code: row.querySelector('.col-barcode').textContent.trim(),
                    business_code: row.querySelector('.col-business-code').textContent.trim(),
                    merchant_code: row.querySelector('.col-merchant-code').textContent.trim()
                }));
            });
            await this._copyToClipboard(copyData.join('\n'));
        },

        _handleSingleCopy: async function (barCode) {
            const copyBtn = this.el.tableBody.querySelector(`.btn-row-copy[data-code="${barCode}"]`);
            if (!copyBtn) return;
            const row = copyBtn.closest('.table-item');
            const copyText = this._formatTableData({
                shop: row.querySelector('.col-shop').textContent.trim(),
                product_name: row.querySelector('.col-prod-name').textContent.trim(),
                bar_code: row.querySelector('.col-barcode').textContent.trim(),
                business_code: row.querySelector('.col-business-code').textContent.trim(),
                merchant_code: row.querySelector('.col-merchant-code').textContent.trim()
            });
            await this._copyToClipboard(copyText);
        },

        _validateAddEditForm: function () {
            const shop = this.el.inputAddShop.value.trim();
            const productName = this.el.inputAddProductName.value.trim();
            const barCode = this.el.inputAddBarCode.value.trim();
            const businessCode = this.el.inputAddBusinessCode.value.trim();
            const merchantCode = this.el.inputAddMerchantCode.value.trim();

            this._clearFormValidateStyle(this.el.formAdd);
            if (!shop) {
                this._setFormInvalid(this.el.inputAddShop, '店铺名称为必填项');
                return false;
            }
            if (!productName) {
                this._setFormInvalid(this.el.inputAddProductName, '商品名称为必填项');
                return false;
            }
            if (!barCode || !/^\d{13}$/.test(barCode)) {
                this._setFormInvalid(this.el.inputAddBarCode, '商品条码为必填项，且必须是13位纯数字');
                return false;
            }
            if (!businessCode) {
                this._setFormInvalid(this.el.inputAddBusinessCode, '事业部编码为必填项');
                return false;
            }
            if (!merchantCode) {
                this._setFormInvalid(this.el.inputAddMerchantCode, '商家商品标识为必填项');
                return false;
            }
            return true;
        },

        _setFormInvalid: function (input, msg) {
            input.classList.add('is-invalid');
            const errorEl = input.nextElementSibling;
            if (errorEl && errorEl.classList.contains('invalid-feedback')) {
                errorEl.textContent = msg;
            }
        },

        _clearFormValidateStyle: function (form) {
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        },

        _openAddModal: function () {
            this.state.editId = null;
            this.el.formAdd.reset();
            this._clearFormValidateStyle(this.el.formAdd);
            this.el.modalAdd.querySelector('.modal-title').innerHTML = '<i class="fas fa-plus"></i> 新增商品';
            this.el.modalMask.style.display = 'block';
            this.el.modalAdd.style.display = 'block';
            this.el.inputAddShop.focus();
        },

        _closeAddModal: function () {
            this.el.modalMask.style.display = 'none';
            this.el.modalAdd.style.display = 'none';
            this._clearFormValidateStyle(this.el.formAdd);
        },

        _openImportModal: function () {
            this.el.inputExcelFile.value = '';
            this.el.textFileName.textContent = '未选择任何文件';
            this.el.btnSubmitImport.disabled = true;
            this.el.modalMask.style.display = 'block';
            this.el.modalImport.style.display = 'block';
        },

        _closeImportModal: function () {
            this.el.modalMask.style.display = 'none';
            this.el.modalImport.style.display = 'none';
        },

        _handleFileSelect: function (files) {
            if (!files || files.length === 0) {
                this.el.textFileName.textContent = '未选择任何文件';
                this.el.btnSubmitImport.disabled = true;
                return;
            }
            const file = files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (ext !== 'xlsx') {
                this._showMessage('error', '仅支持.xlsx格式的Excel文件');
                this.el.textFileName.textContent = '未选择任何文件';
                this.el.btnSubmitImport.disabled = true;
                return;
            }
            if (file.size > maxSize) {
                this._showMessage('error', '文件大小不能超过2MB');
                this.el.textFileName.textContent = '未选择任何文件';
                this.el.btnSubmitImport.disabled = true;
                return;
            }
            this.el.textFileName.textContent = file.name;
            this.el.btnSubmitImport.disabled = false;
        },

        _handleAddOrEdit: async function () {
            try {
                if (!this._validateAddEditForm()) return;
                const productData = {
                    shop: this.el.inputAddShop.value.trim(),
                    product_name: this.el.inputAddProductName.value.trim(),
                    bar_code: this.el.inputAddBarCode.value.trim(),
                    business_code: this.el.inputAddBusinessCode.value.trim(),
                    merchant_code: this.el.inputAddMerchantCode.value.trim()
                };
                this.el.btnSubmitAdd.disabled = true;
                this._showMessage('loading', this.state.editId ? '正在修改商品...' : '正在新增商品...');
                const res = this.state.editId 
                    ? await this.editProduct({ id: this.state.editId, ...productData })
                    : await this.createProduct(productData);

                this._clearMessage();
                if (res.code === 0) {
                    this._showMessage('success', this.state.editId ? '修改商品成功' : '新增商品成功');
                    this._closeAddModal();
                    this._handleQuery();
                } else {
                    this._showMessage('error', `${this.state.editId ? '修改失败' : '新增失败'}：${res.msg || '未知错误'}`);
                }
            } catch (e) {
                this._clearMessage();
                this._showMessage('error', `${this.state.editId ? '修改商品异常' : '新增商品异常'}：${e.message}`);
                console.error(e);
            } finally {
                this.el.btnSubmitAdd.disabled = false;
            }
        },

        _handleImport: async function () {
            try {
                const file = this.el.inputExcelFile.files[0];
                if (!file) {
                    this._showMessage('error', '请选择要导入的Excel文件');
                    return;
                }
                const formData = new FormData();
                formData.append('file', file);
                this.el.btnSubmitImport.disabled = true;
                this._showMessage('loading', '正在导入数据，请稍候（请勿刷新页面）...');
                const res = await this.importExcel(formData);

                this._clearMessage();
                if (res.code === 0) {
                    this._showMessage('success', 'Excel导入成功');
                    this._closeImportModal();
                    this._handleQuery();
                } else {
                    this._showMessage('error', `导入失败：${res.msg || '未知错误'}`);
                }
            } catch (e) {
                this._clearMessage();
                this._showMessage('error', `导入异常：${e.message}`);
                console.error(e);
            } finally {
                this.el.btnSubmitImport.disabled = false;
            }
        },

        _handleEdit: function (barCode) {
            const row = this.el.tableBody.querySelector(`[data-code="${barCode}"]`).closest('.table-item');
            if (!row) return;
            this.state.editId = row.dataset.id;
            this.el.inputAddShop.value = row.querySelector('.col-shop').textContent.trim();
            this.el.inputAddProductName.value = row.querySelector('.col-prod-name').textContent.trim();
            this.el.inputAddBarCode.value = row.querySelector('.col-barcode').textContent.trim();
            this.el.inputAddBusinessCode.value = row.querySelector('.col-business-code').textContent.trim();
            this.el.inputAddMerchantCode.value = row.querySelector('.col-merchant-code').textContent.trim();
            this._clearFormValidateStyle(this.el.formAdd);
            this.el.modalAdd.querySelector('.modal-title').innerHTML = '<i class="fas fa-edit"></i> 编辑商品';
            this.el.modalMask.style.display = 'block';
            this.el.modalAdd.style.display = 'block';
            this.el.inputAddShop.focus();
        },

        // 🔴 核心修改：表格行渲染 - 重设计编辑/复制按钮UI
        _renderTable: function (list) {
            const el = this.el;
            el.tableBody.innerHTML = '';
            el.checkAll.checked = false;

            if (!Array.isArray(list) || list.length === 0) {
                el.tableEmpty.classList.add('show');
                return;
            }
            el.tableEmpty.classList.remove('show');

            list.forEach(item => {
                const row = document.createElement('div');
                row.className = 'table-item';
                row.dataset.id = item.id;
                row.dataset.code = item.bar_code;
                // 重设计的操作列：编辑+复制按钮 差异化样式、整洁布局、hover交互
                row.innerHTML = `
                    <div class="table-col col-check">
                        <label class="check-box">
                            <input type="checkbox" class="check-item" value="${item.bar_code}">
                            <span class="check-square"></span>
                        </label>
                    </div>
                    <div class="table-col col-shop">${item.shop || ''}</div>
                    <div class="table-col col-prod-name">${item.product_name || ''}</div>
                    <div class="table-col col-barcode">${item.bar_code || ''}</div>
                    <div class="table-col col-business-code">${item.business_code || ''}</div>
                    <div class="table-col col-merchant-code">${item.merchant_code || ''}</div>
                    <div class="table-col col-operate" style="padding: 8px 0; text-align: center; min-width: 120px;">
                        <!-- 编辑按钮：主色+编辑图标+hover效果 -->
                        <button class="btn-row-edit" data-code="${item.bar_code}" style="
                            height: 28px;
                            padding: 0 12px;
                            margin-right: 8px;
                            border: none;
                            border-radius: 4px;
                            background: #409eff;
                            color: #fff;
                            font-size: 12px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                            transition: all 0.2s ease;
                        ">
                            <i class="fas fa-edit" style="font-size: 11px;"></i>
                            编辑
                        </button>
                        <!-- 复制按钮：中性色+复制图标+hover效果 -->
                        <button class="btn-row-copy" data-code="${item.bar_code}" style="
                            height: 28px;
                            padding: 0 12px;
                            border: none;
                            border-radius: 4px;
                            background: #f5f7fa;
                            color: #606266;
                            font-size: 12px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                            transition: all 0.2s ease;
                        ">
                            <i class="fas fa-copy" style="font-size: 11px;"></i>
                            复制
                        </button>
                    </div>
                `;
                // 为按钮添加hover样式（动态添加，避免行内样式重复）
                const editBtn = row.querySelector('.btn-row-edit');
                const copyBtn = row.querySelector('.btn-row-copy');
                editBtn.addEventListener('mouseenter', () => {
                    editBtn.style.background = '#66b1ff';
                    editBtn.style.transform = 'scale(1.05)';
                });
                editBtn.addEventListener('mouseleave', () => {
                    editBtn.style.background = '#409eff';
                    editBtn.style.transform = 'scale(1)';
                });
                copyBtn.addEventListener('mouseenter', () => {
                    copyBtn.style.background = '#e4e7ed';
                    copyBtn.style.transform = 'scale(1.05)';
                });
                copyBtn.addEventListener('mouseleave', () => {
                    copyBtn.style.background = '#f5f7fa';
                    copyBtn.style.transform = 'scale(1)';
                });
                el.tableBody.appendChild(row);
            });
        },

        _updatePaginationUI: function () {
            const el = this.el;
            const totalPage = Math.ceil(this.state.total / this.state.pageSize) || 1;
            el.totalCount.textContent = this.state.total;
            el.currentPage.textContent = this.state.currentPage;
            el.totalPage.textContent = totalPage;
            el.btnPrevPage.disabled = this.state.currentPage <= 1;
            el.btnNextPage.disabled = this.state.currentPage >= totalPage;
        },

        _showMessage: function (type, msg) {
            const container = this.el.responseContainer;
            container.innerHTML = '';
            const msgEl = document.createElement('div');
            msgEl.className = `query-response-content ${type}`;
            msgEl.innerHTML = type === 'loading' 
                ? `<i class="fas fa-spinner fa-spin"></i> ${msg}`
                : `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
            container.appendChild(msgEl);
            if (type !== 'loading') {
                setTimeout(() => container.innerHTML = '', 3000);
            }
        },

        _clearMessage: function () {
            this.el.responseContainer.innerHTML = '';
        },

        // 后端接口
        createProduct: async function (data) {
            return fetch(`${this.apiBase}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(res => res.json());
        },
        editProduct: async function (data) {
            return fetch(`${this.apiBase}/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(res => res.json());
        },
        importExcel: async function (formData) {
            return fetch(`${this.apiBase}/import-excel`, {
                method: 'POST',
                body: formData
            }).then(res => res.json());
        },
        queryProduct: async function (params) {
            return fetch(`${this.apiBase}/all-with-page`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            }).then(res => res.json());
        }
    };

    window.ProductQueryModule = ProductQueryModule;
})();

// 初始化入口
function initproduct_query(container) {
    let containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    if (!(containerEl instanceof HTMLElement)) {
        console.error('initproduct_query 失败：容器必须是有效的DOM元素或选择器');
        return;
    }
    if (window.ProductQueryModule && !window.ProductQueryModule.initialized) {
        window.ProductQueryModule.init(containerEl);
    }
}