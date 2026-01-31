/**
 * 模块管理器 - 负责模块的加载、切换和状态管理（含点击支持+全量体验优化）
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
        'product': {
            html: 'modules/product.html',
            js: 'js/modules/product.js',
            name: '商品信息查询'
        },
        'dev-module-2': {
            html: 'modules/dev-module-2.html',
            js: 'js/modules/dev-module-2.js',
            name: '数据可视化模块'
        }
    };
    
    // 模块注册表
    const moduleRegistry = {};

    // 新增：私有方法 - 清除悬停定时器（统一管理，避免冗余代码）
    const clearHoverTimer = function() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    };
    
    return {
        /**
         * 初始化模块系统
         */
        init: function() {
            console.log('模块系统初始化');
            this.setupEventListeners();
            // 新增：初始化时绑定导航项的悬停/点击/移出事件（核心交互绑定）
            this.bindNavItemEvents();
        },
        
        /**
         * 设置全局事件监听器
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
         * 新增：绑定导航项的悬停/点击/移出事件（核心交互入口）
         */
        bindNavItemEvents: function() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const moduleId = item.getAttribute('data-target');
                if (!moduleId) return;

                // 1. 鼠标悬停：延迟300ms加载（原有逻辑）
                item.addEventListener('mouseenter', () => {
                    this.setActiveModule(moduleId);
                });

                // 2. 鼠标点击：立即加载（新增核心功能）
                item.addEventListener('click', (e) => {
                    e.preventDefault(); // 阻止默认链接行为（若有）
                    this.setActiveModule(moduleId, true);
                });

                // 3. 鼠标移出：清除定时器（体验优化，防止滑过冗余加载）
                item.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            });

            // 额外优化：鼠标移出整个导航容器，也清除定时器（兜底处理）
            const navContainer = document.querySelector('.nav-container') || document.querySelector('.nav');
            if (navContainer) {
                navContainer.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            }
        },
        
        /**
         * 优化：设置活动模块（支持【悬停延迟/点击立即】，含全量体验优化）
         * @param {string} moduleId - 模块ID
         * @param {boolean} [isClick=false] - 是否为点击触发，默认false（悬停）
         */
        setActiveModule: function(moduleId, isClick = false) {
            // 基础校验：禁用悬停/模块未切换时，直接终止所有操作
            if (!isHoverEnabled || currentModule === moduleId) return;

            // 核心优化1：无论点击/悬停，先清除原有定时器，避免多个延迟叠加、重复加载
            clearHoverTimer();

            // 核心优化2：点击触发→立即加载（跳过所有延迟，符合点击即时性体验）
            if (isClick) {
                this.loadModule(moduleId);
                return; // 点击后直接返回，避免后续悬停逻辑干扰
            }

            // 悬停触发→保留300ms延迟（原逻辑），搭配鼠标移出清除，防止离开后仍加载
            hoverTimer = setTimeout(() => {
                this.loadModule(moduleId);
                clearHoverTimer(); // 执行后清空定时器，避免内存冗余
            }, 1000);
        },
        
        /**
         * 加载模块（原有逻辑，无修改）
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
         * 更新导航状态（原有逻辑，无修改）
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
         * 显示加载状态（原有逻辑，无修改）
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
         * 加载模块内容（原有逻辑，无修改）
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
         * 加载模块脚本（原有逻辑，无修改）
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
         * 绑定通用事件（原有逻辑，无修改）
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
         * 注册模块（原有逻辑，无修改）
         */
        registerModule: function(moduleId, module) {
            moduleRegistry[moduleId] = module;
        },
        
        /**
         * 获取当前模块（原有逻辑，无修改）
         */
        getCurrentModule: function() {
            return currentModule;
        },
        
        /**
         * 获取模块配置（原有逻辑，无修改）
         */
        getModuleConfig: function(moduleId) {
            return modulesConfig[moduleId];
        },
        
        /**
         * 获取所有模块配置（原有逻辑，无修改）
         */
        getAllModules: function() {
            return { ...modulesConfig };
        }
    };
})();

/**
 * 处理按钮点击（原有逻辑，无修改）
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
 * 处理文件上传点击（原有逻辑，无修改）
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
 * 处理文件拖放（原有逻辑，无修改）
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

// 页面加载完成后初始化模块管理器
document.addEventListener('DOMContentLoaded', function() {
    ModulesManager.init();
});