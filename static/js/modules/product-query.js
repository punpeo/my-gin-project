/**
 * 商品查询模块 - 方案二（改造版）：移除查询成功/失败消息弹出，仅保留loading提示
 * 按钮type="button"绑定click事件，彻底规避表单默认行为，稳定性最高
 * 核心修改：删除查询操作的success/error消息提示，仅保留loading状态
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
                this._bindEvents();
                this._initPagination();
                this._initModal();

                console.log('ProductQueryModule 初始化成功（方案二改造版：移除查询消息提示）');
            } catch (e) {
                console.error('ProductQueryModule 初始化失败：', e.message);
                this.initialized = false;
            }
        },

        _cacheDOM: function () {
            const c = this.container;
            this.el = {
                // 查询表单核心元素
                queryForm: c.querySelector('#query-form'),
                inputBarCode: c.querySelector('#input-barCode'),
                inputBusinessCode: c.querySelector('#input-businessCode'),
                btnQuery: c.querySelector('#btn-query'), // 重点：缓存查询按钮
                // 消息提示
                responseContainer: c.querySelector('#query-response-container'),
                // 表格相关
                tableBody: c.querySelector('#table-body'),
                tableEmpty: c.querySelector('#table-empty'),
                checkAll: c.querySelector('#check-all'),
                // 分页相关
                selectPageSize: c.querySelector('#select-pageSize'),
                totalCount: c.querySelector('#total-count'),
                currentPage: c.querySelector('#current-page'),
                totalPage: c.querySelector('#total-page'),
                btnPrevPage: c.querySelector('#btn-prevPage'),
                btnNextPage: c.querySelector('#btn-nextPage'),
                // 工具栏
                btnAdd: c.querySelector('#btn-add'),
                btnImport: c.querySelector('#btn-import'),
                // 弹窗相关
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
                { key: 'selectPageSize', name: '页数选择器#select-pageSize' },
                { key: 'tableBody', name: '表格主体#table-body' }
            ];
            const missing = [];
            coreElements.forEach(item => {
                if (!this.el[item.key]) missing.push(item.name);
            });
            if (missing.length > 0) {
                throw new Error(`核心DOM元素缺失：${missing.join('、')}，请检查HTML结构`);
            }
        },

        // 绑定事件：核心 - 按钮click事件，无默认行为干扰
        _bindEvents: function () {
            const el = this.el;
            const that = this;

            // 核心：查询按钮直接绑定click事件
            el.btnQuery.addEventListener('click', function () {
                that._handleQuery();
            });

            // 页数选择change事件（正常保留，切换条数重新查询）
            el.selectPageSize.addEventListener('change', function () {
                that.state.pageSize = Number(this.value);
                that.state.currentPage = 1;
                that._handleQuery();
            });

            // 上一页/下一页
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

            // 工具栏：新增商品
            el.btnAdd.addEventListener('click', () => {
                that._openAddModal();
            });

            // 工具栏：导入Excel
            el.btnImport.addEventListener('click', () => {
                that._openImportModal();
            });

            // 新增弹窗：关闭/取消/提交
            el.modalCloseAdd.addEventListener('click', () => that._closeAddModal());
            el.btnCancelAdd.addEventListener('click', () => that._closeAddModal());
            el.formAdd.addEventListener('submit', function (e) {
                e.preventDefault();
                that._handleAddOrEdit();
            });

            // 导入弹窗：关闭/取消/文件选择/提交
            el.modalCloseImport.addEventListener('click', () => that._closeImportModal());
            el.btnCancelImport.addEventListener('click', () => that._closeImportModal());
            el.inputExcelFile.addEventListener('change', function () {
                that._handleFileSelect(this.files);
            });
            el.btnSubmitImport.addEventListener('click', () => that._handleImport());

            // 表格行事件委托（编辑/复制）
            el.tableBody.addEventListener('click', function (e) {
                const target = e.target;
                const editBtn = target.closest('.btn-edit');
                if (editBtn) {
                    const barCode = editBtn.dataset.code;
                    that._handleEdit(barCode);
                    return;
                }
                const copyBtn = target.closest('.btn-copy');
                if (copyBtn) {
                    const barCode = copyBtn.dataset.code;
                    that._handleCopy(barCode);
                    return;
                }
            });

            // 全选复选框
            el.checkAll.addEventListener('change', function () {
                const checkItems = el.tableBody.querySelectorAll('.check-item');
                checkItems.forEach(item => item.checked = this.checked);
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

        // 核心改造：_handleQuery 移除查询success/error消息提示，仅保留loading
        _handleQuery: async function () {
            try {
                const { valid, errorInput } = this._validateQueryForm();
                if (!valid) {
                    errorInput && errorInput.focus();
                    return;
                }

                const barCodes = this.el.inputBarCode.value.trim()
                    ? this.el.inputBarCode.value.trim().split(',').map(item => item.trim())
                    : [];
                const businessCodes = this.el.inputBusinessCode.value.trim()
                    ? this.el.inputBusinessCode.value.trim().split(',').map(item => item.trim())
                    : [];

                this.state.barCodes = barCodes;
                this.state.businessCodes = businessCodes;

                // 仅保留：查询过程中显示loading提示
                this._showMessage('loading', '正在查询数据，请稍候...');

                // 发起查询请求
                const res = await this.queryProduct({
                    currentPage: this.state.currentPage,
                    pageSize: this.state.pageSize,
                    barCodes: this.state.barCodes,
                    businessCodes: this.state.businessCodes
                });

                // 核心修改1：查询完成后立即清空loading提示（不显示成功消息）
                this._clearMessage();
                
                // 处理响应，仅渲染表格和更新分页，无任何弹窗提示
                if (res.code === 0) {
                    const { list, total } = res.data;
                    this.state.total = total;
                    this._renderTable(list);
                    this._updatePaginationUI();
                    // 移除：查询成功的消息提示
                } else {
                    // 移除：查询失败的消息提示，仅控制台打印错误（便于调试）
                    console.warn('查询接口返回失败：', res.msg || '未知错误');
                }
            } catch (e) {
                // 核心修改2：异常时立即清空loading提示，仅控制台打印错误
                this._clearMessage();
                console.error('查询异常：', e.message);
                // 移除：查询异常的消息提示
            }
        },

        _validateQueryForm: function () {
            const barCodeVal = this.el.inputBarCode.value.trim();
            const businessCodeVal = this.el.inputBusinessCode.value.trim();

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
                this._setFormInvalid(this.el.inputAddBarCode, '商品条码为必填项，且必须是13位数字');
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
            const invalidInputs = form.querySelectorAll('.is-invalid');
            invalidInputs.forEach(input => input.classList.remove('is-invalid'));
            const errorTexts = form.querySelectorAll('.invalid-feedback');
            errorTexts.forEach(el => el.textContent = '');
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
            const fileExt = file.name.split('.').pop().toLowerCase();
            const maxSize = 2 * 1024 * 1024;

            if (fileExt !== 'xlsx') {
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

                let res;
                if (this.state.editId) {
                    res = await this.editProduct({ id: this.state.editId, ...productData });
                } else {
                    res = await this.createProduct(productData);
                }

                this._clearMessage();
                if (res.code === 0) {
                    const msg = this.state.editId ? '修改商品成功' : '新增商品成功';
                    this._showMessage('success', msg);
                    this._closeAddModal();
                    this._handleQuery();
                } else {
                    this._showMessage('error', `${this.state.editId ? '修改失败' : '新增失败'}：${res.msg || '未知错误'}`);
                }
            } catch (e) {
                this._clearMessage();
                const msg = this.state.editId ? '修改商品异常' : '新增商品异常';
                this._showMessage('error', `${msg}：${e.message}`);
                console.error(msg, e);
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
                console.error('Excel导入失败：', e);
            } finally {
                this.el.btnSubmitImport.disabled = false;
            }
        },

        _handleEdit: function (barCode) {
            const row = this.el.tableBody.querySelector(`.btn-edit[data-code="${barCode}"]`).closest('.table-item');
            if (!row) return;

            const cols = row.querySelectorAll('.table-col');
            this.state.editId = row.dataset.id;
            this.el.inputAddShop.value = cols[1].textContent.trim();
            this.el.inputAddProductName.value = cols[2].textContent.trim();
            this.el.inputAddBarCode.value = cols[3].textContent.trim();
            this.el.inputAddBusinessCode.value = cols[4].textContent.trim();
            this.el.inputAddMerchantCode.value = cols[5].textContent.trim();

            this._clearFormValidateStyle(this.el.formAdd);
            this.el.modalAdd.querySelector('.modal-title').innerHTML = '<i class="fas fa-edit"></i> 编辑商品';
            this.el.modalMask.style.display = 'block';
            this.el.modalAdd.style.display = 'block';
            this.el.inputAddShop.focus();
        },

        _handleCopy: function (barCode) {
            const row = this.el.tableBody.querySelector(`.btn-copy[data-code="${barCode}"]`).closest('.table-item');
            if (!row) return;

            const cols = row.querySelectorAll('.table-col');
            this.state.editId = null;
            this.el.inputAddShop.value = cols[1].textContent.trim();
            this.el.inputAddProductName.value = cols[2].textContent.trim();
            this.el.inputAddBarCode.value = '';
            this.el.inputAddBusinessCode.value = cols[4].textContent.trim();
            this.el.inputAddMerchantCode.value = cols[5].textContent.trim();

            this._clearFormValidateStyle(this.el.formAdd);
            this.el.modalAdd.querySelector('.modal-title').innerHTML = '<i class="fas fa-plus"></i> 新增商品（复制）';
            this.el.modalMask.style.display = 'block';
            this.el.modalAdd.style.display = 'block';
            this.el.inputAddShop.focus();
        },

        _renderTable: function (list) {
            const el = this.el;
            el.tableBody.innerHTML = '';

            if (!Array.isArray(list) || list.length === 0) {
                el.tableEmpty.classList.add('show');
                return;
            }

            el.tableEmpty.classList.remove('show');
            list.forEach(item => {
                const row = document.createElement('div');
                row.className = 'table-item';
                row.dataset.id = item.id;
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
                    <div class="table-col col-operate">
                        <button class="btn btn-sm btn-edit" data-code="${item.bar_code}">编辑</button>
                        <button class="btn btn-sm btn-copy" data-code="${item.bar_code}">复制</button>
                    </div>
                `;
                el.tableBody.appendChild(row);
            });
        },

        _updatePaginationUI: function () {
            const el = this.el;
            const total = this.state.total;
            const pageSize = this.state.pageSize;
            const currentPage = this.state.currentPage;
            const totalPage = Math.ceil(total / pageSize) || 1;

            el.totalCount.textContent = total;
            el.currentPage.textContent = currentPage;
            el.totalPage.textContent = totalPage;

            el.btnPrevPage.disabled = currentPage <= 1;
            el.btnNextPage.disabled = currentPage >= totalPage;
        },

        // 保留消息显示方法（供loading、表单校验、新增/导入等功能使用）
        _showMessage: function (type, msg) {
            const container = this.el.responseContainer;
            container.innerHTML = '';
            const msgEl = document.createElement('div');
            msgEl.className = `query-response-content ${type}`;

            if (type === 'loading') {
                msgEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${msg}`;
            } else {
                const iconMap = {
                    success: 'fas fa-check-circle',
                    error: 'fas fa-exclamation-circle',
                    info: 'fas fa-info-circle'
                };
                msgEl.innerHTML = `<i class="${iconMap[type] || 'fas fa-info-circle'}"></i> ${msg}`;
            }
            container.appendChild(msgEl);

            if (type !== 'loading') {
                setTimeout(() => {
                    container.innerHTML = '';
                }, 3000);
            }
        },

        // 新增：清空消息提示的工具方法（查询完成后立即调用）
        _clearMessage: function () {
            const container = this.el.responseContainer;
            container.innerHTML = '';
        },

        // 后端接口请求方法
        createProduct: async function (productData) {
            const res = await fetch(`${this.apiBase}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            return await res.json();
        },

        editProduct: async function (productData) {
            const res = await fetch(`${this.apiBase}/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            return await res.json();
        },

        importExcel: async function (formData) {
            const res = await fetch(`${this.apiBase}/import-excel`, {
                method: 'POST',
                body: formData
            });
            return await res.json();
        },

        queryProduct: async function (queryParams) {
            const res = await fetch(`${this.apiBase}/all-with-page`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryParams)
            });
            return await res.json();
        }
    };

    window.ProductQueryModule = ProductQueryModule;

})();

// 模块初始化入口函数（与原方案一致，无需修改）
function initproduct_query(container) {
    let containerEl;
    if (typeof container === 'string') {
        containerEl = document.querySelector(container);
    } else if (container instanceof HTMLElement) {
        containerEl = container;
    } else {
        console.error('initproduct_query 失败：容器参数无效');
        return;
    }

    if (typeof window.ProductQueryModule === 'undefined') {
        console.error('ProductQueryModule未定义，请确保product-query.js已正确加载');
    } else if (window.ProductQueryModule.initialized) {
        console.log('ProductQueryModule 已初始化，跳过重复初始化');
    } else {
        window.ProductQueryModule.init(containerEl);
    }
}