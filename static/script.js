document.addEventListener('DOMContentLoaded', function() {
    // 模块映射配置
    const modulesConfig = {
        'excel-sales': 'modules/excel-sales.html',
        'excel-fill': 'modules/excel-fill.html', 
        'stock': 'modules/stock.html',
        'order-summary': 'modules/order-summary.html',
        'shop-order': 'modules/shop-order.html',
        'cycle-sales': 'modules/cycle-sales.html',
        'dev-module-1': 'modules/product.html',
        'dev-module-2': 'modules/dev-module-2.html'
    };
    
    // 获取所有导航项
    const navItems = document.querySelectorAll('.nav-item');
    const modulesContainer = document.getElementById('modules-container');
    let currentActiveModule = null;
    let isHoverEnabled = true; // 控制是否启用悬停切换
    
    // 加载模块内容的函数
    function loadModuleContent(moduleId) {
        const moduleUrl = modulesConfig[moduleId];
        
        if (!moduleUrl) {
            console.error('Module not found:', moduleId);
            return;
        }
        
        // 如果正在加载同一个模块，不重复加载
        if (currentActiveModule === moduleId) {
            return;
        }
        
        // 显示加载状态
        modulesContainer.innerHTML = `
            <div class="function-panel active" style="display: block;">
                <div class="dev-panel">
                    <div class="dev-content">
                        <i class="fas fa-spinner fa-spin"></i>
                        <h4>加载中...</h4>
                        <p>正在加载模块内容，请稍候</p>
                    </div>
                </div>
            </div>
        `;
        
        // 从服务器获取模块HTML内容
        fetch(moduleUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                // 移除当前所有模块
                modulesContainer.innerHTML = '';
                
                // 添加新模块
                const moduleElement = document.createElement('div');
                moduleElement.innerHTML = html;
                moduleElement.classList.add('function-panel', 'active');
                
                modulesContainer.appendChild(moduleElement);
                
                // 重新绑定模块内的事件监听器
                bindModuleEvents(moduleElement);
                
                // 更新当前活动模块
                currentActiveModule = moduleId;
                
                // 重新启用悬停功能
                isHoverEnabled = true;
            })
            .catch(error => {
                console.error('Error loading module:', error);
                modulesContainer.innerHTML = `
                    <div class="function-panel active" style="display: block;">
                        <div class="dev-panel">
                            <div class="dev-content">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>加载失败</h4>
                                <p>无法加载模块内容，请检查网络连接或刷新页面重试</p>
                            </div>
                        </div>
                    </div>
                `;
                // 重新启用悬停功能
                isHoverEnabled = true;
            });
    }
    
    // 绑定模块内的事件监听器
    function bindModuleEvents(moduleElement) {
        // 表单输入框聚焦效果
        moduleElement.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.style.transform = 'translateY(-2px)';
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.style.transform = 'translateY(0)';
            });
        });
        
        // 按钮点击效果
        moduleElement.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const originalText = this.innerHTML;
                
                // 显示处理中状态
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
                this.disabled = true;
                
                // 模拟处理过程
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-check-circle"></i> 处理完成';
                    this.style.background = 'linear-gradient(135deg, var(--success), #059669)';
                    
                    // 3秒后恢复原状
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.disabled = false;
                        if (this.classList.contains('btn-primary')) {
                            this.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
                        } else if (this.classList.contains('btn-secondary')) {
                            this.style.background = 'linear-gradient(135deg, var(--secondary), #059669)';
                        } else if (this.classList.contains('btn-danger')) {
                            this.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';
                        }
                    }, 3000);
                }, 1500);
            });
        });
        
        // 文件上传交互
        const fileUploadAreas = moduleElement.querySelectorAll('.file-upload-area');
        fileUploadAreas.forEach(fileUploadArea => {
            if (fileUploadArea.innerHTML.includes('点击或拖拽文件上传')) {
                fileUploadArea.addEventListener('click', function() {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx,.xls';
                    input.onchange = function(e) {
                        if (e.target.files.length > 0) {
                            const fileName = e.target.files[0].name;
                            fileUploadArea.innerHTML = `
                                <i class="fas fa-file-excel" style="color: #10b981;"></i>
                                <p style="color: #10b981; font-weight: 600;">${fileName}</p>
                                <span style="color: #10b981;">文件已选择，点击上传按钮开始处理</span>
                            `;
                        }
                    };
                    input.click();
                });
                
                // 拖拽上传效果
                fileUploadArea.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#10b981';
                    this.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))';
                    this.style.transform = 'scale(1.02)';
                });
                
                fileUploadArea.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#6366f1';
                    this.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.02))';
                    this.style.transform = 'scale(1)';
                });
                
                fileUploadArea.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#10b981';
                    this.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))';
                    
                    if (e.dataTransfer.files.length > 0) {
                        const fileName = e.dataTransfer.files[0].name;
                        this.innerHTML = `
                            <i class="fas fa-file-excel" style="color: #10b981;"></i>
                            <p style="color: #10b981; font-weight: 600;">${fileName}</p>
                            <span style="color: #10b981;">文件已选择，点击上传按钮开始处理</span>
                        `;
                    }
                });
            }
        });
    }
    
    // 添加悬停定时器以防止快速切换
    let hoverTimer = null;
    
    // 鼠标悬停事件处理
    function handleNavItemHover(item) {
        if (!isHoverEnabled) return;
        
        const target = item.getAttribute('data-target');
        
        // 移除所有导航项的active类
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 为当前悬停的导航项添加active类
        item.classList.add('active');
        
        // 如果已经有定时器，清除它
        if (hoverTimer) {
            clearTimeout(hoverTimer);
        }
        
        // 设置新的定时器，300ms延迟后加载模块
        hoverTimer = setTimeout(() => {
            loadModuleContent(target);
            hoverTimer = null;
        }, 300);
    }
    
    // 绑定导航项鼠标悬停事件
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function(e) {
            e.preventDefault();
            handleNavItemHover(this);
        });
        
        // 保留点击事件作为备用
        item.addEventListener('click', function(e) {
            e.preventDefault();
            handleNavItemHover(this);
        });
    });
    
    // 初始化：加载第一个模块
    const firstNavItem = navItems[0];
    const firstModule = firstNavItem.getAttribute('data-target');
    
    // 移除所有导航项的active类
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // 为第一个导航项添加active类
    firstNavItem.classList.add('active');
    
    // 加载第一个模块
    loadModuleContent(firstModule);
    
    // 更新时间显示
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const timeDisplay = document.getElementById('currentTime');
        if (timeDisplay) {
            timeDisplay.textContent = timeString;
        }
    }
    
    // 初始更新时间
    updateTime();
    // 每秒更新一次
    setInterval(updateTime, 1000);
    
    // 模拟模块统计数据更新
    function updateModuleStats() {
        const statsValues = document.querySelectorAll('.stat-value');
        statsValues.forEach(stat => {
            if (stat.textContent === '实时') return;
            if (stat.textContent.includes('¥')) return;
            if (stat.textContent.includes('/')) return;
            if (stat.textContent.includes('预计')) return;
            
            const currentValue = parseInt(stat.textContent.replace(/,/g, '').replace('%', ''));
            if (!isNaN(currentValue)) {
                const randomChange = Math.floor(Math.random() * 20) - 10;
                const newValue = Math.max(0, currentValue + randomChange);
                if (stat.textContent.includes('%')) {
                    stat.textContent = newValue + '%';
                } else {
                    stat.textContent = newValue.toLocaleString();
                }
            }
        });
    }
    
    // 每10秒更新一次统计数据
    setInterval(updateModuleStats, 10000);
    
    // 初始绑定
    bindModuleEvents(document);
});
