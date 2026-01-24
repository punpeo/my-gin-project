/**
 * Excel数据匹配填充业务模块（最终版）
 */
const ExcelFillModule = {
    init: function() {
        // 获取页面元素
        const fillForm = document.getElementById('fillForm');
        const rootDirInput = document.getElementById('rootDir');
        const sourceMatchColInput = document.getElementById('sourceMatchCol');
        const sourceFillColInput = document.getElementById('sourceFillCol');
        const targetMatchColInput = document.getElementById('targetMatchCol');
        const targetValueColInput = document.getElementById('targetValueCol');
        const fillBtn = document.getElementById('fillBtn');
        const fillResult = document.getElementById('fillResult');

        // 元素不存在则直接返回
        if (!fillForm || !fillBtn) return;

        // 绑定按钮事件
        CommonUtils.bindPreventRepeatClick(
            fillBtn,
            async () => {
                // 1. 表单数据校验
                const validateResult = this.validateForm(
                    rootDirInput,
                    sourceMatchColInput,
                    sourceFillColInput,
                    targetMatchColInput,
                    targetValueColInput
                );
                
                if (!validateResult.valid) {
                    CommonUtils.showResult(fillResult, validateResult.msg, 'error');
                    return;
                }

                // 2. 处理路径格式（将反斜杠转换为正斜杠）
                let rootDir = rootDirInput.value.trim();
                rootDir = rootDir.replace(/\\/g, '/'); // 将 \ 替换为 /
                
                // 3. 构建表单数据
                const formData = new URLSearchParams();
                formData.append('root_dir', rootDir);
                formData.append('source_match_col', sourceMatchColInput.value.trim());
                formData.append('source_fill_col', sourceFillColInput.value.trim());
                formData.append('target_match_col', targetMatchColInput.value.trim());
                formData.append('target_value_col', targetValueColInput.value.trim());

                // 4. 发起请求处理数据
                try {
                    const res = await fetch('/api/v1/excel/fill', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData
                    });

                    // 5. 处理响应
                    if (res.ok) {
                        // 处理文件下载
                        const blob = await res.blob();
                        
                        // 生成统一命名的文件名：月日+结果表.xlsx
                        const now = new Date();
                        const month = (now.getMonth() + 1).toString().padStart(2, '0');
                        const day = now.getDate().toString().padStart(2, '0');
                        const fileName = `${month}${day}结果表.xlsx`;
                        
                        // 创建下载链接
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        
                        // 清理
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(downloadUrl);
                        }, 100);
                        
                        // 显示成功消息
                        CommonUtils.showResult(
                            fillResult, 
                            `✅ Excel数据匹配填充完成！`, 
                            'success',
                            true // 开启HTML解析
                        );
                    } else {
                        // 处理错误响应
                        const errorData = await res.json();
                        CommonUtils.showResult(
                            fillResult, 
                            '❌ ' + (errorData.msg || errorData.message || '处理失败'), 
                            'error'
                        );
                    }
                } catch (err) {
                    // 捕获网络异常
                    CommonUtils.showResult(fillResult, '❌ 请求失败：' + err.message, 'error');
                }
            },
            '处理中...',
            fillResult
        );
    },

    /**
     * 表单数据校验
     */
    validateForm: function(rootDir, sourceMatchCol, sourceFillCol, targetMatchCol, targetValueCol) {
        // 校验根目录路径
        if (!rootDir.value.trim()) {
            return { valid: false, msg: '请输入文件根目录路径！' };
        }
        
        // 校验列参数
        const sourceMatchVal = sourceMatchCol.value.trim();
        const sourceFillVal = sourceFillCol.value.trim();
        const targetMatchVal = targetMatchCol.value.trim();
        const targetValueVal = targetValueCol.value.trim();

        if (!sourceMatchVal) {
            return { valid: false, msg: '请填写待输入表匹配列！' };
        }
        if (!sourceFillVal) {
            return { valid: false, msg: '请填写待输入表填充列！' };
        }
        if (!targetMatchVal) {
            return { valid: false, msg: '请填写目标表匹配列！' };
        }
        if (!targetValueVal) {
            return { valid: false, msg: '请填写目标表取值列！' };
        }

        // 校验列格式（字母/字母组合）
        const colPattern = /^[A-Za-z]+$/;
        if (!colPattern.test(sourceMatchVal)) {
            return { valid: false, msg: '待输入表匹配列仅支持字母格式（如A/B/C）！' };
        }
        if (!colPattern.test(sourceFillVal)) {
            return { valid: false, msg: '待输入表填充列仅支持字母格式（如A/B/C）！' };
        }
        if (!colPattern.test(targetMatchVal)) {
            return { valid: false, msg: '目标表匹配列仅支持字母格式（如A/B/C）！' };
        }
        if (!colPattern.test(targetValueVal)) {
            return { valid: false, msg: '目标表取值列仅支持字母格式（如A/B/C）！' };
        }

        // 校验通过
        return { valid: true, msg: '' };
    }
};

// 暴露到全局
window.ExcelFillModule = ExcelFillModule;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('ExcelFillModule 初始化执行');
    ExcelFillModule.init();
});