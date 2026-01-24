/**
 * 订单汇总业务模块
 */
const OrderModule = {
    init: function() {
        const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
        const usernameSelect = document.getElementById('usernameSelect');
        const excelFileInput = document.getElementById('excelFile');
        const uploadProcessBtn = document.getElementById('uploadProcessBtn');
        const orderResult = document.getElementById('orderResult');
        const duplicateDetail = document.getElementById('duplicateDetail');
        const duplicateList = document.getElementById('duplicateList');

        // 判空处理，避免元素不存在导致报错
        if (!downloadTemplateBtn || !uploadProcessBtn) return;

        // 下载模板（改用全局防重复点击工具）
        CommonUtils.bindPreventRepeatClick(
            downloadTemplateBtn,
            async () => {
                try {
                    const res = await fetch('/api/v1/order/download-template');
                    if (!res.ok) throw new Error('模板下载失败');
                    
                    await CommonUtils.handleFileDownload(res, 'budan.xlsx');
                    CommonUtils.showResult(
                        orderResult,
                        '✅ 模板文件已开始下载（budan.xlsx），请填写店铺名称、订单号、金额后上传',
                        'success'
                    );
                    duplicateDetail.style.display = 'none';
                } catch (err) {
                    CommonUtils.showResult(orderResult, '❌ 模板下载失败：' + err.message, 'error');
                }
            },
            '下载中...',
            orderResult
        );

        // 上传并处理数据（改用全局防重复点击工具）
        CommonUtils.bindPreventRepeatClick(
            uploadProcessBtn,
            async () => {
                const file = excelFileInput.files[0];
                if (!file) {
                    CommonUtils.showResult(orderResult, '❌ 请先选择要上传的Excel文件（.xlsx/.xls）', 'error');
                    duplicateDetail.style.display = 'none';
                    return;
                }

                const fileExt = file.name.split('.').pop().toLowerCase();
                if (fileExt !== 'xlsx' && fileExt !== 'xls') {
                    CommonUtils.showResult(orderResult, '❌ 仅支持.xlsx/.xls格式的Excel文件', 'error');
                    duplicateDetail.style.display = 'none';
                    return;
                }

                const userName = usernameSelect.value.trim();
                const formData = new FormData();
                formData.append('excel_file', file);
                formData.append('username', userName);

                orderResult.style.display = 'none';
                duplicateDetail.style.display = 'none';

                try {
                    const res = await CommonUtils.postRequest('/api/v1/order/upload-process', formData, true);
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.msg || '数据处理失败');
                    }

                    const contentType = res.headers.get('Content-Type');
                    if (contentType.includes('spreadsheetml.sheet')) {
                        const fileName = await CommonUtils.handleFileDownload(res, '订单汇总结果.xlsx');
                        
                        // 读取响应头统计数据
                        const shopCount = res.headers.get('X-Shop-Count') || 0;
                        const totalUniqueOrder = res.headers.get('X-Total-Unique-Order') || 0;
                        const totalUniqueAmount = res.headers.get('X-Total-Unique-Amount') || 0;
                        const totalOrderCount = res.headers.get('X-Total-Order-Count') || 0;
                        const duplicateCount = res.headers.get('X-Duplicate-Count') || 0;

                        let resultMsg = `✅ 数据处理完成！结果文件已开始下载（${fileName}）
📊 汇总${shopCount}家店铺数据
🔍 去重后订单总数：${totalUniqueOrder} | 金额总计：${totalUniqueAmount} 元
📈 全量订单数（含重复）：${totalOrderCount}`;
                        
                        if (duplicateCount > 0) {
                            resultMsg += `\n❌ 检测到${duplicateCount}条重复订单记录`;
                        } else {
                            resultMsg += `\n✅ 未检测到重复订单`;
                        }

                        CommonUtils.showResult(orderResult, resultMsg, 'success');

                        if (duplicateCount > 0) {
                            duplicateDetail.style.display = 'block';
                            duplicateList.textContent = `共${duplicateCount}条重复订单，详情请查看结果文件中的全量汇总表`;
                        }
                    }
                } catch (err) {
                    CommonUtils.showResult(orderResult, '❌ 数据处理失败：' + err.message, 'error');
                } finally {
                    // 清空文件选择框
                    excelFileInput.value = '';
                }
            },
            '处理中...',
            orderResult
        );
    }
};

window.OrderModule = OrderModule;

// 页面加载完成后初始化（确保仅执行一次）
document.addEventListener('DOMContentLoaded', () => {
    console.log('OrderModule 初始化执行');
    OrderModule.init();
});