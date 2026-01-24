/**
 * Excel分组汇总模块 - 专属功能
 * 模块ID: excel-sales
 */

/**
 * 模块初始化函数
 * @param {HTMLElement} container - 模块容器
 */
function init_excel_sales(container) {
    console.log('Excel分组汇总模块初始化');
    
    // 绑定模块特定事件
    bindModuleEvents(container);
    
    // 初始化模块状态
    initModuleState(container);
    
    // 设置表单验证
    setupFormValidation(container);
    
    // 模拟数据加载
    simulateDataLoading(container);
}

/**
 * 绑定模块特定事件
 */
function bindModuleEvents(container) {
    if (!container) return;
    
    // 根目录输入框特殊处理
    const rootDirInput = container.querySelector('input[value="E:/excel_files"]');
    if (rootDirInput) {
        rootDirInput.addEventListener('change', function() {
            validateRootDirectory(this.value, container);
        });
    }
    
    // 匹配列和求和列的联动验证
    const matchColumnInput = container.querySelector('input[placeholder*="匹配列"]');
    const sumColumnInput = container.querySelector('input[placeholder*="求和列"]');
    
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
    const startButton = container.querySelector('.btn-primary');
    if (startButton) {
        startButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 执行表单验证
            if (!validateForm(container)) {
                return;
            }
            
            // 显示处理详情
            showProcessingDetails(container);
            
            // 模拟数据处理
            simulateExcelProcessing(container);
        });
    }
    
    // 输出文件名建议
    const outputInput = container.querySelector('input[placeholder*="输出文件名"]');
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
    
    // 更新统计数据显示
    updateStatsDisplay(container);
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
    
    // 特定格式验证
    if (input.placeholder.includes('列')) {
        const value = input.value.trim();
        if (value && !/^[A-Z]+(?:,[A-Z]+)*$/.test(value)) {
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
 * 显示处理详情
 */
function showProcessingDetails(container) {
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'processing-details';
    detailsDiv.innerHTML = `
        <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, var(--gray-50), var(--gray-100)); border-radius: var(--border-radius);">
            <h5 style="color: var(--primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle"></i>
                处理详情
            </h5>
            <div style="font-size: 0.85rem; color: var(--gray-600);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>正在读取Excel文件...</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="far fa-clock"></i>
                    <span>数据分组处理中...</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-calculator"></i>
                    <span>汇总计算进行中...</span>
                </div>
            </div>
        </div>
    `;
    
    const formGrid = container.querySelector('.form-grid');
    if (formGrid) {
        formGrid.appendChild(detailsDiv);
    }
}

/**
 * 模拟Excel处理
 */
function simulateExcelProcessing(container) {
    const steps = [
        { text: '读取源文件', duration: 800 },
        { text: '数据清洗', duration: 1000 },
        { text: '按匹配列分组', duration: 1200 },
        { text: '计算汇总值', duration: 900 },
        { text: '生成结果文件', duration: 1100 },
        { text: '保存输出文件', duration: 700 }
    ];
    
    const detailsDiv = container.querySelector('.processing-details div');
    if (!detailsDiv) return;
    
    let currentStep = 0;
    
    const processStep = () => {
        if (currentStep >= steps.length) {
            // 处理完成
            detailsDiv.innerHTML = `
                <h5 style="color: var(--success); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-check-circle"></i>
                    处理完成！
                </h5>
                <div style="font-size: 0.85rem; color: var(--gray-600);">
                    <p>✓ 所有数据处理完成</p>
                    <p>✓ 结果文件已保存</p>
                    <p>✓ 共处理了 1,245 条记录</p>
                    <button class="btn btn-secondary" style="margin-top: 10px; width: auto;" onclick="location.reload()">
                        <i class="fas fa-redo"></i>
                        处理新文件
                    </button>
                </div>
            `;
            return;
        }
        
        const step = steps[currentStep];
        const stepDiv = document.createElement('div');
        stepDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
        stepDiv.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>${step.text}...</span>
        `;
        
        detailsDiv.querySelector('div').appendChild(stepDiv);
        
        setTimeout(() => {
            stepDiv.querySelector('i').className = 'fas fa-check-circle';
            stepDiv.querySelector('i').style.color = 'var(--success)';
            stepDiv.querySelector('i').style.animation = 'none';
            currentStep++;
            processStep();
        }, step.duration);
    };
    
    processStep();
}

/**
 * 更新统计数据显示
 */
function updateStatsDisplay(container) {
    const stats = container.querySelectorAll('.stat-value');
    if (stats.length >= 3) {
        // 随机更新第一个统计值
        setTimeout(() => {
            const value = parseInt(stats[0].textContent.replace('%', ''));
            if (!isNaN(value)) {
                const newValue = Math.min(100, value + Math.floor(Math.random() * 5));
                stats[0].textContent = newValue + '%';
                stats[0].style.transform = 'scale(1.1)';
                setTimeout(() => {
                    stats[0].style.transform = 'scale(1)';
                }, 300);
            }
        }, 2000);
    }
}

/**
 * 模拟数据加载
 */
function simulateDataLoading(container) {
    // 模拟加载完成后的小动画
    setTimeout(() => {
        const panelIcon = container.querySelector('.panel-icon');
        if (panelIcon) {
            panelIcon.style.transform = 'scale(1.05)';
            setTimeout(() => {
                panelIcon.style.transform = 'scale(1)';
            }, 300);
        }
    }, 500);
}
