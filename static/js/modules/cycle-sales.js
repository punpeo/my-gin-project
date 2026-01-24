/**
 * 产品周期销量统计业务模块
 * 核心逻辑：传递根目录、文件名、起始列、结束列给后端，处理偶数列数据，计算列差值（销量）
 */
const CycleSalesModule = {
    init: function() {
        // 获取DOM元素
        const cycleBasePathInput = document.getElementById('cycleBasePath');
        const cycleBaseFileNameInput = document.getElementById('cycleBaseFileName');
        const startColumnSelect = document.getElementById('startColumn');
        const endColumnSelect = document.getElementById('endColumn');
        const cycleSalesBtn = document.getElementById('cycleSalesBtn');
        const cycleSalesResult = document.getElementById('cycleSalesResult');

        // 判空处理，避免元素不存在导致报错
        if (!cycleSalesBtn) return;

        // 点击执行统计按钮事件（改用全局防重复点击工具）
        CommonUtils.bindPreventRepeatClick(
            cycleSalesBtn,
            async () => {
                // 获取表单参数
                const basePath = cycleBasePathInput.value.trim();
                const baseFileName = cycleBaseFileNameInput.value.trim() || 'kucun.xlsx';
                const startColumn = startColumnSelect.value.trim().toUpperCase(); // 确保大写
                const endColumn = endColumnSelect.value.trim().toUpperCase();

                // 基础参数校验
                if (!basePath) {
                    CommonUtils.showResult(cycleSalesResult, '请输入文件根目录！', 'error');
                    return;
                }
                if (!/^[A-Z]$/.test(startColumn) || !/^[A-Z]$/.test(endColumn)) {
                    CommonUtils.showResult(cycleSalesResult, '列选择必须是单个英文字母！', 'error');
                    return;
                }

                cycleSalesResult.style.display = 'none';

                try {
                    // 构造请求参数（传递给后端的核心参数）
                    const requestData = {
                        base_path: basePath,          // 根目录
                        base_file_name: baseFileName, // 基准文件名
                        start_column: startColumn,    // 起始列（如C）
                        end_column: endColumn         // 结束列（如D）
                    };

                    // 发送POST请求到后端
                    const res = await CommonUtils.postRequest('/api/v1/cycle-sales/statistic', requestData);
                    
                    // 处理响应（后端返回Excel文件）
                    const contentType = res.headers.get('Content-Type');
                    if (contentType && contentType.includes('spreadsheetml.sheet')) {
                        // 解析后端返回的文件名（天数_销量统计.xlsx）
                        const disposition = res.headers.get('Content-Disposition');
                        let fileName = '周期销量统计结果.xlsx';
                        if (disposition) {
                            const fileNameMatch = disposition.split("filename*=UTF-8''")[1];
                            if (fileNameMatch) {
                                fileName = decodeURIComponent(fileNameMatch);
                            }
                        }

                        // 处理文件下载
                        await CommonUtils.handleFileDownload(res, fileName);

                        // 读取后端响应头的统计信息（可选，用于前端展示）
                        const productCount = res.headers.get('X-Product-Count') || 0; // 统计产品数
                        const totalSales = res.headers.get('X-Total-Sales') || 0;     // 总销量
                        const cycleDays = res.headers.get('X-Cycle-Days') || 0;       // 周期天数

                        // 展示成功结果
                        CommonUtils.showResult(
                            cycleSalesResult,
                            `✅ 产品周期销量统计完成！
📁 结果文件已开始下载（${fileName}）
📊 共统计 ${productCount} 个产品的销量数据
📅 统计周期：${cycleDays} 天`,
                            'success'
                        );
                    } else {
                        // 处理后端返回的错误信息
                        const data = await res.json();
                        CommonUtils.showResult(cycleSalesResult, '❌ ' + data.msg, 'error');
                    }
                } catch (err) {
                    // 捕获网络/系统错误
                    CommonUtils.showResult(cycleSalesResult, '❌ 请求失败：' + err.message, 'error');
                }
            },
            '统计中...', // 加载状态文本
            cycleSalesResult // 结果展示元素
        );
    }
};

// 暴露到全局
window.CycleSalesModule = CycleSalesModule;

// 页面加载完成后初始化（确保仅执行一次）
document.addEventListener('DOMContentLoaded', () => {
    console.log('CycleSalesModule 初始化执行');
    CycleSalesModule.init();
});