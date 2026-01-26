/**
 * 模块管理器 - 负责模块的加载、切换和状态管理
 */

const ModulesManager = (function() {
    // 私有变量
    let currentModule = null;
    let isHoverEnabled = true;
    let hoverTimer = null;
    
    // 模块配置映射
    const modulesConfig = {
        'excel-sales': {
            html: 'modules/excel-sales.html',
            js: 'js/modules/excel-sales.js',
            name: 'Excel分组汇总'
        },
        'excel-fill': {
            html: 'modules/excel-fill.html',
            js: 'js/modules/excel-fill.js',
            name: 'Excel数据匹配填充'
        },
        'stock': {
            html: 'modules/stock.html',
            js: 'js/modules/stock.js',
            name: '库存统计'
        },
        'order-summary': {
            html: 'modules/order-summary.html',
            js: 'js/modules/order-summary.js',
            name: '订单汇总'
        },
        'shop-order': {
            html: 'modules/shop-order.html',
            js: 'js/modules/shop-order.js',
            name: '店铺订单统计'
        },
        'cycle-sales': {
            html: 'modules/cycle-sales.html',
            js: 'js/modules/cycle-sales.js',
            name: '周期销量统计'
        },
        'dev-module-1': {
            html: 'modules/dev-module-1.html',
            js: 'js/modules/dev-module-1.js',
            name: '智能分析模块'
        },
        'dev-module-2': {
            html: 'modules/dev-module-2.html',
            js: 'js/modules/dev-module-2.js',
            name: '数据可视化模块'
        }
    };
    
    // 模块注册表
    const moduleRegistry = {};
    
    return {
        /**
         * 初始化模块系统
         */
        init: function() {
            console.log('模块系统初始化');
            this.setupEventListeners();
        },
        
        /**
         * 设置事件监听器
         */
        setupEventListeners: function() {
            // 全局点击事件委托
            document.addEventListener('click', function(e) {
                // 处理按钮点击
                if (e.target.closest('.btn-primary, .btn-secondary, .btn-danger')) {
                    const button = e.target.closest('.btn-primary, .btn-secondary, .btn-danger');
                    if (button) {
                        handleButtonClick(button);
                    }
                }
                
                // 处理文件上传区域点击
                if (e.target.closest('.file-upload-area')) {
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) {
                        handleFileUploadClick(uploadArea);
                    }
                }
            });
            
            // 全局拖拽事件
            document.addEventListener('dragover', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) {
                        uploadArea.style.borderColor = '#10b981';
                    }
                }
            });
            
            document.addEventListener('drop', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea && e.dataTransfer) {
                        handleFileDrop(uploadArea, e.dataTransfer.files);
                    }
                }
            });
        },
        
        /**
         * 设置活动模块
         */
        setActiveModule: function(moduleId) {
            if (!isHoverEnabled || currentModule === moduleId) return;
            
            // 清除悬停定时器
            if (hoverTimer) {
                clearTimeout(hoverTimer);
                hoverTimer = null;
            }
            
            // 设置悬停延迟
            hoverTimer = setTimeout(() => {
                this.loadModule(moduleId);
                hoverTimer = null;
            }, 300);
        },
        
        /**
         * 加载模块
         */
        loadModule: function(moduleId) {
            if (!modulesConfig[moduleId]) {
                console.error(`模块 ${moduleId} 未找到`);
                return;
            }
            
            isHoverEnabled = false;
            currentModule = moduleId;
            
            // 更新导航状态
            this.updateNavigationState(moduleId);
            
            // 显示加载状态
            this.showLoadingState(moduleId);
            
            // 加载模块
            this.loadModuleContent(moduleId);
        },
        
        /**
         * 更新导航状态
         */
        updateNavigationState: function(moduleId) {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-target') === moduleId) {
                    item.classList.add('active');
                }
            });
        },
        
        /**
         * 显示加载状态
         */
        showLoadingState: function(moduleId) {
            const modulesContainer = document.getElementById('modules-container');
            if (!modulesContainer) {
                console.error('模块容器未找到');
                isHoverEnabled = true;
                return;
            }
            
            const moduleConfig = modulesConfig[moduleId];
            modulesContainer.innerHTML = `
                <div class="function-panel active">
                    <div class="dev-panel">
                        <div class="dev-content">
                            <i class="fas fa-spinner fa-spin"></i>
                            <h4>加载 ${moduleConfig.name}</h4>
                            <p>正在加载模块内容，请稍候...</p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        /**
         * 加载模块内容
         */
        loadModuleContent: function(moduleId) {
            const moduleConfig = modulesConfig[moduleId];
            const modulesContainer = document.getElementById('modules-container');
            
            if (!moduleConfig || !modulesContainer) {
                console.error('模块配置或容器未找到');
                isHoverEnabled = true;
                return;
            }
            
            // 加载HTML
            fetch(moduleConfig.html)
                .then(response => {
                    if (!response.ok) throw new Error('HTML加载失败');
                    return response.text();
                })
                .then(html => {
                    modulesContainer.innerHTML = html;
                    
                    // 查找并激活功能面板
                    const functionPanel = modulesContainer.querySelector('.function-panel');
                    if (functionPanel) {
                        functionPanel.classList.add('active');
                        functionPanel.style.animation = 'fadeIn 0.3s ease';
                    }
                    
                    // 绑定通用事件
                    this.bindCommonEvents(modulesContainer);
                    
                    // 加载模块JS
                    this.loadModuleScript(moduleId, modulesContainer);
                    
                    isHoverEnabled = true;
                })
                .catch(error => {
                    console.error('模块加载失败:', error);
                    modulesContainer.innerHTML = `
                        <div class="function-panel active">
                            <div class="dev-panel">
                                <div class="dev-content">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <h4>加载失败</h4>
                                    <p>无法加载模块，请检查网络连接</p>
                                    <button class="btn btn-primary" onclick="ModulesManager.loadModule('${moduleId}')">
                                        <i class="fas fa-redo"></i>
                                        重试
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    isHoverEnabled = true;
                });
        },
        
        /**
         * 加载模块脚本
         */
        loadModuleScript: function(moduleId, container) {
            const moduleConfig = modulesConfig[moduleId];
            if (!moduleConfig || !moduleConfig.js) return;
            
            // 检查是否已加载
            if (moduleRegistry[moduleId]) {
                if (typeof moduleRegistry[moduleId].init === 'function') {
                    moduleRegistry[moduleId].init(container);
                }
                return;
            }
            
            // 动态加载JS
            const script = document.createElement('script');
            script.src = moduleConfig.js;
            script.onload = () => {
                console.log(`模块 ${moduleId} 脚本加载完成`);
                // 调用模块初始化函数
                if (typeof window[`init${moduleId.replace(/-/g, '_')}`] === 'function') {
                    window[`init${moduleId.replace(/-/g, '_')}`](container);
                }
            };
            script.onerror = (error) => {
                console.warn(`模块 ${moduleId} 脚本加载失败:`, error);
            };
            
            if (document.head) {
                document.head.appendChild(script);
            }
        },
        
        /**
         * 绑定通用事件
         */
        bindCommonEvents: function(container) {
            if (!container) return;
            
            // 表单输入框聚焦效果
            container.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', function() {
                    const parent = this.parentElement;
                    if (parent) {
                        parent.style.transform = 'translateY(-1px)';
                    }
                });
                
                input.addEventListener('blur', function() {
                    const parent = this.parentElement;
                    if (parent) {
                        parent.style.transform = 'translateY(0)';
                    }
                });
            });
            
            // 数据卡片悬停效果
            container.querySelectorAll('.data-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
            
            // 模块统计项悬停效果
            container.querySelectorAll('.stat-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.05)';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                });
            });
        },
        
        /**
         * 注册模块
         */
        registerModule: function(moduleId, module) {
            moduleRegistry[moduleId] = module;
        },
        
        /**
         * 获取当前模块
         */
        getCurrentModule: function() {
            return currentModule;
        },
        
        /**
         * 获取模块配置
         */
        getModuleConfig: function(moduleId) {
            return modulesConfig[moduleId];
        },
        
        /**
         * 获取所有模块配置
         */
        getAllModules: function() {
            return { ...modulesConfig };
        }
    };
})();

/**
 * 处理按钮点击
 */
function handleButtonClick(button) {
    if (!button) return;
    
    const originalText = button.innerHTML;
    const originalWidth = button.offsetWidth;
    
    // 保存原始状态
    button.style.minWidth = originalWidth + 'px';
    
    // 显示处理中状态
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    button.disabled = true;
    
    // 模拟处理过程
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check-circle"></i> 处理完成';
        button.style.background = 'linear-gradient(135deg, var(--success), #059669)';
        
        // 3秒后恢复原状
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.minWidth = '';
            
            if (button.classList.contains('btn-primary')) {
                button.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
            } else if (button.classList.contains('btn-secondary')) {
                button.style.background = 'linear-gradient(135deg, var(--secondary), #059669)';
            } else if (button.classList.contains('btn-danger')) {
                button.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';
            }
        }, 3000);
    }, 1500);
}

/**
 * 处理文件上传点击
 */
function handleFileUploadClick(uploadArea) {
    if (!uploadArea) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    
    input.onchange = function(e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            uploadArea.innerHTML = `
                <i class="fas fa-file-excel"></i>
                <p>${fileName}</p>
                <span>文件已选择，点击上传按钮开始处理</span>
            `;
        }
    };
    
    input.click();
}

/**
 * 处理文件拖放
 */
function handleFileDrop(uploadArea, files) {
    if (!uploadArea || !files || files.length === 0) return;
    
    const fileName = files[0].name;
    uploadArea.innerHTML = `
        <i class="fas fa-file-excel"></i>
        <p>${fileName}</p>
        <span>文件已选择，点击上传按钮开始处理</span>
    `;
}
