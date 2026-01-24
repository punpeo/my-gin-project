/**
 * 店铺订单统计业务模块
 */
const ShopOrderModule = {
    init: function() {
        const shopOrderBasePathInput = document.getElementById('shopOrderBasePath');
        const shopOrderStatBtn = document.getElementById('shopOrderStatBtn');
        const shopOrderResult = document.getElementById('shopOrderResult');

        if (!shopOrderStatBtn) return;

        // 改用全局防重复点击工具
        CommonUtils.bindPreventRepeatClick(
            shopOrderStatBtn,
            async () => { // 点击后的业务逻辑
                const basePath = shopOrderBasePathInput.value.trim();
                if (!basePath) {
                    CommonUtils.showResult(shopOrderResult, '请输入文件根目录！', 'error');
                    return;
                }

                shopOrderResult.style.display = 'none';

                try {
                    const res = await CommonUtils.postRequest('/api/v1/shop-order/statistic', {
                        base_path: basePath
                    });

                    const contentType = res.headers.get('Content-Type');
                    if (contentType && contentType.includes('spreadsheetml.sheet')) {
                        const fileName = await CommonUtils.handleFileDownload(res, '店铺订单统计结果.xlsx');
                        
                        // 读取响应头统计数据
                        const shopCount = res.headers.get('X-Shop-Count') || 0;
                        const totalAllNum = res.headers.get('X-Total-All-Num') || 0;
                        const totalAllAmt = res.headers.get('X-Total-All-Amt') || 0;

                        // 展示结果（HTML格式）
                        CommonUtils.showResult(
                            shopOrderResult,
                            `✅ 店铺订单统计完成！<br>
文件已开始下载（${fileName}）<br>
🏪 共统计到 ${shopCount} 个不同店铺的订单数据<br>
📦 总订单数量：${totalAllNum} 单<br>
💰 订单金额总和：${totalAllAmt} 元`,
                            'success',
                            true // 开启HTML解析
                        );
                    } else {
                        const data = await res.json();
                        CommonUtils.showResult(shopOrderResult, '❌ ' + data.msg, 'error');
                    }
                } catch (err) {
                    CommonUtils.showResult(shopOrderResult, '❌ 请求失败：' + err.message, 'error');
                }
            },
            '执行中...', // 加载状态文本
            shopOrderResult  // 结果展示元素
        );
    }
};

window.ShopOrderModule = ShopOrderModule;

// 页面加载完成后初始化（确保仅执行一次）
document.addEventListener('DOMContentLoaded', () => {
    console.log('ShopOrderModule 初始化执行');
    ShopOrderModule.init();
});