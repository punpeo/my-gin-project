/**
 * 应用入口脚本
 * 负责初始化所有业务模块
 * 新增模块时，只需在这里添加初始化代码即可
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('应用初始化开始...');

    // 定义模块列表（便于维护）
    const modules = [
        { name: 'ExcelProcessModule', desc: 'Excel分组汇总模块' },
        { name: 'ExcelFillModule', desc: 'Excel数据匹配填充模块' },
        { name: 'StockModule', desc: '库存统计模块' },
        { name: 'OrderModule', desc: '订单汇总模块' },
        { name: 'ShopOrderModule', desc: '店铺订单统计模块' },
        { name: 'CycleSalesModule', desc: '产品周期销量统计模块' }
    ];

    // 初始化结果统计
    const result = {
        success: [],    // 初始化成功的模块
        failed: [],     // 初始化失败的模块
        notFound: []    // 未找到的模块
    };

    // 遍历初始化所有模块（无延迟，直接执行）
    modules.forEach(module => {
        const mod = window[module.name];
        // 模块存在且有init方法
        if (mod && typeof mod.init === 'function') {
            try {
                mod.init();
                result.success.push(module);
                console.log(`✅ ${module.desc} 初始化成功`);
            } catch (err) {
                result.failed.push(module);
                console.error(`❌ ${module.desc} 初始化失败：`, err);
            }
        } else {
            // 模块未定义/无init方法
            result.notFound.push(module);
            console.warn(`⚠️ ${module.desc} 未找到或无init方法`);
        }
    });

    // 最终结果汇总
    const total = modules.length;
    const successCount = result.success.length;
    const failedCount = result.failed.length;
    const notFoundCount = result.notFound.length;

    console.log(`\n📊 初始化结果汇总：
- 总模块数：${total}
- 成功：${successCount}
- 失败：${failedCount}
- 未找到：${notFoundCount}`);

    // 异常提示（仅当有未初始化成功的模块时）
    const errorModules = [...result.failed, ...result.notFound];
    if (errorModules.length > 0) {
        const errorMsg = [
            '系统部分模块初始化异常：',
            ...errorModules.map(m => `- ${m.desc}`),
            '\n请检查：',
            '1. 文件是否存在且路径正确',
            '2. 模块是否正确暴露到window',
            '3. 模块是否有init方法'
        ].join('\n');
        
        console.error(`❌ ${errorMsg}`);
        alert(errorMsg);
    } else {
        console.log(`🎉 所有 ${total} 个模块初始化完成！`);
    }
});