/**
 * 打招呼业务模块
 * 独立封装，仅处理该模块的逻辑
 */
const GreetModule = {
    // 初始化函数（绑定事件）
    init: function() {
        const nameInput = document.getElementById('name');
        const greetBtn = document.getElementById('greetBtn');
        const greetResult = document.getElementById('greetResult');

        // 点击事件
        greetBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            CommonUtils.setBtnLoading(greetBtn, '发送中...');
            CommonUtils.showResult(greetResult, '', 'success', false); // 清空并隐藏
            greetResult.style.display = 'none';

            try {
                const res = await CommonUtils.postRequest('/api/v1/greet', { name });
                const data = await res.json();

                if (data.code === 200) {
                    CommonUtils.showResult(greetResult, data.data.greeting, 'success');
                    nameInput.value = '';
                } else {
                    CommonUtils.showResult(greetResult, '错误：' + data.msg, 'error');
                }
            } catch (err) {
                CommonUtils.showResult(greetResult, '请求失败：' + err.message, 'error');
            } finally {
                CommonUtils.resetBtnStatus(greetBtn, 'Send');
            }
        });

        // 回车事件
        nameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') greetBtn.click();
        });
    }
};

// 暴露到全局
window.GreetModule = GreetModule;