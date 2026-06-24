/**
 * 模块管理器 - 完整修复版
 * 核心修复：所有静态资源路径添加 /static 前缀，适配Cloudflare Tunnel + Gin静态路由
 */
const ModulesManager = (function() {
    let currentModule = null;
    let isHoverEnabled = true;
    let hoverTimer = null;
    
    // 核心修复：所有HTML/JS路径添加 /static 前缀
    const modulesConfig = {
        'excel-sales': { html: '/static/modules/excel-sales.html', js: '/static/js/modules/excel-sales.js', name: 'Excel分组汇总' },
        'excel-fill': { html: '/static/modules/excel-fill.html', js: '/static/js/modules/excel-fill.js', name: 'Excel数据匹配填充' },
        'stock': { html: '/static/modules/stock.html', js: '/static/js/modules/stock.js', name: '库存统计' },
        'order-summary': { html: '/static/modules/order-summary.html', js: '/static/js/modules/order-summary.js', name: '订单汇总' },
        'shop-order': { html: '/static/modules/shop-order.html', js: '/static/js/modules/shop-order.js', name: '店铺订单统计' },
        'cycle-sales': { html: '/static/modules/cycle-sales.html', js: '/static/js/modules/cycle-sales.js', name: '周期销量统计' },
        'product': { html: '/static/modules/product.html', js: '/static/js/modules/product.js', name: '商品信息查询' },
        'product-query': { html: '/static/modules/product-query.html', js: '/static/js/modules/product-query.js', name: '商品查询模块' },
        'kuaimai-product-query': { html: '/static/modules/kuaimai-product-query.html', js: '/static/js/modules/kuaimai-product-query.js', name: '快买商品查询' }
    };
    
    const moduleRegistry = {};
    const moduleCache = {}; // 模块缓存池，存储已加载的 HTML 与 JS 实例

    // 清除悬停计时器
    const clearHoverTimer = function() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    };
    
    return {
        // 初始化模块管理器
        init: function() {
            console.log('模块系统初始化');
            this.setupEventListeners();
            this.bindNavItemEvents();
        },
        
        // 设置全局事件监听
        setupEventListeners: function() {
            // 按钮点击事件
            document.addEventListener('click', function(e) {
                if (e.target.closest('.btn-primary, .btn-secondary, .btn-danger')) {
                    const button = e.target.closest('.btn-primary, .btn-secondary, .btn-danger');
                    if (button) handleButtonClick(button);
                }
                // 文件上传区域点击
                if (e.target.closest('.file-upload-area')) {
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) handleFileUploadClick(uploadArea);
                }
            });
            
            // 文件拖入悬停
            document.addEventListener('dragover', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea) uploadArea.style.borderColor = '#10b981';
                }
            });
            
            // 文件拖放
            document.addEventListener('drop', function(e) {
                if (e.target.closest('.file-upload-area')) {
                    e.preventDefault();
                    const uploadArea = e.target.closest('.file-upload-area');
                    if (uploadArea && e.dataTransfer) handleFileDrop(uploadArea, e.dataTransfer.files);
                }
            });
        },

        // 绑定导航项事件
        bindNavItemEvents: function() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const moduleId = item.getAttribute('data-target');
                if (!moduleId) return;

                // 鼠标悬停
                item.addEventListener('mouseenter', () => {
                    this.setActiveModule(moduleId);
                });

                // 点击切换
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.setActiveModule(moduleId, true);
                });

                // 鼠标离开
                item.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            });

            // 导航容器鼠标离开
            const navContainer = document.querySelector('.nav-container') || document.querySelector('.nav');
            if (navContainer) {
                navContainer.addEventListener('mouseleave', () => {
                    clearHoverTimer();
                });
            }
        },
        
        // 设置激活模块
        setActiveModule: function(moduleId, isClick = false) {
            if (!isHoverEnabled || currentModule === moduleId) return;
            clearHoverTimer();

            // 点击直接加载
            if (isClick) {
                this.loadModule(moduleId);
                return;
            }

            // 悬停延迟加载
            hoverTimer = setTimeout(() => {
                this.loadModule(moduleId);
                clearHoverTimer();
            }, 1000);
        },
        
        // 加载模块
        loadModule: function(moduleId) {
            if (!modulesConfig[moduleId]) {
                console.error(`模块 ${moduleId} 未找到`);
                return;
            }
            
            isHoverEnabled = false;
            currentModule = moduleId;
            this.updateNavigationState(moduleId);
            
            // 优先使用缓存
            if (moduleCache[moduleId]) {
                this.showCachedModule(moduleId);
                isHoverEnabled = true;
                return;
            }
            
            // 显示加载状态
            this.showLoadingState(moduleId);
            // 加载模块内容
            this.loadModuleContent(moduleId);
        },
        
        // 更新导航激活状态
        updateNavigationState: function(moduleId) {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-target') === moduleId) {
                    item.classList.add('active');
                }
            });
        },
        
        // 显示加载状态
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
        
        // 加载模块内容（HTML + JS）
        loadModuleContent: function(moduleId) {
            const moduleConfig = modulesConfig[moduleId];
            const modulesContainer = document.getElementById('modules-container');
            
            if (!moduleConfig || !modulesContainer) {
                console.error('模块配置或容器未找到');
                isHoverEnabled = true;
                return;
            }
            
            // 加载模块HTML（路径已添加/static前缀）
            fetch(moduleConfig.html)
                .then(response => {
                    if (!response.ok) throw new Error(`HTML加载失败 [${response.status}]`);
                    return response.text();
                })
                .then(html => {
                    // 渲染模块HTML
                    modulesContainer.innerHTML = html;
                    const functionPanel = modulesContainer.querySelector('.function-panel');
                    if (functionPanel) {
                        functionPanel.classList.add('active');
                        functionPanel.style.animation = 'fadeIn 0.3s ease';
                    }
                    
                    // 绑定通用事件
                    this.bindCommonEvents(modulesContainer);
                    // 加载模块JS
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
                                    <p>无法加载模块：${error.message}</p>
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
        
        // 显示缓存的模块
        showCachedModule: function(moduleId) {
            const cached = moduleCache[moduleId];
            const modulesContainer = document.getElementById('modules-container');
            if (!cached || !modulesContainer) return;
            
            // 恢复缓存的HTML
            modulesContainer.innerHTML = cached.containerClone;
            const functionPanel = modulesContainer.querySelector('.function-panel');
            if (functionPanel) {
                functionPanel.classList.add('active');
                functionPanel.style.animation = 'fadeIn 0.3s ease';
            }
            
            // 重新绑定事件
            this.bindCommonEvents(modulesContainer);
            
            // 初始化JS（仅第一次加载时执行）
            if (!cached.jsInitialized) {
                this.loadModuleScript(moduleId, modulesContainer);
                cached.jsInitialized = true;
            }
            
            // 更新导航状态
            this.updateNavigationState(moduleId);
        },
        
        // 加载模块JS脚本
        loadModuleScript: function(moduleId, container) {
            const moduleConfig = modulesConfig[moduleId];
            if (!moduleConfig || !moduleConfig.js) return;
            
            // 已注册的模块直接初始化
            if (moduleRegistry[moduleId]) {
                if (typeof moduleRegistry[moduleId].init === 'function') {
                    moduleRegistry[moduleId].init(container);
                }
                return;
            }
            
            // 动态创建script标签加载JS（路径已添加/static前缀）
            const script = document.createElement('script');
            script.src = moduleConfig.js;
            script.type = 'text/javascript';
            
            // 加载成功
            script.onload = () => {
                console.log(`模块 ${moduleId} 脚本加载完成`);
                // 执行模块初始化函数（如 init_excel_sales()）
                const initFuncName = `init${moduleId.replace(/-/g, '_')}`;
                if (typeof window[initFuncName] === 'function') {
                    window[initFuncName](container);
                }
            };
            
            // 加载失败
            script.onerror = (error) => {
                console.warn(`模块 ${moduleId} 脚本加载失败:`, error);
            };
            
            // 添加到页面头部
            if (document.head) {
                document.head.appendChild(script);
            }
        },
        
        // 绑定通用UI事件
        bindCommonEvents: function(container) {
            if (!container) return;
            
            // 输入框焦点事件
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
            
            // 卡片悬浮效果
            container.querySelectorAll('.data-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.15)';
                });
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = 'var(--shadow-md)';
                });
            });
            
            // 统计项悬浮效果
            container.querySelectorAll('.stat-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.05)';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                });
            });
        },
        
        // 注册模块（供外部JS调用）
        registerModule: function(moduleId, module) {
            moduleRegistry[moduleId] = module;
        },
        
        // 获取当前激活的模块
        getCurrentModule: function() {
            return currentModule;
        },
        
        // 获取模块配置
        getModuleConfig: function(moduleId) {
            return modulesConfig[moduleId];
        },
        
        // 获取所有模块配置
        getAllModules: function() {
            return { ...modulesConfig };
        }
    };
})();

// ===================== 通用辅助函数 =====================
/**
 * 按钮点击加载效果
 * @param {HTMLElement} button - 按钮元素
 */
function handleButtonClick(button) {
    if (!button) return;
    const originalText = button.innerHTML;
    const originalWidth = button.offsetWidth;
    const originalBg = button.style.background;
    
    // 设置加载状态
    button.style.minWidth = originalWidth + 'px';
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    button.disabled = true;
    
    // 模拟处理完成
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check-circle"></i> 处理完成';
        button.style.background = 'linear-gradient(135deg, var(--success), #059669)';
        
        // 恢复原始状态
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.minWidth = '';
            button.style.background = originalBg || '';
        }, 3000);
    }, 1500);
}

/**
 * 文件上传区域点击事件
 * @param {HTMLElement} uploadArea - 上传区域元素
 */
function handleFileUploadClick(uploadArea) {
    if (!uploadArea) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv'; // 支持Excel和CSV
    input.multiple = false; // 单次上传一个文件
    
    input.onchange = function(e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            uploadArea.style.borderColor = '#10b981';
            uploadArea.innerHTML = `
                <i class="fas fa-file-excel"></i>
                <p>${fileName}</p>
                <span>文件已选择，点击上传按钮开始处理</span>
            `;
        }
    };
    
    // 触发文件选择框
    input.click();
}

/**
 * 文件拖放事件处理
 * @param {HTMLElement} uploadArea - 上传区域元素
 * @param {FileList} files - 拖放的文件列表
 */
function handleFileDrop(uploadArea, files) {
    if (!uploadArea || !files || files.length === 0) return;
    
    // 仅处理第一个文件
    const fileName = files[0].name;
    uploadArea.style.borderColor = '#10b981';
    uploadArea.innerHTML = `
        <i class="fas fa-file-excel"></i>
        <p>${fileName}</p>
        <span>文件已选择，点击上传按钮开始处理</span>
    `;
}

// 页面加载完成后初始化模块管理器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .function-panel { opacity: 0; }
        .function-panel.active { opacity: 1; }
    `;
    document.head.appendChild(style);
    
    // 初始化模块管理器
    ModulesManager.init();
});