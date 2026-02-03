const ModulesManager = (function() {
    let currentModule = null;
    let isHoverEnabled = true;
    let hoverTimer = null;
    
    const modulesConfig = {
        'excel-sales': { html: 'modules/excel-sales.html', js: 'js/modules/excel-sales.js', name: 'Excel分组汇总' },
        'excel-fill': { html: 'modules/excel-fill.html', js: 'js/modules/excel-fill.js', name: 'Excel数据匹配填充' },
        'stock': { html: 'modules/stock.html', js: 'js/modules/stock.js', name: '库存统计' },
        'order-summary': { html: 'modules/order-summary.html', js: 'js/modules/order-summary.js', name: '订单汇总' },
        'shop-order': { html: 'modules/shop-order.html', js: 'js/modules/shop-order.js', name: '店铺订单统计' },
        'cycle-sales': { html: 'modules/cycle-sales.html', js: 'js/modules/cycle-sales.js', name: '周期销量统计' },
        'product': { html: 'modules/product.html', js: 'js/modules/product.js', name: '商品信息查询' },
        'product-query': { html: 'modules/product-query.html', js: 'js/modules/product-query.js', name: '商品查询模块' }
    };
    
    const moduleRegistry = {};
    const moduleCache = {}; // 新增：模块缓存池，存储已加载的 HTML 与 JS 实例

    const clearHoverTimer = function() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    };
    
    return {
        init: function() {
            console.log('模块系统初始化');
            this.setupEventListeners();
            this.bindNavItemEvents();
        },
        
        setupEventListeners: function() {
            document.addEventListener('click', function(e) {
                if (e.target.closest('.btn-primary, .btn-secondary, .btn-danger')) {
                    const button = e.target.closest('.btn-primary, .btn-secondary, .btn-danger');
                    if (button) handleButtonClick(button);
                }
                if (e.target.closest('.file-upload-area')) {
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) handleFileUploadClick(uploadArea);
                }
            });
            
            document.addEventListener('dragover', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) uploadArea.style.borderColor = '#10b981';
                }
            });
            
            document.addEventListener('drop', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea && e.dataTransfer) handleFileDrop(uploadArea, e.dataTransfer.files);
                }
            });
        },

        bindNavItemEvents: function() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const moduleId = item.getAttribute('data-target');
                if (!moduleId) return;

                item.addEventListener('mouseenter', () => {
                    this.setActiveModule(moduleId);
                });

                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.setActiveModule(moduleId, true);
                });

                item.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            });

            const navContainer = document.querySelector('.nav-container') || document.querySelector('.nav');
            if (navContainer) {
                navContainer.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            }
        },
        
        setActiveModule: function(moduleId, isClick = false) {
            if (!isHoverEnabled || currentModule === moduleId) return;
            clearHoverTimer();

            if (isClick) {
                this.loadModule(moduleId);
                return;
            }

            hoverTimer = setTimeout(() => {
                this.loadModule(moduleId);
                clearHoverTimer();
            }, 1000);
        },
        
        loadModule: function(moduleId) {
            if (!modulesConfig[moduleId]) {
                console.error(`模块 ${moduleId} 未找到`);
                return;
            }
            
            isHoverEnabled = false;
            currentModule = moduleId;
            this.updateNavigationState(moduleId);
            
            if (moduleCache[moduleId]) {
                // 命中缓存：直接恢复 HTML 与 JS 实例
                this.showCachedModule(moduleId);
                isHoverEnabled = true;
                return;
            }
            
            this.showLoadingState(moduleId);
            this.loadModuleContent(moduleId);
        },
        
        updateNavigationState: function(moduleId) {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-target') === moduleId) {
                    item.classList.add('active');
                }
            });
        },
        
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
        
        loadModuleContent: function(moduleId) {
            const moduleConfig = modulesConfig[moduleId];
            const modulesContainer = document.getElementById('modules-container');
            
            if (!moduleConfig || !modulesContainer) {
                console.error('模块配置或容器未找到');
                isHoverEnabled = true;
                return;
            }
            
            fetch(moduleConfig.html)
                .then(response => {
                    if (!response.ok) throw new Error('HTML加载失败');
                    return response.text();
                })
                .then(html => {
                    modulesContainer.innerHTML = html;
                    const functionPanel = modulesContainer.querySelector('.function-panel');
                    if (functionPanel) {
                        functionPanel.classList.add('active');
                        functionPanel.style.animation = 'fadeIn 0.3s ease';
                    }
                    
                    this.bindCommonEvents(modulesContainer);
                    this.loadModuleScript(moduleId, modulesContainer);
                    
                    // 存入缓存
                    moduleCache[moduleId] = {
                        html: html,
                        containerClone: modulesContainer.innerHTML,
                        jsInitialized: false
                    };
                    
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
        
        showCachedModule: function(moduleId) {
            const cached = moduleCache[moduleId];
            const modulesContainer = document.getElementById('modules-container');
            if (!cached || !modulesContainer) return;
            
            modulesContainer.innerHTML = cached.containerClone;
            const functionPanel = modulesContainer.querySelector('.function-panel');
            if (functionPanel) {
                functionPanel.classList.add('active');
                functionPanel.style.animation = 'fadeIn 0.3s ease';
            }
            
            this.bindCommonEvents(modulesContainer);
            
            // 如果 JS 尚未初始化，则初始化一次
            if (!cached.jsInitialized) {
                this.loadModuleScript(moduleId, modulesContainer);
                cached.jsInitialized = true;
            }
            
            this.updateNavigationState(moduleId);
        },
        
        loadModuleScript: function(moduleId, container) {
            const moduleConfig = modulesConfig[moduleId];
            if (!moduleConfig || !moduleConfig.js) return;
            
            if (moduleRegistry[moduleId]) {
                if (typeof moduleRegistry[moduleId].init === 'function') {
                    moduleRegistry[moduleId].init(container);
                }
                return;
            }
            
            const script = document.createElement('script');
            script.src = moduleConfig.js;
            script.onload = () => {
                console.log(`模块 ${moduleId} 脚本加载完成`);
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
        
        bindCommonEvents: function(container) {
            if (!container) return;
            
            container.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', function() {
                    const parent = this.parentElement;
                    if (parent) parent.style.transform = 'translateY(-1px)';
                });
                input.addEventListener('blur', function() {
                    const parent = this.parentElement;
                    if (parent) parent.style.transform = 'translateY(0)';
                });
            });
            
            container.querySelectorAll('.data-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                });
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
            
            container.querySelectorAll('.stat-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.05)';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                });
            });
        },
        
        registerModule: function(moduleId, module) {
            moduleRegistry[moduleId] = module;
        },
        
        getCurrentModule: function() {
            return currentModule;
        },
        
        getModuleConfig: function(moduleId) {
            return modulesConfig[moduleId];
        },
        
        getAllModules: function() {
            return { ...modulesConfig };
        }
    };
})();

function handleButtonClick(button) {
    if (!button) return;
    const originalText = button.innerHTML;
    const originalWidth = button.offsetWidth;
    button.style.minWidth = originalWidth + 'px';
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    button.disabled = true;
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check-circle"></i> 处理完成';
        button.style.background = 'linear-gradient(135deg, var(--success), #059669)';
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

function handleFileDrop(uploadArea, files) {
    if (!uploadArea || !files || files.length === 0) return;
    const fileName = files[0].name;
    uploadArea.innerHTML = `
        <i class="fas fa-file-excel"></i>
        <p>${fileName}</p>
        <span>文件已选择，点击上传按钮开始处理</span>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    ModulesManager.init();
});
