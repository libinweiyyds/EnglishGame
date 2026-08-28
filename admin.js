/* ====================================================================
   英语脑力乐园 · 管理员面板脚本
   ==================================================================== */

const ADMIN_PWD = 'cl';
let currentBank = null;
let currentGame = 'match';
let currentDiff = 'easy';
let editingIndex = -1;
let editingIsNew = false;

/* ----- 初始化 ----- */

async function init() {
    // 密码校验（从首页跳转已验证过则跳过）
    const authed = sessionStorage.getItem('brainpark_admin_auth');
    if (authed === '1') {
        sessionStorage.removeItem('brainpark_admin_auth'); // 一次性
    } else {
        showAuthModal();
    }

    // 加载题库
    currentBank = await loadQuestionBank();
    initSelectors();
    renderStats();
    renderQuestionList();

    // 绑定文件输入
    document.getElementById('importFile').addEventListener('change', onImportFile);
    document.getElementById('mergeFile').addEventListener('change', onMergeFile);
}

function showAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    document.getElementById('authPwd').focus();
    document.getElementById('authPwd').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') verifyAuth();
    });

    // ESC 关闭编辑弹窗、点击遮罩关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const editModal = document.getElementById('editModal');
            if (editModal.style.display === 'flex') closeForm();
        }
    });

    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) closeForm();
    });
}

function verifyAuth() {
    const pwd = document.getElementById('authPwd').value;
    if (pwd === ADMIN_PWD) {
        document.getElementById('authModal').style.display = 'none';
    } else {
        alert('密码错误');
        document.getElementById('authPwd').value = '';
        document.getElementById('authPwd').focus();
    }
}

/* ----- 下拉框初始化 ----- */

function initSelectors() {
    const gameSel = document.getElementById('gameSelect');
    gameSel.innerHTML = GAME_TYPES.map(g =>
        `<option value="${g}">${GAME_NAMES[g] || g}</option>`
    ).join('');
    gameSel.value = currentGame;

    const diffSel = document.getElementById('diffSelect');
    diffSel.innerHTML = DIFFICULTIES.map(d =>
        `<option value="${d}">${DIFF_NAMES[d] || d}</option>`
    ).join('');
    diffSel.value = currentDiff;
}

function onGameChange() {
    currentGame = document.getElementById('gameSelect').value;
    renderQuestionList();
}

function onDiffChange() {
    currentDiff = document.getElementById('diffSelect').value;
    renderQuestionList();
}

/* ----- 统计信息 ----- */

function renderStats() {
    let total = 0;
    let gameCount = 0;
    for (const g of GAME_TYPES) {
        let hasGame = false;
        for (const d of DIFFICULTIES) {
            const arr = currentBank[g] && currentBank[g][d];
            if (arr && arr.length > 0) {
                total += arr.length;
                hasGame = true;
            }
        }
        if (hasGame) gameCount++;
    }
    document.getElementById('totalStats').textContent = total;
    document.getElementById('gameStats').textContent = gameCount;
    document.getElementById('storageStats').textContent = hasLocalBank() ? 'localStorage' : '默认题库';
}

/* ----- 题目列表渲染 ----- */

function renderQuestionList() {
    const list = document.getElementById('questionList');
    const arr = (currentBank[currentGame] && currentBank[currentGame][currentDiff]) || [];

    if (arr.length === 0) {
        list.innerHTML = '<div class="empty-hint">当前分类下暂无题目，点击「➕ 新增题目」添加第一道。</div>';
        return;
    }

    list.innerHTML = arr.map((q, i) => {
        const preview = getQuestionPreview(q);
        return `
        <div class="q-item" data-index="${i}">
            <div class="q-index">${i + 1}</div>
            <div class="q-content">
                <div class="q-preview">${escapeHtml(preview)}</div>
                <div class="q-meta">
                    <span class="q-type">${GAME_NAMES[currentGame] || currentGame}</span>
                    <span class="q-diff">${DIFF_NAMES[currentDiff] || currentDiff}</span>
                </div>
            </div>
            <div class="q-actions">
                <button class="mini-btn" onclick="editQuestion(${i})">✏️ 编辑</button>
                <button class="mini-btn btn-del" onclick="deleteQuestion(${i})">🗑 删除</button>
            </div>
        </div>`;
    }).join('');
}

function getQuestionPreview(q) {
    if (!q) return '';
    if (q.question) return q.question;
    if (q.title) return '[案件] ' + q.title;
    if (q.instruction) return q.instruction;
    return JSON.stringify(q).slice(0, 60);
}

/* ----- 新增题目 ----- */

function addNewQuestion() {
    editingIsNew = true;
    editingIndex = -1;
    const game = currentGame;
    const diff = currentDiff;

    // 根据游戏类型生成空模板
    let template;
    if (game === 'detective') {
        template = { title: '', clues: [], options: ['', '', '', ''], answer: '', extra: '' };
    } else if (game === 'groups') {
        template = {
            instruction: '把词拖到正确的分类里。',
            question: '',
            categories: [{ name: '', words: [] }],
            extraWords: [],
            answer: '',
            extra: ''
        };
    } else {
        template = {
            instruction: '',
            question: '',
            options: ['', '', '', ''],
            answer: '',
            extra: ''
        };
    }

    openForm(template, true);
}

/* ----- 编辑题目 ----- */

function editQuestion(index) {
    editingIsNew = false;
    editingIndex = index;
    const arr = currentBank[currentGame][currentDiff];
    const q = JSON.parse(JSON.stringify(arr[index])); // 深拷贝
    openForm(q, false);
}

/* ----- 表单渲染 ----- */

function openForm(question, isNew) {
    const modal = document.getElementById('editModal');
    const group = document.getElementById('formGroup');
    document.getElementById('formTitle').textContent = isNew ? '➕ 新增题目' : `✏️ 编辑第 ${editingIndex + 1} 题`;

    const game = currentGame;
    let html = '';

    // 通用字段
    if (game === 'detective') {
        html += `<label>案件标题 <input type="text" id="f_title" value="${escapeHtml(question.title || '')}" /></label>`;
        html += `<label>线索（每行一条）<textarea id="f_clues" rows="4">${escapeHtml((question.clues || []).join('\n'))}</textarea></label>`;
        html += `<label>选项（每行一个）<textarea id="f_options" rows="4">${escapeHtml((question.options || []).join('\n'))}</textarea></label>`;
        html += `<label>正确答案 <input type="text" id="f_answer" value="${escapeHtml(question.answer || '')}" /></label>`;
        html += `<label>侦探笔记 / 解析 <textarea id="f_extra" rows="2">${escapeHtml(question.extra || '')}</textarea></label>`;
    } else if (game === 'groups') {
        html += `<label>指令 <input type="text" id="f_instruction" value="${escapeHtml(question.instruction || '')}" /></label>`;
        html += `<label>题干（所有词，用逗号分隔） <textarea id="f_question" rows="2">${escapeHtml(question.question || '')}</textarea></label>`;
        html += `<label>分类（JSON 格式，如 [{"name":"水果","words":["apple"]}]）<textarea id="f_categories" rows="4">${escapeHtml(JSON.stringify(question.categories || [], null, 2))}</textarea></label>`;
        html += `<label>干扰词（逗号分隔） <input type="text" id="f_extraWords" value="${escapeHtml((question.extraWords || []).join(','))}" /></label>`;
        html += `<label>正确答案 <input type="text" id="f_answer" value="${escapeHtml(question.answer || '')}" placeholder="如 水果|动物" /></label>`;
        html += `<label>解析 <textarea id="f_extra" rows="2">${escapeHtml(question.extra || '')}</textarea></label>`;
    } else {
        // match / odd / connect / sentence
        html += `<label>指令 <input type="text" id="f_instruction" value="${escapeHtml(question.instruction || '')}" /></label>`;
        html += `<label>题干 <input type="text" id="f_question" value="${escapeHtml(question.question || '')}" /></label>`;
        html += `<label>选项（每行一个，共 4 个）<textarea id="f_options" rows="4">${escapeHtml((question.options || []).join('\n'))}</textarea></label>`;
        html += `<label>正确答案 <input type="text" id="f_answer" value="${escapeHtml(question.answer || '')}" /></label>`;
        html += `<label>解析 <textarea id="f_extra" rows="2">${escapeHtml(question.extra || '')}</textarea></label>`;
    }

    group.innerHTML = html;
    modal.style.display = 'flex';

    // 聚焦第一个输入框
    setTimeout(() => {
        const firstInput = group.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    }, 50);
}

function closeForm() {
    document.getElementById('editModal').style.display = 'none';
    editingIndex = -1;
    editingIsNew = false;
}

/* ----- 保存题目 ----- */

function saveQuestion() {
    const game = currentGame;
    const diff = currentDiff;
    const arr = currentBank[game] || (currentBank[game] = {});
    const diffArr = arr[diff] || (arr[diff] = []);

    let question;
    try {
        question = collectFormData(game);
    } catch (e) {
        alert('表单数据格式错误：' + e.message);
        return;
    }

    if (editingIsNew) {
        diffArr.push(question);
    } else {
        diffArr[editingIndex] = question;
    }

    saveBankToLocal(currentBank);
    closeForm();
    renderQuestionList();
    renderStats();
}

function collectFormData(game) {
    const val = (id) => document.getElementById(id).value.trim();
    const rawArr = (id) => val(id).split('\n').map(s => s.trim()).filter(Boolean);

    if (game === 'detective') {
        return {
            title: val('f_title'),
            clues: rawArr('f_clues'),
            options: rawArr('f_options'),
            answer: val('f_answer'),
            extra: val('f_extra')
        };
    }

    if (game === 'groups') {
        let categories;
        try {
            categories = JSON.parse(val('f_categories') || '[]');
        } catch (e) {
            throw new Error('分类 JSON 格式错误');
        }
        if (!Array.isArray(categories)) throw new Error('分类必须是数组');
        return {
            instruction: val('f_instruction'),
            question: val('f_question'),
            categories,
            extraWords: val('f_extraWords').split(',').map(s => s.trim()).filter(Boolean),
            answer: val('f_answer'),
            extra: val('f_extra')
        };
    }

    // match / odd / connect / sentence
    const options = rawArr('f_options');
    if (options.length < 2) throw new Error('至少需要 2 个选项');
    return {
        instruction: val('f_instruction'),
        question: val('f_question'),
        options,
        answer: val('f_answer'),
        extra: val('f_extra')
    };
}

/* ----- 删除题目 ----- */

function deleteQuestion(index) {
    if (!confirm(`确定删除第 ${index + 1} 题？此操作不可撤销。`)) return;
    const arr = currentBank[currentGame][currentDiff];
    arr.splice(index, 1);
    saveBankToLocal(currentBank);
    renderQuestionList();
    renderStats();
}

/* ----- 清空当前游戏 ----- */

function clearCurrentGame() {
    const gameName = GAME_NAMES[currentGame] || currentGame;
    let totalCount = 0;
    for (const d of DIFFICULTIES) {
        if (currentBank[currentGame] && currentBank[currentGame][d]) {
            totalCount += currentBank[currentGame][d].length;
        }
    }
    if (totalCount === 0) {
        alert(`「${gameName}」当前没有任何题目。`);
        return;
    }
    if (!confirm(`确定清空「${gameName}」的全部 ${totalCount} 道题目？\n此操作不可撤销，建议先导出备份。`)) return;
    if (!confirm(`再次确认：真的要清空「${gameName}」的所有题目吗？`)) return;

    // 清空该游戏下所有难度的题目
    for (const d of DIFFICULTIES) {
        if (!currentBank[currentGame]) break;
        currentBank[currentGame][d] = [];
    }
    saveBankToLocal(currentBank);
    renderQuestionList();
    renderStats();
}

/* ----- 导出 ----- */

function exportBank() {
    try {
        const json = JSON.stringify(currentBank, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainpark-questions-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('导出失败：' + e.message);
    }
}

/* ----- 导入 ----- */

function onImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            if (!parsed || typeof parsed !== 'object') throw new Error('JSON 格式无效');
            if (!confirm('导入将覆盖当前所有题目，确定继续？')) return;
            currentBank = normalizeBank(parsed);
            saveBankToLocal(currentBank);
            renderStats();
            renderQuestionList();
            alert('导入成功！共 ' + countQuestions(currentBank) + ' 题。');
        } catch (err) {
            alert('导入失败：' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

/* ----- 合并 ----- */

function onMergeFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            if (!parsed || typeof parsed !== 'object') throw new Error('JSON 格式无效');
            const incoming = normalizeBank(parsed);
            const mergeStats = mergeBankInto(incoming);
            saveBankToLocal(currentBank);
            renderStats();
            renderQuestionList();
            alert(`合并完成！新增 ${mergeStats.added} 题，更新 ${mergeStats.updated} 题。`);
        } catch (err) {
            alert('合并失败：' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

/* ----- 题库合并逻辑 -----
   规则：按 game+diff 分组，同组内题目逐条比较。
   如果题干(question/title)完全相同 → 更新该题；否则 → 追加为新题。
*/
function mergeBankInto(incoming) {
    let added = 0, updated = 0;
    for (const g of GAME_TYPES) {
        if (!incoming[g]) continue;
        for (const d of DIFFICULTIES) {
            const incArr = incoming[g][d];
            if (!incArr || !Array.isArray(incArr)) continue;
            if (!currentBank[g]) currentBank[g] = {};
            if (!currentBank[g][d]) currentBank[g][d] = [];
            const curArr = currentBank[g][d];

            for (const incQ of incArr) {
                const incKey = getItemKey(incQ);
                const existIdx = curArr.findIndex(q => getItemKey(q) === incKey);
                if (existIdx >= 0) {
                    curArr[existIdx] = incQ;
                    updated++;
                } else {
                    curArr.push(incQ);
                    added++;
                }
            }
        }
    }
    return { added, updated };
}

function getItemKey(q) {
    if (!q) return '';
    return (q.question || q.title || '') + '||' + (q.answer || '');
}

function normalizeBank(bank) {
    // 确保所有 game+diff 都存在
    const result = {};
    for (const g of GAME_TYPES) {
        result[g] = {};
        for (const d of DIFFICULTIES) {
            result[g][d] = [];
        }
    }
    // 填充已有数据
    for (const g of Object.keys(bank)) {
        if (!result[g]) result[g] = {};
        for (const d of Object.keys(bank[g] || {})) {
            if (!result[g][d]) result[g][d] = [];
            const arr = bank[g][d];
            if (Array.isArray(arr)) {
                result[g][d] = arr.filter(q => q && typeof q === 'object');
            }
        }
    }
    return result;
}

function countQuestions(bank) {
    let total = 0;
    for (const g of GAME_TYPES) {
        for (const d of DIFFICULTIES) {
            const arr = bank[g] && bank[g][d];
            if (arr) total += arr.length;
        }
    }
    return total;
}

/* ----- 恢复默认 ----- */

function resetToDefault() {
    if (!confirm('确定要清除本地自定义题库，恢复为默认题库吗？此操作不可撤销。')) return;
    clearLocalBank();
    alert('已恢复默认题库，即将刷新页面…');
    location.reload();
}

/* ----- 启动 ----- */
init();
