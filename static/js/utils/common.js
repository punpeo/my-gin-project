/**
 * 公共工具类
 */
const CommonUtils = {
    clickLocks: {},

    /**
     * 绑定防重复点击的按钮事件（自动重置状态）
     * @param {HTMLElement} btn - 按钮元素
     * @param {Function} callback - 业务逻辑（async）
     * @param {string} loadingText - 加载文本
     * @param {HTMLElement} resultEl - 结果元素
     * @param {number} timeout - 超时时间（ms）
     */
    bindPreventRepeatClick: function(btn, callback, loadingText = "处理中...", resultEl = null, timeout = 10000) {
        if (!btn) return;

        // 保存按钮原始文本（核心：自动记录）
        const originalText = btn.textContent;
        const btnKey = btn.id || `btn_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        btn.addEventListener('click', async (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();

            if (this.clickLocks[btnKey]) {
                this.showResult(resultEl, '❌ 操作中，请稍候！', 'error');
                return;
            }

            let timeoutTimer = null;
            try {
                this.clickLocks[btnKey] = true;
                this.setBtnLoading(btn, loadingText); // 设置加载状态

                // 超时自动重置（兜底）
                timeoutTimer = setTimeout(() => {
                    this.clickLocks[btnKey] = false;
                    this.resetBtnStatus(btn, originalText);
                }, timeout);

                // 执行业务逻辑
                await callback(e);

            } catch (err) {
                console.error('业务逻辑执行失败：', err);
                this.showResult(resultEl, '❌ 操作失败：' + err.message, 'error');
            } finally {
                clearTimeout(timeoutTimer);
                this.clickLocks[btnKey] = false;
                // 自动重置按钮状态（核心修复）
                this.resetBtnStatus(btn, originalText);
            }
        });
    },

    // 原有函数保持不变
    postRequest: async function(url, data, isFormData = false) {
        const headers = {};
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: isFormData ? data : JSON.stringify(data),
            credentials: 'same-origin'
        });
    },

    handleFileDownload: async function(res, defaultFileName) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const disposition = res.headers.get('Content-Disposition');
        let fileName = defaultFileName;
        if (disposition) {
            // 优化：兼容两种文件名格式（filename= 和 filename*=）
            const fileNameMatch1 = disposition.match(/filename="?([^";]+)"?/);
            const fileNameMatch2 = disposition.split("filename*=UTF-8''")[1];
            
            if (fileNameMatch2) {
                fileName = decodeURIComponent(fileNameMatch2);
            } else if (fileNameMatch1 && fileNameMatch1[1]) {
                fileName = decodeURIComponent(fileNameMatch1[1]);
            }
            // 兜底：过滤非法字符（可选）
            fileName = fileName.replace(/[\/:*?"<>|]/g, '_');
        }

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return fileName;
    },

    showResult: function(el, msg, type, isHtml = false) {
        if (!el) return;
        if (isHtml) {
            el.innerHTML = msg;
        } else {
            el.textContent = msg;
        }
        el.className = `result ${type}`;
        el.style.display = 'block';
    },

    resetBtnStatus: function(btn, originalText) {
        if (!btn) return;
        btn.disabled = false;
        btn.textContent = originalText;
        btn.classList.remove('loading');
    },

    setBtnLoading: function(btn, loadingText) {
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = loadingText;
        btn.classList.add('loading');
    }
};

window.CommonUtils = CommonUtils;