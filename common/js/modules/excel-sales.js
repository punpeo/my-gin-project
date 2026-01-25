/**
 * Excel分组汇总模块 - 专属功能
 * 模块ID: excel-sales
 * API: POST /api/v1/excel/process
 * Content-Type: application/json;charset=utf-8
 */

/**
 * 模块初始化函数
 * @param {HTMLElement} container - 模块容器
 */
function init_excel_sales(container) {
    console.log('Excel分组汇总模块初始化 - API适配版');
    
    // 绑定模块特定事件
    bindModuleEvents(container);
    
    // 初始化模块状态
    initModuleState(container);
    
    // 设置表单验证
    setupFormValidation(container);
}

/**
 * 绑定模块特定事件
 */
function bindModuleEvents(container) {
    if (!container) return;
    
    // 根目录输入框特殊处理
    const rootDirInput = container.querySelector('input[name="base_path"]');
    if (rootDirInput) {
        rootDirInput.addEventListener('change', function() {
            validateRootDirectory(this.value, container);
        });
    }
    
    // 匹配列和求和列的联动验证
    const matchColumnInput = container.querySelector('input[name="match_column"]');
    const sumColumnInput = container.querySelector('input[name="sum_column"]');
    
    if (matchColumnInput && sumColumnInput) {
        const validateColumns = () => {
            const matchCol = matchColumnInput.value.trim();
            const sumCol = sumColumnInput.value.trim();
            
            if (matchCol && sumCol && matchCol === sumCol) {
                showValidationError(container, '匹配列和求和列不能相同');
            } else {
                clearValidationError(container);
            }
        };
        
        matchColumnInput.addEventListener('input', validateColumns);
        sumColumnInput.addEventListener('input', validateColumns);
    }
    
    // 开始分组汇总按钮的特殊处理
    const startButton = container.querySelector('.btn-primary.btn-lg');
    if (startButton) {
        startButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 执行表单验证
            if (!validateForm(container)) {
                return;
            }
            
            // 收集表单数据
            const formData = collectFormData(container);
            
            // 显示进度条
            showProgressBar(container);
            
            // 调用API处理
            processExcelData(container, formData);
        });
    }
    
    // 输出文件名建议
    const outputInput = container.querySelector('input[name="output_file"]');
    if (outputInput) {
        outputInput.addEventListener('focus', function() {
            if (!this.value) {
                const date = new Date();
                const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
                this.value = `分组汇总_${dateStr}.xlsx`;
                this.style.color = '#10b981';
            }
        });
    }
    
    // 绑定重置按钮
    const resetButton = container.querySelector('#reset-btn');
    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            resetForm(container);
        });
    }
    
    // 绑定结果按钮
    bindResultButtons(container);
}

/**
 * 初始化模块状态
 */
function initModuleState(container) {
    // 设置模块标题动画
    const moduleTitle = container.querySelector('h3');
    if (moduleTitle) {
        moduleTitle.style.transition = 'transform 0.3s ease';
        moduleTitle.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
        });
        moduleTitle.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    }
}

/**
 * 设置表单验证
 */
function setupFormValidation(container) {
    const formControls = container.querySelectorAll('.form-control');
    
    formControls.forEach(input => {
        // 实时验证
        input.addEventListener('blur', function() {
            validateInput(this);
        });
        
        // 输入时清除错误状态
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                this.classList.remove('error');
                this.style.borderColor = '';
            }
        });
    });
}

/**
 * 验证输入框
 */
function validateInput(input) {
    if (!input.value.trim()) {
        if (input.hasAttribute('required')) {
            input.classList.add('error');
            input.style.borderColor = 'var(--danger)';
            return false;
        }
    }
    
    input.classList.remove('error');
    input.style.borderColor = '';
    return true;
}

/**
 * 验证整个表单
 */
function validateForm(container) {
    let isValid = true;
    const requiredInputs = container.querySelectorAll('.form-control[required]');
    
    requiredInputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * 验证根目录
 */
function validateRootDirectory(path, container) {
    if (!path.trim()) {
        showValidationError(container, '请填写文件根目录');
        return false;
    }
    
    // 简单的路径格式验证
    if (!path.includes(':')) {
        showValidationError(container, '请输入有效的文件路径（包含盘符）');
        return false;
    }
    
    clearValidationError(container);
    return true;
}

/**
 * 显示验证错误
 */
function showValidationError(container, message) {
    clearValidationError(container);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    errorDiv.style.cssText = `
        background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05));
        border: 1px solid var(--danger);
        border-radius: var(--border-radius);
        padding: 10px 12px;
        margin: 10px 0;
        color: var(--danger);
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeIn 0.3s ease;
    `;
    
    const formGrid = container.querySelector('.form-grid');
    if (formGrid) {
        formGrid.insertBefore(errorDiv, formGrid.firstChild);
    }
}

/**
 * 清除验证错误
 */
function clearValidationError(container) {
    const errorDiv = container.querySelector('.validation-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * 收集表单数据
 */
function collectFormData(container) {
    return {
        base_path: container.querySelector('input[name="base_path"]').value.trim(),
        match_column: container.querySelector('input[name="match_column"]').value.trim(),
        match_value: container.querySelector('input[name="match_value"]').value.trim() || undefined,
        keep_columns: container.querySelector('input[name="keep_columns"]').value.trim().split(',').map(s => s.trim()),
        sum_column: container.querySelector('input[name="sum_column"]').value.trim(),
        output_file: container.querySelector('input[name="output_file"]').value.trim() || undefined
    };
}

/**
 * 显示进度条
 */
function showProgressBar(container) {
    const progressContainer = container.querySelector('#progress-container');
    const formGrid = container.querySelector('.form-grid');
    
    if (progressContainer && formGrid) {
        formGrid.style.opacity = '0.5';
        formGrid.style.pointerEvents = 'none';
        progressContainer.style.display = 'block';
    }
    
    // 重置进度条
    const progressFill = container.querySelector('#progress-fill');
    const progressPercentage = container.querySelector('.progress-percentage');
    if (progressFill && progressPercentage) {
        progressFill.style.width = '0%';
        progressPercentage.textContent = '0%';
    }
    
    resetProgressSteps(container);
    
    // 开始连接服务器步骤
    activateProgressStep(container, 1, 20);
}

/**
 * 重置进度步骤
 */
function resetProgressSteps(container) {
    const steps = container.querySelectorAll('.progress-step');
    steps.forEach(step => {
        step.classList.remove('active');
        const icon = step.querySelector('i');
        icon.className = icon.className.replace(/fa-(spinner|check|times)/, '');
    });
}

/**
 * 激活进度步骤
 */
function activateProgressStep(container, stepNumber, progress) {
    const step = container.querySelector(`#step${stepNumber}`);
    if (step) {
        step.classList.add('active');
        const icon = step.querySelector('i');
        icon.className = icon.className.replace(/fa-[^ ]*/, '') + ' fa-spinner fa-spin';
    }
    
    // 更新进度条
    const progressFill = container.querySelector('#progress-fill');
    const progressPercentage = container.querySelector('.progress-percentage');
    if (progressFill && progressPercentage) {
        progressFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress}%`;
    }
}

/**
 * 完成进度步骤
 */
function completeProgressStep(container, stepNumber) {
    const step = container.querySelector(`#step${stepNumber}`);
    if (step) {
        const icon = step.querySelector('i');
        icon.className = icon.className.replace('fa-spinner fa-spin', 'fa-check');
    }
}

/**
 * 处理Excel数据
 */
async function processExcelData(container, formData) {
    const startTime = Date.now();
    
    try {
        // 激活步骤2
        setTimeout(() => {
            activateProgressStep(container, 2, 40);
        }, 500);
        
        // 调用API
        const response = await fetch('/api/v1/excel/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
            },
            body: JSON.stringify(formData)
        });
        
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(1);
        
        if (!response.ok) {
            // 处理错误响应
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }
        
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            // JSON响应（错误情况）
            const errorData = await response.json();
            throw new Error(errorData.msg || '处理失败');
        } else if (contentType && contentType.includes('spreadsheet')) {
            // Excel文件流响应（成功）
            // 更新进度
            activateProgressStep(container, 3, 60);
            activateProgressStep(container, 4, 80);
            
            setTimeout(() => {
                completeProgressStep(container, 4);
                activateProgressStep(container, 5, 100);
                
                setTimeout(() => {
                    completeProgressStep(container, 5);
                    handleSuccessResponse(container, response, formData, processingTime);
                }, 500);
            }, 1000);
        } else {
            throw new Error('未知的响应类型');
        }
        
    } catch (error) {
        handleErrorResponse(container, error);
    }
}

/**
 * 处理成功响应
 */
async function handleSuccessResponse(container, response, formData, processingTime) {
    // 获取文件名
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'excel汇总结果.xlsx';
    
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
            filename = filenameMatch[1];
        }
    }
    
    // 创建blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // 显示成功结果
    showSuccessResult(container, filename, processingTime, url, blob);
    
    // 清理进度条
    const progressContainer = container.querySelector('#progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

/**
 * 显示成功结果
 */
function showSuccessResult(container, filename, processingTime, downloadUrl, blob) {
    const resultContainer = container.querySelector('#result-container');
    const formGrid = container.querySelector('.form-grid');
    
    if (resultContainer && formGrid) {
        // 更新结果信息
        const filenameElement = container.querySelector('#result-filename');
        const timeElement = container.querySelector('#result-time');
        
        if (filenameElement) filenameElement.textContent = filename;
        if (timeElement) timeElement.textContent = `${processingTime}s`;
        
        // 存储下载URL和blob
        resultContainer.setAttribute('data-download-url', downloadUrl);
        resultContainer.setAttribute('data-blob', JSON.stringify({
            type: blob.type,
            size: blob.size
        }));
        
        // 显示结果容器
        resultContainer.style.display = 'block';
        formGrid.style.opacity = '1';
        formGrid.style.pointerEvents = 'auto';
        
        // 滚动到结果区域
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * 处理错误响应
 */
function handleErrorResponse(container, error) {
    const errorContainer = container.querySelector('#error-container');
    const formGrid = container.querySelector('.form-grid');
    
    if (errorContainer && formGrid) {
        // 解析错误信息
        const errorMatch = error.message.match(/"code":(\d+),"msg":"([^"]+)"/);
        const errorCode = errorMatch ? errorMatch[1] : '500';
        const errorMessage = errorMatch ? errorMatch[2] : error.message;
        
        // 更新错误信息
        const codeElement = container.querySelector('#error-code');
        const messageElement = container.querySelector('#error-message');
        
        if (codeElement) codeElement.textContent = errorCode;
        if (messageElement) messageElement.textContent = errorMessage;
        
        // 显示错误容器
        errorContainer.style.display = 'block';
        formGrid.style.opacity = '1';
        formGrid.style.pointerEvents = 'auto';
        
        // 隐藏进度条
        const progressContainer = container.querySelector('#progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // 滚动到错误区域
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * 绑定结果按钮
 */
function bindResultButtons(container) {
    // 下载按钮
    const downloadBtn = container.querySelector('#download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            downloadResultFile(container);
        });
    }
    
    // 重试按钮
    const retryBtn = container.querySelector('#retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleRetry(container);
        });
    }
    
    // 错误重试按钮
    const retryErrorBtn = container.querySelector('#retry-error-btn');
    if (retryErrorBtn) {
        retryErrorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleRetry(container);
        });
    }
    
    // 查看请求数据按钮
    const viewRequestBtn = container.querySelector('#view-request-btn');
    if (viewRequestBtn) {
        viewRequestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showRequestPreview(container);
        });
    }
}

/**
 * 下载结果文件
 */
function downloadResultFile(container) {
    const resultContainer = container.querySelector('#result-container');
    const downloadUrl = resultContainer?.getAttribute('data-download-url');
    
    if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = container.querySelector('#result-filename').textContent;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 清理URL
        window.URL.revokeObjectURL(downloadUrl);
    }
}

/**
 * 处理重试
 */
function handleRetry(container) {
    // 重置表单状态
    const formGrid = container.querySelector('.form-grid');
    if (formGrid) {
        formGrid.style.opacity = '1';
        formGrid.style.pointerEvents = 'auto';
    }
    
    // 隐藏所有结果容器
    const resultContainer = container.querySelector('#result-container');
    const errorContainer = container.querySelector('#error-container');
    const requestPreview = container.querySelector('.request-preview');
    
    if (resultContainer) resultContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (requestPreview) requestPreview.style.display = 'none';
    
    // 滚动到顶部
    const formGridElement = container.querySelector('.form-grid');
    if (formGridElement) {
        formGridElement.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * 显示请求预览
 */
function showRequestPreview(container) {
    const formData = collectFormData(container);
    const preview = container.querySelector('.request-preview');
    const codeElement = container.querySelector('#request-data');
    
    if (preview && codeElement) {
        codeElement.textContent = JSON.stringify(formData, null, 2);
        preview.style.display = 'block';
    }
}

/**
 * 重置表单
 */
function resetForm(container) {
    // 重置表单值
    const basePathInput = container.querySelector('input[name="base_path"]');
    const matchColumnInput = container.querySelector('input[name="match_column"]');
    const matchValueInput = container.querySelector('input[name="match_value"]');
    const keepColumnsInput = container.querySelector('input[name="keep_columns"]');
    const sumColumnInput = container.querySelector('input[name="sum_column"]');
    const outputFileInput = container.querySelector('input[name="output_file"]');
    
    if (basePathInput) basePathInput.value = 'E:/excel_files/sales';
    if (matchColumnInput) matchColumnInput.value = 'A';
    if (matchValueInput) matchValueInput.value = '';
    if (keepColumnsInput) keepColumnsInput.value = 'B,C';
    if (sumColumnInput) sumColumnInput.value = 'D';
    if (outputFileInput) outputFileInput.value = '';
    
    // 清除错误状态
    const errors = container.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    const inputs = container.querySelectorAll('.form-control');
    inputs.forEach(input => input.style.borderColor = '');
    
    // 隐藏所有容器
    const resultContainer = container.querySelector('#result-container');
    const errorContainer = container.querySelector('#error-container');
    const progressContainer = container.querySelector('#progress-container');
    const requestPreview = container.querySelector('.request-preview');
    
    if (resultContainer) resultContainer.style.display = 'none';
    if (errorContainer) errorContainer.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';
    if (requestPreview) requestPreview.style.display = 'none';
}
