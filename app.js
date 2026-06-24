// ============================================================
// APP.JS — Main Controller
// ============================================================

// ---- Navigation ----
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    const target = document.getElementById('page-' + pageName);
    if (target) target.classList.add('active');

    document.querySelectorAll('.menu-item').forEach(m => {
        if (m.getAttribute('onclick')?.includes(`'${pageName}'`)) {
            m.classList.add('active');
        }
    });

    const meta = {
        dashboard: { h:'Command Center',    s:'Real-time productivity intelligence' },
        chat:      { h:'AI Assistant',      s:'Powered by Google Gemini 1.5 Flash' },
        tasks:     { h:'Task Manager',      s:'Organize, prioritize, and execute' },
        goals:     { h:'Goals & Milestones',s:'Track long-term objectives' }
    };

    if (meta[pageName]) {
        document.getElementById('pageHeading').textContent = meta[pageName].h;
        document.getElementById('pageSub').textContent     = meta[pageName].s;
    }

    if (pageName === 'tasks')     renderTasks();
    if (pageName === 'goals')     renderGoals();
    if (pageName === 'dashboard') updateDashboard();
}

// ---- Clock ----
function updateClock() {
    const el  = document.getElementById('clock');
    if (!el)  return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', {
        hour:'2-digit', minute:'2-digit', hour12:true
    });
}
setInterval(updateClock, 1000);
updateClock();

// ---- Chat ----
const inputEl = document.getElementById('userInput');

inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

async function sendChat() {
    const msg = inputEl.value.trim();
    if (!msg) return;

    addMessage('user', msg);
    inputEl.value = '';
    inputEl.style.height = 'auto';

    const typingId = showTyping();

    try {
        const reply  = await askGemini(msg);
        removeTyping(typingId);

        const action = parseAction(reply);
        if (action) await executeAction(action);

        const clean = reply.replace(/```[\s\S]*?```/g,'').replace(/\{[\s\S]*?"action"[\s\S]*?\}/g,'').trim();
        addMessage('ai', clean || 'Action executed successfully.');

    } catch(error) {
        removeTyping(typingId);
        addMessage('ai', `Request failed: ${error.message}\n\nVerify your API key in gemini.js and try again.`);
    }
}

function addMessage(type, text) {
    const container = document.getElementById('chatMessages');
    const el        = document.createElement('div');
    el.className    = `msg ${type === 'user' ? 'user-msg' : 'ai-msg'}`;

    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g,     '<em>$1</em>')
        .replace(/\n/g,             '<br>');

    el.innerHTML = `
        <div class="msg-av ${type === 'user' ? 'user-av' : 'ai-av'}">${type === 'user' ? 'U' : '⚡'}</div>
        <div class="msg-body">
            <div class="msg-sender-name">${type === 'user' ? 'You' : 'DeadlineAI — Gemini'}</div>
            <div class="msg-bubble">${formatted}</div>
        </div>`;

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const id        = 'typing_' + Date.now();
    const container = document.getElementById('chatMessages');
    const el        = document.createElement('div');
    el.id           = id;
    el.className    = 'typing-wrap';
    el.innerHTML    = `
        <div class="msg-av ai-av">⚡</div>
        <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}

function fillChat(text) {
    inputEl.value = text;
    inputEl.focus();
    showPage('chat');
}

function clearChat() {
    resetChat();
    const container = document.getElementById('chatMessages');
    container.innerHTML = `
        <div class="msg ai-msg">
            <div class="msg-av ai-av">⚡</div>
            <div class="msg-body">
                <div class="msg-sender-name">DeadlineAI — Gemini Powered</div>
                <div class="msg-bubble welcome-msg">
                    Conversation cleared. Ready for new instructions.<br>
                    How can I help you perform at your best?
                </div>
            </div>
        </div>`;
}

// ---- Execute AI Actions ----
async function executeAction(action) {
    switch (action.action) {
        case 'add_task':
            if (action.task?.title) {
                const t = addTask(action.task);
                showToast(`Task created: "${t.title}"`, 'success');
            }
            break;

        case 'complete_task':
            if (action.task_id) completeTask(action.task_id);
            break;

        case 'delete_task':
            if (action.task_id) {
                saveTasks(getAllTasks().filter(t => t.id !== action.task_id));
                renderTasks(); updateDashboard();
                showToast('Task removed.', 'info');
            }
            break;

        case 'prioritize':
            showToast('Tasks prioritized by AI.', 'success');
            renderTasks();
            break;

        case 'plan_day':
            if (action.schedule) {
                const plan = action.schedule.map(s => `${s.time}  —  ${s.task}  (${s.duration})`).join('\n');
                showAiPopup('Today\'s Optimized Schedule:\n\n' + plan);
                showToast('Daily plan generated.', 'success');
            }
            break;

        case 'break_goal':
            if (action.goal_id && action.subtasks) {
                const goals = getAllGoals();
                const goal  = goals.find(g => g.id === action.goal_id);
                if (goal) {
                    goal.subtasks = action.subtasks.map(s => ({ text:s, done:false }));
                    saveGoals(goals);
                    renderGoals();
                    showToast('Goal milestones generated.', 'success');
                }
            }
            break;

        case 'reschedule':
            if (action.updates) {
                action.updates.forEach(u => updateTask(u.task_id, { deadline:u.new_deadline }));
                showToast('Tasks rescheduled.', 'success');
            }
            break;
    }
}

// ---- Popups ----
function showAiPopup(content) {
    document.getElementById('aiResult').textContent = content;
    document.getElementById('aiPopup').classList.add('show');
}

function closeAiPopup() {
    document.getElementById('aiPopup').classList.remove('show');
}

// ---- Toast ----
function showToast(msg, type = 'info') {
    const box   = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = `toast t-${type}`;

    const icons = { success:'<i class="fas fa-check-circle" style="color:#43A047;"></i>', error:'<i class="fas fa-circle-xmark" style="color:#E53935;"></i>', info:'<i class="fas fa-circle-info" style="color:#C9A84C;"></i>' };
    toast.innerHTML = `${icons[type] || icons.info} ${msg}`;

    box.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ---- Voice ----
let voiceRec   = null;
let isListening = false;

function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        const btn = document.getElementById('voiceBtn');
        if (btn) { btn.style.opacity = '0.3'; btn.title = 'Voice input not supported in this browser'; }
        return;
    }
    voiceRec = new SR();
    voiceRec.lang = 'en-US';
    voiceRec.continuous = false;
    voiceRec.interimResults = true;

    voiceRec.onstart = () => {
        isListening = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voice-status').textContent = 'Listening... speak now';
    };

    voiceRec.onresult = e => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        inputEl.value    = transcript;
        if (e.results[0].isFinal) {
            document.getElementById('voice-status').textContent = 'Processing...';
            setTimeout(() => { document.getElementById('voice-status').textContent = ''; sendChat(); }, 500);
        }
    };

    voiceRec.onerror = () => {
        stopListening();
        document.getElementById('voice-status').textContent = 'Voice error. Try again.';
        setTimeout(() => { document.getElementById('voice-status').textContent = ''; }, 2000);
    };

    voiceRec.onend = stopListening;
}

function startVoice() {
    if (!voiceRec) { showToast('Voice input requires Chrome browser.', 'info'); return; }
    if (isListening) { voiceRec.stop(); return; }
    voiceRec.start();
}

function stopListening() {
    isListening = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.remove('recording');
    const st = document.getElementById('voice-status');
    if (st?.textContent.includes('Listening')) st.textContent = '';
}

// ---- Sample Data ----
function loadSampleData() {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
    const yesterday= new Date(now); yesterday.setDate(now.getDate() - 1);

    saveTasks([
        {
            id:'sample_1', title:'Submit Q2 Project Report',
            description:'Compile all department data and submit to management before EOD.',
            deadline:tomorrow.toISOString(), priority:'urgent', category:'work',
            estimatedTime:120, status:'pending',
            subtasks:[
                { text:'Gather data from all teams', done:true },
                { text:'Write executive summary',    done:false },
                { text:'Review and proofread',       done:false }
            ],
            createdAt:now.toISOString(), completedAt:null
        },
        {
            id:'sample_2', title:'Pay Electricity Bill',
            description:'Monthly utility payment — overdue by one day.',
            deadline:yesterday.toISOString(), priority:'urgent', category:'finance',
            estimatedTime:10, status:'pending', subtasks:[],
            createdAt:now.toISOString(), completedAt:null
        },
        {
            id:'sample_3', title:'Prepare for Technical Interview',
            description:'Senior developer role at a tier-1 company. Thorough preparation required.',
            deadline:nextWeek.toISOString(), priority:'high', category:'work',
            estimatedTime:180, status:'pending',
            subtasks:[
                { text:'Research company background',   done:true },
                { text:'Practice DSA problems',         done:false },
                { text:'Prepare system design answers', done:false },
                { text:'Prepare questions to ask',      done:false }
            ],
            createdAt:now.toISOString(), completedAt:null
        },
        {
            id:'sample_4', title:'Read Atomic Habits — Chapter 6',
            description:'Continue personal development reading schedule.',
            deadline:null, priority:'low', category:'study',
            estimatedTime:40, status:'pending', subtasks:[],
            createdAt:now.toISOString(), completedAt:null
        },
        {
            id:'sample_5', title:'Morning Workout Session',
            description:'45-minute strength training routine.',
            deadline:null, priority:'medium', category:'health',
            estimatedTime:45, status:'completed', subtasks:[],
            createdAt:now.toISOString(), completedAt:now.toISOString()
        }
    ]);

    saveGoals([{
        id:'goal_1',
        title:'Secure a Senior Developer Role Within 90 Days',
        description:'Land a position at a top-tier technology company with significant compensation growth.',
        targetDate: new Date(now.getTime() + 90*24*60*60*1000).toISOString().split('T')[0],
        category:'career', progress:30,
        subtasks:[
            { text:'Update resume and LinkedIn profile',      done:true },
            { text:'Apply to 30 target companies',           done:false },
            { text:'Complete 5 mock technical interviews',   done:false },
            { text:'Build and deploy a portfolio project',   done:true }
        ],
        createdAt:now.toISOString()
    }]);
}

// ---- Initialize ----
function init() {
    if (!localStorage.getItem('dai_init')) {
        loadSampleData();
        localStorage.setItem('dai_init','true');
    }
    updateDashboard();
    loadInsights();
    initVoice();
    console.log('DeadlineAI initialized — Powered by Google Gemini');
}

init();