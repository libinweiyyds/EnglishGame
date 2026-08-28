/* ====================================================================
   英语脑力乐园 · 公共脚本
   ==================================================================== */

const DIFF_FACES = {
    easy: '😊 简单',
    light: '😌 轻松',
    medium: '😐 中等',
    hard: '😤 困难',
    nightmare: '😈 噩梦'
};

let soundOn = true;
try {
    soundOn = localStorage.getItem('brainpark_sound') !== 'off';
} catch(_) {}

function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem('brainpark_sound', soundOn ? 'on' : 'off'); } catch(_) {}
    updateSoundBtn();
}
function updateSoundBtn() {
    const btn = document.getElementById('soundBtn');
    if (btn) btn.textContent = soundOn ? '🔊 声音: 开' : '🔇 声音: 关';
}
updateSoundBtn();

/* ----- 音效 ----- */
function beep(ok) {
    if (!soundOn) return;
    try {
        const a = new (window.AudioContext || window.webkitAudioContext)();
        const o = a.createOscillator();
        const g = a.createGain();
        o.frequency.value = ok ? 660 : 180;
        o.type = ok ? 'sine' : 'square';
        g.gain.value = 0.04;
        o.connect(g);
        g.connect(a.destination);
        o.start();
        o.stop(a.currentTime + 0.12);
    } catch(_) {}
}
function playPop() { beep(true); }
function playError() { beep(false); }
function playWin() {
    if (!soundOn) return;
    try {
        const a = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((freq, i) => {
            const o = a.createOscillator();
            const g = a.createGain();
            o.frequency.value = freq;
            o.type = 'sine';
            g.gain.value = 0.05;
            o.connect(g);
            g.connect(a.destination);
            o.start(a.currentTime + i * 0.1);
            o.stop(a.currentTime + i * 0.1 + 0.18);
        });
    } catch(_) {}
}

/* ----- 工具 ----- */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getDifficulty() {
    try {
        const d = localStorage.getItem('brainpark_diff');
        if (d) return d;
    } catch(_) {}
    return 'easy';
}

function setDifficultyLocal(diff) {
    try { localStorage.setItem('brainpark_diff', diff); } catch(_) {}
}

/* ----- 加载题库 -----
   优先级：localStorage 自定义题库（用户编辑过的）
            ▶ window.QUESTION_BANK（来自 questions.js）
            ▶ fetch('./questions.json')
            ▶ generateFallbackBank()（最后兜底）
   首次加载时将默认题库存入 localStorage，后续优先使用本地版本。
*/

const LS_BANK_KEY = 'brainpark_question_bank';
const LS_BANK_FLAG = 'brainpark_bank_initialized';

async function loadQuestionBank() {
    // 1. 优先使用 localStorage 中的自定义题库
    try {
        const saved = localStorage.getItem(LS_BANK_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (_) {}

    // 2. 加载默认题库
    let bank = null;
    if (typeof window !== 'undefined' && window.QUESTION_BANK) {
        bank = window.QUESTION_BANK;
    } else {
        try {
            const resp = await fetch('./questions.json');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            bank = await resp.json();
        } catch (e) {
            console.warn('无法加载 questions.json / questions.js，使用备用题库。', e);
            bank = generateFallbackBank();
        }
    }

    // 3. 首次加载：将默认题库存入 localStorage
    try {
        if (!localStorage.getItem(LS_BANK_FLAG)) {
            localStorage.setItem(LS_BANK_KEY, JSON.stringify(bank));
            localStorage.setItem(LS_BANK_FLAG, '1');
        }
    } catch (_) {}

    return bank;
}

/* ----- 题库持久化工具函数 ----- */

function saveBankToLocal(bank) {
    try {
        localStorage.setItem(LS_BANK_KEY, JSON.stringify(bank));
        return true;
    } catch (e) {
        console.error('保存题库到 localStorage 失败:', e);
        return false;
    }
}

function clearLocalBank() {
    try {
        localStorage.removeItem(LS_BANK_KEY);
        localStorage.removeItem(LS_BANK_FLAG);
        return true;
    } catch (_) {
        return false;
    }
}

function getLocalBank() {
    try {
        const saved = localStorage.getItem(LS_BANK_KEY);
        if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
}

function hasLocalBank() {
    try {
        return !!localStorage.getItem(LS_BANK_FLAG);
    } catch (_) {
        return false;
    }
}

/* ----- 题库结构常量 ----- */
const GAME_TYPES = ['match', 'odd', 'connect', 'sentence', 'detective', 'groups'];
const DIFFICULTIES = ['easy', 'light', 'medium', 'hard', 'nightmare'];
const GAME_NAMES = {
    match: '单词配对', odd: '找不同', connect: '词语桥梁',
    sentence: '句子拼拼乐', detective: '小侦探', groups: '分类小达人'
};
const DIFF_NAMES = { easy: '简单', light: '轻松', medium: '中等', hard: '困难', nightmare: '噩梦' };

function generateFallbackBank() {
    const bank = {};
    const games = ['match', 'odd', 'connect', 'sentence', 'detective', 'groups'];
    const difficulties = ['easy', 'light', 'medium', 'hard', 'nightmare'];
    for (const g of games) {
        bank[g] = {};
        for (const d of difficulties) {
            bank[g][d] = [{
                instruction: '试试这道题',
                question: g === 'detective' ? '示例题目' : 'Sample',
                options: ['A', 'B', 'C', 'D'],
                answer: 'A',
                extra: '这是备用题，请检查 questions.json 是否加载成功。'
            }];
        }
    }
    return bank;
}

/* ----- 庆祝特效：撒花 ----- */
function spawnConfetti(container, count = 30) {
    if (!container) return;
    const colors = ['#ff6b6b', '#ff9f43', '#feca57', '#48dbfb', '#a29bfe', '#55c7a6'];
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = Math.random() * 0.5 + 's';
        c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(c);
        setTimeout(() => c.remove(), 3500);
    }
}

function spawnFloatingEmoji(emoji, container) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = emoji;
    el.style.left = (10 + Math.random() * 80) + '%';
    el.style.fontSize = (28 + Math.random() * 28) + 'px';
    if (container) container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

/* ----- 通用提示文本（按游戏类型） ----- */
function getHintByGame(gameId) {
    const hints = {
        match: '💡 提示：先想想这个单词是什么意思，再找对应的中文。',
        odd: '💡 提示：观察这四个词，哪一个不属于同一类？',
        connect: '💡 提示：找出左边一对词的关系，再用到右边。',
        sentence: '💡 提示：英语句子一般是「谁 + 做什么 + 怎么样」。',
        detective: '💡 提示：把每条线索都用上，一步步排除。',
        groups: '💡 提示：看看这些词可以分成哪几类？'
    };
    return hints[gameId] || '💡 提示：再仔细读读题目！';
}


const ZH_EN = {
    "含糊的": "ambiguous",
    "时代错误的": "anachronistic",
    "古老的": "ancient",
    "假设": "assume",
    "球": "ball",
    "床": "bed",
    "仁慈的": "benevolent",
    "大的": "big",
    "鸟": "bird",
    "书": "book",
    "无聊的": "boring",
    "勇敢的": "brave",
    "明亮的": "bright",
    "公共汽车": "bus",
    "刺耳的声音": "cacophony",
    "蛋糕": "cake",
    "汽车": "car",
    "猫": "cat",
    "谨慎的": "cautious",
    "干净的": "clean",
    "寒冷的": "cold",
    "得出结论": "conclude",
    "自信的": "confident",
    "使困惑": "confuse",
    "传达": "convey",
    "说服": "convince",
    "凉爽的": "cool",
    "残忍的": "cruel",
    "好奇的": "curious",
    "下降": "decline",
    "好吃的": "delicious",
    "证明": "demonstrate",
    "书桌": "desk",
    "勤奋的": "diligent",
    "区分": "distinguish",
    "狗": "dog",
    "门": "door",
    "干的": "dry",
    "渴望的": "eager",
    "耳朵": "ear",
    "难以捉摸的": "elusive",
    "忍受": "endure",
    "含糊其辞": "equivocate",
    "博学的": "erudite",
    "激动人心的": "exciting",
    "精疲力尽的": "exhausted",
    "扩展": "expand",
    "眼睛": "eye",
    "著名的": "famous",
    "快的": "fast",
    "鱼": "fish",
    "繁荣": "flourish",
    "愚蠢的": "foolish",
    "脚": "foot",
    "易碎的": "fragile",
    "友善的": "friendly",
    "滑稽的": "funny",
    "唠叨的": "garrulous",
    "慷慨的": "generous",
    "温柔的": "gentle",
    "手": "hand",
    "快乐": "happy",
    "坚硬的": "hard",
    "诚实的": "honest",
    "热的": "hot",
    "谦虚的": "humble",
    "急躁的": "impatient",
    "难以言喻的": "ineffable",
    "影响": "influence",
    "善良的": "kind",
    "简洁的": "laconic",
    "懒惰的": "lazy",
    "忠诚的": "loyal",
    "宽宏大量的": "magnanimous",
    "维持": "maintain",
    "细致的": "meticulous",
    "牛奶": "milk",
    "月亮": "moon",
    "嘴": "mouth",
    "协商": "negotiate",
    "新的": "new",
    "吵闹的": "noisy",
    "鼻子": "nose",
    "使混淆": "obfuscate",
    "获得": "obtain",
    "旧的": "old",
    "炫耀的": "ostentatious",
    "耐心的": "patient",
    "钢笔": "pen",
    "感知": "perceive",
    "敷衍的": "perfunctory",
    "有害的": "pernicious",
    "有洞察力的": "perspicacious",
    "暴躁的": "petulant",
    "有礼貌的": "polite",
    "思考": "ponder",
    "贫穷的": "poor",
    "骄傲的": "proud",
    "追求": "pursue",
    "快速的": "quick",
    "安静的": "quiet",
    "典型的": "quintessential",
    "雨": "rain",
    "顽抗的": "recalcitrant",
    "鲁莽的": "reckless",
    "精炼": "refine",
    "缓解": "relieve",
    "富有的": "rich",
    "粗鲁的": "rude",
    "跑": "run",
    "乐观的": "sanguine",
    "自私的": "selfish",
    "意外的好运": "serendipity",
    "解决": "settle",
    "矮的": "short",
    "害羞的": "shy",
    "慢的": "slow",
    "雪": "snow",
    "柔软的": "soft",
    "复杂的": "sophisticated",
    "零星的": "sporadic",
    "星星": "star",
    "严格的": "strict",
    "固执的": "stubborn",
    "太阳": "sun",
    "偷偷摸摸的": "surreptitious",
    "谄媚者": "sycophant",
    "高的": "tall",
    "等效于": "tantamount",
    "坚韧的": "tenacious",
    "微小的": "tiny",
    "树": "tree",
    "无处不在的": "ubiquitous",
    "多才多艺的": "versatile",
    "替代的": "vicarious",
    "温暖的": "warm",
    "水": "water",
    "湿的": "wet",
    "明智的": "wise",
    "年轻的": "young"
};

/* 查英文：精确优先，去前后缀归一化 */

Object.assign(ZH_EN, {
    "一种动物": "an animal",
    "一种食物": "a food",
    "一种颜色": "a color",
    "一种乐器": "a musical instrument",
    "云朵": "cloud",
    "小的": "small",
    "悲伤": "sad",
    "生气": "angry",
    "害怕": "afraid",
    "跳": "jump",
    "走": "walk",
    "坐": "sit",
    "难吃的": "tasteless",
    "辣的": "spicy",
    "甜的": "sweet",
    "黑暗的": "dark",
    "巨大的": "huge",
    "冷的": "cold",
    "现代的": "modern",
    "坚固的": "solid",
    "一棵树": "a tree",
    "一艘船": "a ship",
    "一匹马": "a horse",
    "一辆车": "a car",
    "一只猫": "a cat",
    "一只狗": "a dog",
    "一本书": "a book",
    "一朵花": "a flower",
    "一颗星": "a star",
    "一个苹果": "an apple",
    "一条鱼": "a fish",
    "一只鸟": "a bird",
    "一栋房子": "a house",
    "一辆汽车": "a car",
    "一个球": "a ball",
    "一扇门": "a door",
    "一把椅子": "a chair",
    "一张桌子": "a table",
    "一盏灯": "a lamp",
    "一张床": "a bed",
    "一个盒子": "a box",
    "一个孩子": "a child",
    "一个男人": "a man",
    "一个女人": "a woman",
    "一个老师": "a teacher",
    "一个学生": "a student",
    "一个医生": "a doctor",
    "一个朋友": "a friend",
    "一个家": "a home",
    "一种水果": "a fruit",
    "一种蔬菜": "a vegetable",
    "一辆自行车": "a bicycle",
    "一架飞机": "an airplane",
    "一列火车": "a train",
    "一只兔子": "a rabbit",
    "一只老鼠": "a mouse",
    "一杯水": "a glass of water",
    "一只杯子": "a cup",
    "一个人": "a person",
    "一种植物": "a plant"
});


Object.assign(ZH_EN, {
    "粗糙的": "rough",
    "吝啬的": "stingy",
    "缓慢的": "slow",
    "平稳的": "smooth",
    "颠簸的": "bumpy",
    "精力充沛的": "energetic",
    "兴奋的": "excited",
    "简单的": "simple",
    "清晰的": "clear",
    "确定的": "certain",
    "未知的": "unknown",
    "脆弱的": "fragile",
    "懦弱的": "cowardly",
    "粗心的": "careless",
    "草率的": "reckless",
    "马虎的": "careless",
    "容易找到的": "easy to find",
    "明显的": "obvious",
    "常见的": "common",
    "使清晰": "clarify",
    "批评者": "critic",
    "领导者": "leader",
    "替代的": "substitute",
    "肤浅的": "shallow",
    "稀有的": "rare",
    "罕见的": "rare",
    "不重要的": "unimportant",
    "临时的": "temporary",
    "天真的": "naive",
    "平凡的": "ordinary",
    "温和的": "gentle",
    "平静的": "calm",
    "不安的": "uneasy",
    "悲伤的": "sad"
});


Object.assign(ZH_EN, {
    "简化": "simplify",
    "阐明": "clarify",
    "迟钝的": "dull",
    "独立者": "individualist",
    "固定的": "fixed"
});

function translateEn(word) {
    if (!word) return null;
    const key = String(word).trim();
    if (ZH_EN[key]) return ZH_EN[key];
    return null;
}

/* ----- 简单安全的 HTML 转义 ----- */
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

/* ----- 中英对照字典（用于错选时显示"英文(中文)"） -----
   按需扩充，覆盖 odd/connect 题库中出现的所有单词。
*/
const EN_ZH = {
    // 水果 / 食物
    apple:'苹果', banana:'香蕉', grape:'葡萄', orange:'橙子', pear:'梨', peach:'桃',
    cherry:'樱桃', strawberry:'草莓', mango:'芒果', papaya:'木瓜', kiwi:'猕猴桃', coconut:'椰子',
    carrot:'胡萝卜', potato:'土豆', tomato:'番茄', onion:'洋葱', lettuce:'生菜', butter:'黄油',
    bread:'面包', rice:'米饭', noodle:'面条', pizza:'披萨', burger:'汉堡', sushi:'寿司',
    cake:'蛋糕', cheese:'奶酪', egg:'鸡蛋', honey:'蜂蜜', meat:'肉', salt:'盐',
    coffee:'咖啡', tea:'茶', juice:'果汁', milk:'牛奶', water:'水', wine:'红酒', beer:'啤酒',
    sugar:'糖', cocoa:'可可', butter2:'黄油',
    // 动物
    cat:'猫', dog:'狗', bird:'鸟', fish:'鱼', rabbit:'兔子', horse:'马', cow:'牛', pig:'猪',
    sheep:'羊', bear:'熊', lion:'狮子', tiger:'老虎', elephant:'大象', monkey:'猴子',
    panda:'熊猫', dolphin:'海豚', whale:'鲸', shark:'鲨鱼', octopus:'章鱼', tuna:'金枪鱼', salmon:'三文鱼',
    sparrow:'麻雀', penguin:'企鹅', eagle:'鹰', owl:'猫头鹰', robin:'知更鸟', hawk:'鹰', bat:'蝙蝠', seal:'海豹',
    wolf:'狼', butterfly:'蝴蝶',
    // 颜色 / 形状
    red:'红色', blue:'蓝色', green:'绿色', yellow:'黄色', pink:'粉色', black:'黑色', white:'白色',
    purple:'紫色', brown:'棕色', orange2:'橙色',
    circle:'圆形', square:'正方形', triangle:'三角形', star:'星形',
    // 情绪 / 感觉
    happy:'开心', sad:'伤心', angry:'生气', excited:'激动', calm:'平静', brave:'勇敢', tired:'累',
    hungry:'饥饿', sleepy:'困', sneaky:'狡猾', chivalrous:'侠义', lazy:'懒惰', royal:'皇家',
    kind:'善良', cunning:'狡猾', honest:'诚实', loyal:'忠诚', cheerful:'快乐',
    // 数字 / 字母 / 时间
    one:'一', two:'二', three:'三', four:'四', five:'五', seven:'七', twelve:'十二',
    a:'a', b:'b', c:'c', d:'d',
    monday:'周一', tuesday:'周二', wednesday:'周三', thursday:'周四', friday:'周五', weekend:'周末',
    january:'一月', february:'二月', march:'三月', april:'四月', june:'六月', august:'八月',
    morning:'早上', afternoon:'下午', noon:'中午', night:'晚上', dawn:'黎明', dusk:'黄昏',
    second:'秒', minute:'分钟', hour:'小时', day:'天', year:'年', season:'季节', century:'世纪',
    // 家庭 / 人
    mother:'妈妈', father:'爸爸', sister:'姐姐', brother:'哥哥', daughter:'女儿', son:'儿子',
    uncle:'叔叔', aunt:'阿姨', lady:'女士', girl:'女孩', woman:'女人', boy:'男孩', man:'男人', baby:'婴儿',
    teacher:'老师', doctor:'医生', nurse:'护士', farmer:'农民', lawyer:'律师', engineer:'工程师',
    dancer:'舞者', painter:'画家', singer:'歌手', writer:'作家', composer:'作曲家',
    mother2:'母亲', sage:'智者', baker:'面包师', enemy:'敌人', sculptor:'雕塑家', driver:'司机',
    king:'国王', queen:'女王', prince:'王子', princess:'公主', knight:'骑士', servant:'仆人',
    shepherd:'牧羊人',
    // 身体
    eye:'眼睛', ear:'耳朵', nose:'鼻子', mouth:'嘴巴', head:'头', arm:'手臂', leg:'腿', foot:'脚', hand:'手',
    hair:'头发', face:'脸', heart:'心脏', brain:'脑', liver:'肝', lung:'肺', stomach:'胃',
    bone:'骨头', skin:'皮肤', skull:'头骨', ribs:'肋骨', spine:'脊柱', vertebrae:'脊椎', kidney:'肾',
    // 衣物
    shirt:'衬衫', pants:'裤子', hat:'帽子', shoe:'鞋子', sock:'袜子', dress:'裙子', belt:'腰带', ring:'戒指',
    crown:'皇冠', necklace:'项链', tiara:'头冠',
    // 学校 / 学习
    pen:'钢笔', pencil:'铅笔', book:'书', ruler:'尺子', eraser:'橡皮', notebook:'笔记本',
    school:'学校', library:'图书馆', classroom:'教室', kitchen:'厨房', gym:'体育馆', office:'办公室',
    museum:'博物馆', park:'公园', shop:'商店', hospital:'医院', shell:'贝壳',
    math:'数学', english:'英语', music:'音乐', art:'美术',
    // 交通工具
    car:'汽车', bus:'公交车', train:'火车', bike:'自行车', plane:'飞机', ship:'船', bicycle:'自行车',
    airplane:'飞机', bicycle2:'自行车',
    // 房间 / 家具
    bed:'床', table:'桌子', chair:'椅子', sofa:'沙发', desk:'书桌',
    bedroom:'卧室', bathroom:'浴室', 'living room':'客厅',
    // 食物 / 地点
    house:'房子', building:'建筑', tree:'树', flower:'花',
    mountain:'山', river:'河', sea:'海', ocean:'海洋', sky:'天空',
    land:'陆地', stone:'石头', wood:'木头', plastic:'塑料', metal:'金属', gem:'宝石', glass:'玻璃',
    crystal:'水晶', leaf:'叶子', root:'根',
    // 天气 / 自然
    sunny:'晴朗', rainy:'下雨', cloudy:'多云', snowy:'下雪', wind:'风',
    summer:'夏天', winter:'冬天', spring:'春天', autumn:'秋天',
    hurricane:'飓风', snow:'雪', rain:'雨', tornado:'龙卷风',
    arctic:'北极', desert:'沙漠', forest:'森林',
    // 动作
    run:'跑', jump:'跳', swim:'游泳', sit:'坐', walk:'走', sing:'唱', dance:'跳舞', sleep:'睡',
    eat:'吃', drink:'喝', cook:'烹饪', read:'读', write:'写', draw:'画', paint:'画',
    fly:'飞', crawl:'爬', cut:'切', wash:'洗', brush:'刷',
    hear:'听', see:'看', smell:'闻', taste:'尝', touch:'触摸',
    pump:'泵', breathe:'呼吸', build:'建造', store:'存储', hold:'握', keep:'保持', release:'释放',
    investigate:'调查', hide:'隐藏',
    'break down':'分解', 'build up':'积累', 'mixing':'混合', 'cooling':'冷却', 'heating':'加热',
    'magnification':'放大', 'absorb':'吸收',
    // 形容词
    hot:'热', cold:'冷', warm:'暖', cool:'凉', fast:'快', slow:'慢', big:'大', small:'小',
    new:'新', old:'旧', tall:'高', short:'短', young:'年轻', beautiful:'美丽', ugly:'丑',
    long:'长', early:'早', late:'晚', loud:'大声', soft:'软', wet:'湿', dry:'干',
    bright:'明亮', dark:'黑暗', heavy:'重', light:'轻', clear:'清晰', right:'对', left:'左',
    up:'上', down:'下', high:'高', low:'低', open:'打开', close:'关闭', full:'满', empty:'空',
    clean:'干净', dirty:'脏', easy:'简单', hard:'难',
    variable:'可变', predictable:'可预测', unknown:'未知', lucky:'幸运',
    large:'大', distant:'遥远', close:'近',
    predictable:'可预测', unknown:'未知',
    // 形容词（程度）
    quick:'快', dull:'钝', sharp:'锐利', brightness:'亮度', heavy2:'重', clear2:'清晰',
    // 时间
    year:'年', century:'世纪',
    // 季节
    season:'季节',
    // 名词（情绪）
    joy:'喜悦', anger:'愤怒', sadness:'悲伤', fear:'恐惧', pity:'怜悯', amusement:'娱乐',
    // 名词（社会）
    society:'社会', truth:'真相',
    // 名词（哲学/心理）
    belief:'信仰', faith:'信仰', orthodoxy:'正统', doubt:'怀疑', creation:'创造',
    interpretation:'解释', criticism:'批评', translation:'翻译',
    // 名词（质量/属性）
    mass:'质量', charge:'电荷', energy:'能量', velocity:'速度',
    pressure:'压力', humidity:'湿度', temperature:'温度',
    weight:'重量', length:'长度', volume:'体积',
    // 名词（数学）
    algebra:'代数', geometry:'几何', calculus:'微积分', topology:'拓扑', logic:'逻辑',
    equation:'方程', theorem:'定理', formula:'公式', hypothesis:'假设', axiom:'公理',
    proof:'证明', observation:'观察', theory:'理论', conclusion:'结论', law:'定律',
    problem:'问题', answer:'答案', number:'数字', graph:'图表', data:'数据',
    average:'平均', ratio:'比例', sum:'和', difference:'差', product:'积', quotient:'商',
    // 名词（科学）
    galaxy:'星系', atom:'原子', molecule:'分子', cell:'细胞', nucleus:'细胞核',
    oxygen:'氧气', nitrogen:'氮气', carbon:'碳', hydrogen:'氢', helium:'氦', mercury:'水星',
    pluto:'冥王星', mars:'火星', venus:'金星', earth:'地球', jupiter:'木星', saturn:'土星',
    gravity:'重力', photosynthesis:'光合作用', respiration:'呼吸', metabolism:'代谢',
    diffusion:'扩散', osmosis:'渗透', catalysis:'催化', mitosis:'有丝分裂', meiosis:'减数分裂',
    reproduction:'繁殖', digestion:'消化', enzyme:'酶', insulin:'胰岛素', hemoglobin:'血红蛋白',
    neuron:'神经元', aorta:'主动脉', 'vena cava':'腔静脉', cochlea:'耳蜗', pulmonary:'肺的',
    // 名词（物理/化学）
    quark:'夸克', lepton:'轻子', boson:'玻色子', fermion:'费米子', photon:'光子',
    proton:'质子', electron:'电子', neutron:'中子',
    relativity:'相对论', quantum:'量子', thermodynamics:'热力学',
    continent:'大陆', country:'国家', peninsula:'半岛', ocean2:'海洋', atlantic:'大西洋',
    asia:'亚洲', africa:'非洲', europe:'欧洲', india:'印度', france:'法国', china:'中国', japan:'日本',
    equator:'赤道', hemisphere:'半球', tropic:'热带', meridian:'经线', latitude:'纬度', longitude:'经度', altitude:'高度',
    atmosphere:'大气层', hydrosphere:'水圈', lithosphere:'岩石圈',
    asteroid:'小行星', satellite:'卫星', telescope:'望远镜',
    // 名词（材料）
    iron:'铁', silver:'银', gold:'金', oil:'石油', gas:'气体',
    // 名词（乐器/音乐）
    piano:'钢琴', guitar:'吉他', violin:'小提琴', drum:'鼓', flute:'长笛', trumpet:'小号',
    symphony:'交响乐', concerto:'协奏曲', sonata:'奏鸣曲',
    // 名词（艺术/文学）
    poetry:'诗歌', poem:'诗', novel:'小说', drama:'戏剧', painting:'画', sculpture:'雕塑',
    sonnet:'十四行诗', haiku:'俳句', limerick:'打油诗', recipe:'食谱',
    comedy:'喜剧', tragedy:'悲剧', farce:'闹剧', satire:'讽刺',
    fiction:'小说', nonfiction:'非虚构', essay:'散文', biography:'传记',
    alliteration:'头韵', rhyme:'押韵', rhythm:'节奏',
    // 名词（学科/学术）
    ontology:'本体论', epistemology:'认识论', axiology:'价值论', aesthetics:'美学',
    ethics:'伦理学', metaphysics:'形而上学',
    renaissance:'文艺复兴', reformation:'改革', enlightenment:'启蒙运动',
    romanticism:'浪漫主义', baroque:'巴洛克', classicism:'古典主义',
    existentialism:'存在主义', phenomenology:'现象学', hermeneutics:'解释学',
    stoicism:'斯多葛主义', skepticism:'怀疑主义', cynicism:'犬儒主义',
    communism:'共产主义',
    // 名词（文学人物）
    shakespeare:'莎士比亚', plato:'柏拉图', aristotle:'亚里士多德', socrates:'苏格拉底', caesar:'凯撒',
    newton:'牛顿', galileo:'伽利略', einstein:'爱因斯坦', darwin:'达尔文',
    mendel:'孟德尔', hume:'休谟', kant:'康德', saussure:'索绪尔', byronic:'拜伦式',
    machiavellian:'马基雅维利式', quixotic:'唐吉诃德式',
    // 名词（数学概念）
    fractal:'分形', fibonacci:'斐波那契', algorithm:'算法',
    empirical:'经验', theoretical:'理论', pragmatic:'实用', nocturnal:'夜间',
    inductive:'归纳', deductive:'演绎', abductive:'溯因',
    subjunctive:'虚拟', indicative:'直陈', imperative:'祈使', comparative:'比较',
    semantics:'语义', syntax:'句法', phonetics:'语音学', genetics:'遗传学',
    // 名词（音韵）
    aphorism:'格言', epigram:'警句', anagram:'字谜',
    // 名词（化学过程）
    sublimation:'升华', evaporation:'蒸发', condensation:'凝结',
    // 名词（地理）
    peninsula:'半岛', continent:'大陆',
    // 名词（情感修辞）
    hubris:'傲慢', catharsis:'净化', pathos:'哀怜',
    // 名词（杂项）
    luck:'运气', chance:'机会', complexity:'复杂', frequency:'频率', popularity:'流行',
    duty:'责任', result:'结果', complex:'复杂', simple:'简单',
    whole:'整体', middle:'中间', start:'开始', ancestry:'祖先', size:'大小',
    function:'功能', action:'行动', desire:'欲望', obligation:'义务',
    auditory:'听觉', olfactory:'嗅觉', visual:'视觉', tactile:'触觉',
    // 名词（艺术修辞）
    alliteration:'头韵',
    // 名词（文学）
    rhyme:'韵', rhythm:'节奏', tone:'语调', motif:'主题', imagery:'意象',
    // 形容词（描述性格）
    hot2:'热', cool2:'凉',
    // 名词（4种性格）
    choleric:'胆汁质', sanguine:'多血质', melancholic:'抑郁质', phlegmatic:'黏液质',
    // 形容词（颜色形容词比较级）
    bigger:'更大', smaller:'更小', higher:'更高', lower:'更低',
    // 副词 / 比较
    faster:'更快', slower:'更慢', better:'更好', worse:'更差',
    // 名词（人际关系）
    empathy:'同理心', sympathy:'同情',
    // 形容词（状态）
    dense:'密集', light2:'轻', swollen:'肿胀', empty2:'空', clear3:'清晰',
    // 复数
    proteins:'蛋白质', genes:'基因', cells:'细胞', organs:'器官',
    colors:'颜色', shapes:'形状', words:'词语', notes:'笔记',
    plants:'植物', clouds:'云', rocks:'石头', animals:'动物',
    // 名词（人/称谓）
    title:'标题', theme:'主题',
    // 数值相关
    '3 lines':'三行', '5 lines':'五行', '7 lines':'七行', '10 lines':'十行',
    // 形容词（数量）
    mass2:'质量', charge2:'电荷', energy2:'能量', velocity2:'速度', power:'力量',
    // 名词（形状相关）
    north:'北', south:'南', east:'东', west:'西',
    // 工具/文具
    brush2:'刷子', marker:'马克笔', crayon:'蜡笔',
    // 名词（容器）
    cage:'笼子', den:'兽穴', hive:'蜂巢', pond:'池塘', nest:'鸟巢', shell2:'贝壳',
    // 名词（建筑部件）
    floor:'地板', surface:'表面', bottom:'底部', depth:'深度',
    // 形容词（描述）
    loud2:'响亮', soft2:'柔软',
    // 名词（动物住所）
    flock:'羊群', swarm:'蜂群', pack:'狼群', herd:'兽群', pride:'狮群',
    // 名词（生物）
    seed:'种子',
    // 形容词（哲学）
    intuitive:'直觉', rational:'理性',
    // 形容词（语法）
    destructive:'破坏', constructive:'建设',
    // 形容词（科学）
    continental:'大陆', oceanic:'海洋',
    // 名词（文学流派）
    symbolism:'象征主义', realism:'现实主义', naturalism:'自然主义',
    // 名词（音乐理论）
    consonance:'谐音', dissonance:'不谐音', harmony:'和声', melody:'旋律',
    // 名词（颜色）
    gold2:'金',
    // 名词（更多信息）
    orbit:'轨道', eclipse:'日食', rotation:'自转', revolution:'公转',
    electron2:'电子', nucleus2:'核', quark2:'夸克',
    // 形容词（人）
    tall2:'高', short2:'短',
    // 名词（机械）
    wheel:'轮子', net:'网', cockpit:'驾驶舱', touch:'触摸',
    // 形容词（光）
    translucent:'半透明', transparent:'透明', opaque:'不透明',
    // 名词（声音）
    sound:'声音',
    // 名词（数学）
    conic:'圆锥', parabola:'抛物线', ellipse:'椭圆', hyperbola:'双曲线',
    // 名词（科学）
    laser:'激光', radar:'雷达', sonar:'声呐',
    // 名词（修辞）
    irony:'讽刺', sarcasm:'嘲讽', metaphor:'隐喻', simile:'明喻',
    // 名词（波浪）
    wavelength:'波长', amplitude:'振幅', frequency2:'频率',
    // 名词（力量）
    force:'力', pressure2:'压力', torque:'扭矩',
    // 名词（电学）
    voltage:'电压', current:'电流', resistance:'电阻', capacitance:'电容',
    // 形容词（杂项）
    innovative:'创新', conservative:'保守', progressive:'进步', radical:'激进'
};

/* 查中文翻译：优先精确匹配，其次做基本归一化（去 s/es、ing/ed），找不到则返回 null */
function translateZh(word) {
    if (!word) return null;
    const key = String(word).trim().toLowerCase();
    if (EN_ZH[key]) return EN_ZH[key];
    const stripped = key.replace(/(ing|ed|es|s)$/i, '');
    if (EN_ZH[stripped]) return EN_ZH[stripped];
/* ----- 补充 EN_ZH 字典（额外词汇） ----- */
Object.assign(EN_ZH, {
    "ambiguous": "含糊的",
    "anachronistic": "时代错误的",
    "ancient": "古老的",
    "assume": "假设",
    "ball": "球",
    "bed": "床",
    "benevolent": "仁慈的",
    "big": "大的",
    "bird": "鸟",
    "book": "书",
    "boring": "无聊的",
    "brave": "勇敢的",
    "bright": "明亮的",
    "bus": "公共汽车",
    "cacophony": "刺耳的声音",
    "cake": "蛋糕",
    "car": "汽车",
    "cat": "猫",
    "cautious": "谨慎的",
    "clean": "干净的",
    "cold": "寒冷的",
    "conclude": "得出结论",
    "confident": "自信的",
    "confuse": "使困惑",
    "convey": "传达",
    "convince": "说服",
    "cool": "凉爽的",
    "cruel": "残忍的",
    "curious": "好奇的",
    "decline": "下降",
    "delicious": "好吃的",
    "demonstrate": "证明",
    "desk": "书桌",
    "diligent": "勤奋的",
    "distinguish": "区分",
    "dog": "狗",
    "door": "门",
    "dry": "干的",
    "eager": "渴望的",
    "ear": "耳朵",
    "elusive": "难以捉摸的",
    "endure": "忍受",
    "equivocate": "含糊其辞",
    "erudite": "博学的",
    "exciting": "激动人心的",
    "exhausted": "精疲力尽的",
    "expand": "扩展",
    "eye": "眼睛",
    "famous": "著名的",
    "fast": "快的",
    "fish": "鱼",
    "flourish": "繁荣",
    "foolish": "愚蠢的",
    "foot": "脚",
    "fragile": "易碎的",
    "friendly": "友善的",
    "funny": "滑稽的",
    "garrulous": "唠叨的",
    "generous": "慷慨的",
    "gentle": "温柔的",
    "hand": "手",
    "happy": "快乐",
    "hard": "坚硬的",
    "honest": "诚实的",
    "hot": "热的",
    "humble": "谦虚的",
    "impatient": "急躁的",
    "ineffable": "难以言喻的",
    "influence": "影响",
    "kind": "善良的",
    "laconic": "简洁的",
    "lazy": "懒惰的",
    "loyal": "忠诚的",
    "magnanimous": "宽宏大量的",
    "maintain": "维持",
    "meticulous": "细致的",
    "milk": "牛奶",
    "moon": "月亮",
    "mouth": "嘴",
    "negotiate": "协商",
    "new": "新的",
    "noisy": "吵闹的",
    "nose": "鼻子",
    "obfuscate": "使混淆",
    "obtain": "获得",
    "old": "旧的",
    "ostentatious": "炫耀的",
    "patient": "耐心的",
    "pen": "钢笔",
    "perceive": "感知",
    "perfunctory": "敷衍的",
    "pernicious": "有害的",
    "perspicacious": "有洞察力的",
    "petulant": "暴躁的",
    "polite": "有礼貌的",
    "ponder": "思考",
    "poor": "贫穷的",
    "proud": "骄傲的",
    "pursue": "追求",
    "quick": "快速的",
    "quiet": "安静的",
    "quintessential": "典型的",
    "rain": "雨",
    "rapid": "快的",
    "recalcitrant": "顽抗的",
    "reckless": "鲁莽的",
    "refine": "精炼",
    "relieve": "缓解",
    "rich": "富有的",
    "rude": "粗鲁的",
    "run": "跑",
    "sanguine": "乐观的",
    "selfish": "自私的",
    "serendipity": "意外的好运",
    "settle": "解决",
    "short": "矮的",
    "shy": "害羞的",
    "slow": "慢的",
    "snow": "雪",
    "soft": "柔软的",
    "sophisticated": "复杂的",
    "sporadic": "零星的",
    "star": "星星",
    "strict": "严格的",
    "stubborn": "固执的",
    "sun": "太阳",
    "surreptitious": "偷偷摸摸的",
    "sycophant": "谄媚者",
    "tall": "高的",
    "tantamount": "等效于",
    "tenacious": "坚韧的",
    "tiny": "微小的",
    "tree": "树",
    "ubiquitous": "无处不在的",
    "versatile": "多才多艺的",
    "vicarious": "替代的",
    "warm": "温暖的",
    "water": "水",
    "wet": "湿的",
    "wise": "明智的",
    "young": "年轻的"
});

    return null;
}
