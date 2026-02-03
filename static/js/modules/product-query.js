/**
 * 商品查询模块
 * 提供商品的查询、添加、修改、导入和复制功能
 * 后端接口包括：
 * 请求方法：POST
 * /api/v2/product/create
 * /api/v2/product/edit
 * /api/v2/product/import-excel
 * /api/v2/product/all-with-page ：
 *  请求参数（JSON）：
 * {
 *   "currentPage": 1,
 *   "pageSize": 10,
 *   "barCodes": ["1234567890123", "9876543210987"],
 *  "businessCodes": ["BUS123", "BUS456"]
 * }
 * 返回参数（JSON）：
 * {
 *   "code": 0,
 *   "msg": "成功",
 *   "data": {
 *    "list": [
 *     {
 *      "id": 1,
 *     "shop": "店铺A",
 *    "product_name": "商品名称",
 *    "bar_code": "1234567890123",
 */
class ProductQueryModule {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error('商品查询模块：未找到主容器，请检查 selector 是否正确');
      return;
    }

    this.pagination = { currentPage: 1, pageSize: 10, total: 0, totalPage: 1 };
    this.bindElements();
    this.bindEvents();
    this.queryProducts();
  }

  bindElements() {
    this.queryForm = document.getElementById('query-form');
    this.inputBarCode = document.getElementById('input-barCode');
    this.inputBusinessCode = document.getElementById('input-businessCode');
    this.btnQuery = document.getElementById('btn-query');
    this.queryResponseContainer = document.getElementById('query-response-container');
    this.tableBody = document.getElementById('table-body');
    this.tableEmpty = document.getElementById('table-empty');
    this.checkAll = document.getElementById('check-all');
    this.selectPageSize = document.getElementById('select-pageSize');
    this.totalCount = document.getElementById('total-count');
    this.currentPageEl = document.getElementById('current-page');
    this.totalPageEl = document.getElementById('total-page');
    this.btnPrevPage = document.getElementById('btn-prevPage');
    this.btnNextPage = document.getElementById('btn-nextPage');
    this.pageButtonsContainer = document.querySelector('.page-buttons');
    this.btnAdd = document.getElementById('btn-add');
    this.btnDelete = document.getElementById('btn-delete');
    this.btnImport = document.getElementById('btn-import');
    this.btnCopyBatch = document.getElementById('btn-copy-batch');
    this.modalMask = document.getElementById('modal-mask');
    this.modalAddProduct = document.getElementById('modal-add-product');
    this.formAddProduct = document.getElementById('form-add-product');
    this.inputAddShop = document.getElementById('input-add-shop');
    this.inputAddProductName = document.getElementById('input-add-productName');
    this.inputAddBarCode = document.getElementById('input-add-barCode');
    this.inputAddBusinessCode = document.getElementById('input-add-businessCode');
    this.inputAddMerchantCode = document.getElementById('input-add-merchantCode');
    this.modalCloseAdd = document.getElementById('modal-close-add');
    this.btnCancelAdd = document.getElementById('btn-cancel-add');
    this.btnSubmitAdd = document.getElementById('btn-submit-add');
    this.modalImportExcel = document.getElementById('modal-import-excel');
    this.inputExcelFile = document.getElementById('input-excelFile');
    this.textFileName = document.getElementById('text-fileName');
    this.modalCloseImport = document.getElementById('modal-close-import');
    this.btnCancelImport = document.getElementById('btn-cancel-import');
    this.btnSubmitImport = document.getElementById('btn-submit-import');
    this.editProductData = null;
  }

  bindEvents() {
    this.queryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.clearValidationStates();
      this.pagination.currentPage = 1;
      this.queryProducts();
    });

    [this.inputAddShop, this.inputAddProductName, this.inputAddBarCode,
    this.inputAddBusinessCode, this.inputAddMerchantCode].forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
    });

    this.selectPageSize.addEventListener('change', () => {
      this.pagination.pageSize = Number(this.selectPageSize.value);
      this.pagination.currentPage = 1;
      this.queryProducts();
    });

    this.btnPrevPage.addEventListener('click', () => {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--;
        this.queryProducts();
      }
    });

    this.btnNextPage.addEventListener('click', () => {
      if (this.pagination.currentPage < this.pagination.totalPage) {
        this.pagination.currentPage++;
        this.queryProducts();
      }
    });

    this.btnAdd.addEventListener('click', () => {
      this.resetAddForm();
      this.showModal(this.modalAddProduct);
      this.editProductData = null;
    });

    this.btnImport.addEventListener('click', () => {
      this.resetImportForm();
      this.showModal(this.modalImportExcel);
    });

    this.btnCopyBatch.addEventListener('click', () => this.batchCopyProductData());

    [this.modalCloseAdd, this.btnCancelAdd, this.modalCloseImport, this.btnCancelImport]
      .forEach(el => el.addEventListener('click', () => this.hideAllModal()));

    this.modalMask.addEventListener('click', (e) => {
      if (e.target === this.modalMask) this.hideAllModal();
    });

    this.btnSubmitAdd.addEventListener('click', (e) => {
      e.preventDefault();
      if (!this.validateAddForm()) return;
      this.editProductData ? this.editProduct() : this.addProduct();
    });

    this.inputExcelFile.addEventListener('change', () => {
      const file = this.inputExcelFile.files[0];
      if (file) {
        if (!file.name.endsWith('.xlsx')) {
          this.showMessage('仅支持 .xlsx 格式', 'error');
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          this.showMessage('文件超过 2MB', 'error');
          return;
        }
        this.textFileName.textContent = file.name;
        this.btnSubmitImport.disabled = false;
      } else {
        this.resetImportForm();
      }
    });

    this.btnSubmitImport.addEventListener('click', () => this.importExcel());

    this.checkAll.addEventListener('change', (e) => {
      this.tableBody.querySelectorAll('.col-check input[type="checkbox"]')
        .forEach(cb => cb.checked = e.target.checked);
    });
  }

  validateField(field) {
    const valid = field.checkValidity();
    if (valid) {
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
      const errId = `add-error-${field.name}`;
      const err = document.getElementById(errId);
      if (err) err.textContent = '';
    } else {
      field.classList.add('is-invalid');
      field.classList.remove('is-valid');
      const errId = `add-error-${field.name}`;
      const err = document.getElementById(errId);
      if (err) err.textContent = field.validationMessage || '此项为必填';
    }
    return valid;
  }

  clearValidationStates() {
    [this.inputAddShop, this.inputAddProductName, this.inputAddBarCode,
    this.inputAddBusinessCode, this.inputAddMerchantCode]
      .forEach(f => {
        f.classList.remove('is-invalid', 'is-valid');
        const err = document.getElementById(`add-error-${f.name}`);
        if (err) err.textContent = '';
      });
  }

  validateAddForm() {
    return [this.inputAddShop, this.inputAddProductName, this.inputAddBarCode,
    this.inputAddBusinessCode, this.inputAddMerchantCode]
      .every(f => this.validateField(f));
  }

  parseInputToArray(value) {
    return value ? value.replace(/\s+/g, '').split(',').filter(Boolean) : [];
  }

  buildQueryParams() {
    return {
      currentPage: this.pagination.currentPage,
      pageSize: this.pagination.pageSize,
      barCodes: this.parseInputToArray(this.inputBarCode.value),
      businessCodes: this.parseInputToArray(this.inputBusinessCode.value)
    };
  }

  async queryProducts() {
    try {
      this.setLoading(true);
      const res = await fetch('/api/v2/product/all-with-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(this.buildQueryParams())
      });
      const data = await res.json();
      if (data.code === 0 || data.code === 200) {
        this.renderProductList(data.data?.list || []);
        this.updatePagination(data.data?.total || 0);
        this.showMessage(`查询成功，共 ${data.data?.total || 0} 条`, 'success');
      } else {
        this.showMessage(data.msg || '查询失败', 'error');
        this.renderProductList([]);
        this.updatePagination(0);
      }
    } catch (e) {
      console.error(e);
      this.showMessage('网络异常', 'error');
      this.renderProductList([]);
      this.updatePagination(0);
    } finally {
      this.setLoading(false);
    }
  }

  renderProductList(list) {
    this.tableBody.innerHTML = '';
    if (!list.length) {
      this.tableEmpty.classList.add('show');
      return;
    }
    this.tableEmpty.classList.remove('show');
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <div class="table-col col-check">
          <label class="check-box"><input type="checkbox" data-id="${item.id}"><span class="check-square"></span></label>
        </div>
        <div class="table-col col-shop">${item.shop || '-'}</div>
        <div class="table-col col-prod-name">${item.product_name || '-'}</div>
        <div class="table-col col-barcode">${item.bar_code || '-'}</div>
        <div class="table-col col-business-code">${item.business_code || '-'}</div>
        <div class="table-col col-merchant-code">${item.merchant_code || '-'}</div>
        <div class="table-col col-operate">
          <button class="btn btn-sm btn-edit" data-id="${item.id}">修改</button>
          <button class="btn btn-sm btn-copy"
            data-shop="${item.shop || ''}"
            data-name="${item.product_name || ''}"
            data-barcode="${item.bar_code || ''}"
            data-business="${item.business_code || ''}">复制</button>
        </div>`;
      this.tableBody.appendChild(row);
      row.querySelector('.btn-edit').addEventListener('click', () => this.showEditForm(item));
      row.querySelector('.btn-copy').addEventListener('click', e => {
        const d = e.target.dataset;
        this.copyProductData(d.shop, d.name, d.barcode, d.business);
      });
    });
  }

  updatePagination(total) {
    this.pagination.total = total;
    this.pagination.totalPage = Math.ceil(total / this.pagination.pageSize) || 1;
    this.totalCount.textContent = total;
    this.currentPageEl.textContent = this.pagination.currentPage;
    this.totalPageEl.textContent = this.pagination.totalPage;
    this.btnPrevPage.disabled = this.pagination.currentPage === 1;
    this.btnNextPage.disabled = this.pagination.currentPage === this.pagination.totalPage;
    this.selectPageSize.value = this.pagination.pageSize;
    this.updatePageButtons();
  }

  updatePageButtons() {
    if (!this.pageButtonsContainer) return;
    this.pageButtonsContainer.querySelectorAll('.btn-page-num').forEach(b => b.remove());
    const start = Math.max(1, this.pagination.currentPage - 2);
    const end = Math.min(this.pagination.totalPage, this.pagination.currentPage + 2);
    for (let i = start; i <= end; i++) {
      const btn = document.createElement('button');
      btn.className = `btn btn-page btn-page-num ${i === this.pagination.currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        this.pagination.currentPage = i;
        this.queryProducts();
      });
      this.pageButtonsContainer.insertBefore(btn, this.btnNextPage);
    }
  }

  showModal(modal) {
    this.modalMask.style.display = 'block';
    modal.style.display = 'block';
    const first = modal.querySelector('input[type="text"]');
    if (first) first.focus();
  }

  hideAllModal() {
    this.modalMask.style.display = 'none';
    this.modalAddProduct.style.display = 'none';
    this.modalImportExcel.style.display = 'none';
  }

  resetAddForm() {
    this.formAddProduct.reset();
    this.btnSubmitAdd.textContent = '提交保存';
    this.modalAddProduct.querySelector('.modal-title').innerHTML = '<i class="fas fa-plus"></i> 新增商品';
    this.inputAddBarCode.readOnly = false;
    this.clearValidationStates();
  }

  resetImportForm() {
    this.inputExcelFile.value = '';
    this.textFileName.textContent = '未选择任何文件';
    this.btnSubmitImport.disabled = true;
  }

  async addProduct() {
    const shop = this.inputAddShop.value.trim();
    const productName = this.inputAddProductName.value.trim();
    const barCode = this.inputAddBarCode.value.trim();
    const businessCode = this.inputAddBusinessCode.value.trim();
    const merchantCode = this.inputAddMerchantCode.value.trim();

    if (!shop || !productName || !barCode || !businessCode || !merchantCode) {
      this.showMessage('所有带*的字段为必填项，不能为空', 'error');
      return;
    }

    const data = { shop, product_name: productName, bar_code: barCode, business_code: businessCode, merchant_code: merchantCode };

    try {
      this.setBtnLoading(this.btnSubmitAdd, true);
      const response = await fetch('/api/v2/product/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(data)
      });
      const res = await response.json();

      if (res.code === 0 || res.code === 200) {
        this.showMessage('商品新增成功', 'success');
        this.hideAllModal();
        this.queryProducts();
      } else {
        this.showMessage(res.msg || '商品新增失败', 'error');
      }
    } catch (error) {
      console.error('商品新增失败：', error);
      this.showMessage('网络异常，商品新增失败', 'error');
    } finally {
      this.setBtnLoading(this.btnSubmitAdd, false);
    }
  }

  showEditForm(product) {
    this.editProductData = product;
    this.inputAddShop.value = product.shop || '';
    this.inputAddProductName.value = product.product_name || '';
    this.inputAddBarCode.value = product.bar_code || '';
    this.inputAddBusinessCode.value = product.business_code || '';
    this.inputAddMerchantCode.value = product.merchant_code || '';
    this.modalAddProduct.querySelector('.modal-title').innerHTML = '<i class="fas fa-edit"></i> 修改商品';
    this.btnSubmitAdd.textContent = '保存修改';
    this.showModal(this.modalAddProduct);
    this.inputAddBarCode.readOnly = true;
  }

  async editProduct() {
    const shop = this.inputAddShop.value.trim();
    const productName = this.inputAddProductName.value.trim();
    const barCode = this.inputAddBarCode.value.trim();
    const businessCode = this.inputAddBusinessCode.value.trim();
    const merchantCode = this.inputAddMerchantCode.value.trim();
    const id = this.editProductData.id;

    if (!id || !shop || !productName || !barCode || !businessCode || !merchantCode) {
      this.showMessage('所有带*的字段为必填项，不能为空', 'error');
      return;
    }

    const data = { id, shop, product_name: productName, bar_code: barCode, business_code: businessCode, merchant_code: merchantCode };

    try {
      this.setBtnLoading(this.btnSubmitAdd, true);
      const response = await fetch('/api/v2/product/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(data)
      });
      const res = await response.json();

      if (res.code === 0 || res.code === 200) {
        this.showMessage('商品修改成功', 'success');
        this.hideAllModal();
        this.queryProducts();
      } else {
        this.showMessage(res.msg || '商品修改失败', 'error');
      }
    } catch (error) {
      console.error('商品修改失败：', error);
      this.showMessage('网络异常，商品修改失败', 'error');
    } finally {
      this.setBtnLoading(this.btnSubmitAdd, false);
      this.inputAddBarCode.readOnly = false;
    }
  }

  async importExcel() {
    const file = this.inputExcelFile.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      this.setBtnLoading(this.btnSubmitImport, true);
      const response = await fetch('/api/v2/product/import-excel', {
        method: 'POST',
        body: formData
      });
      const res = await response.json();

      if (res.code === 0 || res.code === 200) {
        this.showMessage('Excel文件导入成功', 'success');
        this.hideAllModal();
        this.queryProducts();
      } else {
        this.showMessage(res.msg || 'Excel文件导入失败', 'error');
      }
    } catch (error) {
      console.error('Excel导入失败：', error);
      this.showMessage('网络异常，Excel导入失败', 'error');
    } finally {
      this.setBtnLoading(this.btnSubmitImport, false);
      this.resetImportForm();
    }
  }

  copyProductData(shop, name, barcode, business) {
    const copyText = `${shop}\t${name}\t${barcode}\t${business}`;
    navigator.clipboard.writeText(copyText).then(() => {
      this.showMessage('商品数据复制成功', 'success');
    }).catch(() => {
      this.showMessage('商品数据复制失败，请手动复制', 'error');
    });
  }

  batchCopyProductData() {
    const checkedCheckboxes = this.tableBody.querySelectorAll('.table-row .col-check input[type="checkbox"]:checked');
    if (checkedCheckboxes.length === 0) {
      this.showMessage('请先选择需要复制的商品', 'error');
      return;
    }

    const copyContentList = [];
    checkedCheckboxes.forEach(cb => {
      const row = cb.closest('.table-row');
      const shop = row.querySelector('.col-shop').textContent || '-';
      const productName = row.querySelector('.col-prod-name').textContent || '-';
      const barCode = row.querySelector('.col-barcode').textContent || '-';
      const businessCode = row.querySelector('.col-business-code').textContent || '-';
      const merchantCode = row.querySelector('.col-merchant-code').textContent || '-';
      copyContentList.push(`${shop}\t${productName}\t${barCode}\t${businessCode}\t${merchantCode}`);
    });

    const finalCopyText = copyContentList.join('\n');
    navigator.clipboard.writeText(finalCopyText)
      .then(() => {
        this.showMessage(`批量复制成功，共复制${checkedCheckboxes.length}条商品数据`, 'success');
      })
      .catch(() => {
        this.showMessage('批量复制失败，请检查浏览器权限或手动复制', 'error');
      });
  }

  showMessage(msg, type = 'success') {
    if (this.queryResponseContainer) {
      this.queryResponseContainer.textContent = msg;
      this.queryResponseContainer.className = `query-response-container ${type}`;

      setTimeout(() => {
        if (this.queryResponseContainer.classList.contains(type)) {
          this.queryResponseContainer.classList.remove(type);
        }
      }, 3000);
    }
  }

  setLoading(isLoading) {
    if (isLoading) {
      if (this.tableEmpty && this.tableEmpty.parentNode === this.tableBody) {
        this.tableBody.removeChild(this.tableEmpty);
      }
      this.tableBody.innerHTML = `<div class="table-loading" style="text-align:center;padding:50px 0;color:#666;"><i class="fas fa-spinner fa-spin"></i> 数据加载中...</div>`;
    } else {
      const loading = this.tableBody.querySelector('.table-loading');
      if (loading) loading.remove();
    }
  }

  setBtnLoading(btn, isLoading) {
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = '处理中...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || '提交';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ProductQueryModule('.main-content');
});
