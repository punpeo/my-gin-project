/**
 * 主入口文件 - 负责全局初始化和导航控制
 * 依赖: modules.js, utils/ui-helpers.js
 */

document.addEventListener('DOMContentLoaded', function() {
    // 等待DOM加载完成后初始化应用
    initApplication();
});

/**
 * 应用初始化函数
 */
function initApplication() {
    console.log('应用初始化开始...');
    
    // 初始化模块系统
    ModulesManager.init();
    
    // 绑定导航事件
    bindNavigationEvents();
    
    // 初始化全局功能
    initGlobalFeatures();
    
    // 加载默认模块
    loadDefaultModule();
    
    console.log('应用初始化完成');
}

/**
 * 绑定导航事件
 */
function bindNavigationEvents() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        // 鼠标悬停切换模块
        item.addEventListener('mouseenter', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            if (target) {
                ModulesManager.setActiveModule(target);
            }
        });
        
        // 点击切换模块（移动端友好）
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            if (target) {
                ModulesManager.setActiveModule(target);
            }
        });
    });
    
    console.log('导航事件绑定完成');
}

/**
 * 初始化全局功能
 */
function initGlobalFeatures() {
    // 更新时间显示
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    
    // 模拟统计数据更新
    setInterval(updateModuleStats, 10000);
    
    // 系统状态指示器
    initSystemStatus();
    
    // 绑定键盘快捷键
    bindKeyboardShortcuts();
}

/**
 * 加载默认模块
 */
function loadDefaultModule() {
    const defaultNavItem = document.querySelector('.nav-item[data-target]');
    if (defaultNavItem) {
        const defaultModule = defaultNavItem.getAttribute('data-target');
        ModulesManager.setActiveModule(defaultModule);
    }
}

/**
 * 更新时间显示
 */
function updateTimeDisplay() {
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

/**
 * 模拟模块统计数据更新
 */
function updateModuleStats() {
    const statsValues = document.querySelectorAll('.stat-value');
    
    statsValues.forEach(stat => {
        if (stat.textContent === '实时') return;
        if (stat.textContent.includes('¥')) return;
        if (stat.textContent.includes('/')) return;
        if (stat.textContent.includes('预计')) return;
        
        const currentValue = parseInt(stat.textContent.replace(/,/g, '').replace('%', ''));
        if (!isNaN(currentValue) && currentValue > 0) {
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

/**
 * 初始化系统状态
 */
function initSystemStatus() {
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
        statusDot.style.animation = 'pulse 2s infinite';
    }
}

/**
 * 绑定键盘快捷键
 */
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + 数字键切换模块 (1-8)
        if (e.altKey && e.key >= '1' && e.key <= '8') {
            const index = parseInt(e.key) - 1;
            const navItems = document.querySelectorAll('.nav-item[data-target]');
            if (navItems[index]) {
                e.preventDefault();
                const target = navItems[index].getAttribute('data-target');
                ModulesManager.setActiveModule(target);
            }
        }
        
        // ESC键回到第一个模块
        if (e.key === 'Escape') {
            e.preventDefault();
            const firstNavItem = document.querySelector('.nav-item[data-target]');
            if (firstNavItem) {
                const target = firstNavItem.getAttribute('data-target');
                ModulesManager.setActiveModule(target);
            }
        }
    });
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { 
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
        }
        50% { 
            opacity: 0.7;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0);
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
