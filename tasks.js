// ============================================================
// TASK MANAGEMENT — CRUD + Rendering
// ============================================================

// ---- Storage ----
function getAllTasks() {
    return JSON.parse(localStorage.getItem('dai_tasks') || '[]');
}

function saveTasks(tasks) {
    localStorage.setItem('dai_tasks', JSON.stringify(tasks));
}

function getAllGoals() {
    return JSON.parse(localStorage.getItem('dai_goals') || '[]');
}

function saveGoals(goals) {
    localStorage.setItem('dai_goals', JSON.stringify(goals));
}

function makeId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
}

// ---- Task Operations ----
function addTask(data) {
    const tasks = getAllTasks();
    const task = {
        id:            makeId(),
        title:         data.title         || 'Untitled Task',
        description:   data.description   || '',
        deadline:      data.deadline       || null,
        priority:      data.priority       || 'medium',
        category:      data.category       || 'personal',
        estimatedTime: parseInt(data.estimatedTime) || 30,
        status:        'pending',
        subtasks:      data.subtasks       || [],
        createdAt:     new Date().toISOString(),
        completedAt:   null
    };
    tasks.push(task);
    saveTasks(tasks);
    renderTasks();
    updateDashboard();
    return task;
}

function updateTask(taskId, changes) {
    const tasks = getAllTasks();
    const i = tasks.findIndex(t => t.id === taskId);
    if (i !== -1) {
        tasks[i] = { ...tasks[i], ...changes };
        saveTasks(tasks);
        renderTasks();
        updateDashboard();
    }
}

function deleteTask(taskId) {
    if (!confirm('Permanently delete this task?')) return;
    saveTasks(getAllTasks().filter(t => t.id !== taskId));
    renderTasks();
    updateDashboard();
    showToast('Task removed.', 'info');
}

function completeTask(taskId) {
    updateTask(taskId, { status:'completed', completedAt:new Date().toISOString() });
    showToast('Task completed. Well done.', 'success');
}

// ---- Priority Scoring ----
function getPriorityScore(task) {
    const w = { urgent:4, high:3, medium:2, low:1 };
    let score = w[task.priority] || 1;
    if (task.deadline) {
        const hrs = (new Date(task.deadline) - new Date()) / 3600000;
        if (hrs < 0)   score += 10;
        else if (hrs < 24) score += 5;
        else if (hrs < 72) score += 2;
    }
    return score;
}

function getDeadlineText(deadline) {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (diff < 0)    return { text:'OVERDUE',          isUrgent:true };
    if (hrs < 24)    return { text:`${hrs}h remaining`, isUrgent:true };
    if (days < 3)    return { text:`${days}d remaining`, isUrgent:false };
    return { text: new Date(deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'}), isUrgent:false };
}

// ---- Render Tasks ----
function renderTasks() {
    const grid = document.getElementById('tasksGrid');
    if (!grid) return;

    let tasks = getAllTasks();

    const search  = (document.getElementById('searchBox')?.value  || '').toLowerCase();
    const priVal  = document.getElementById('filterPri')?.value   || 'all';
    const statVal = document.getElementById('filterStat')?.value  || 'all';

    if (search)          tasks = tasks.filter(t => t.title.toLowerCase().includes(search) || (t.description||'').toLowerCase().includes(search));
    if (priVal  !== 'all') tasks = tasks.filter(t => t.priority === priVal);
    if (statVal !== 'all') tasks = tasks.filter(t => t.status   === statVal);

    tasks.sort((a,b) => getPriorityScore(b) - getPriorityScore(a));

    if (tasks.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:64px;color:var(--gray-5);">
                <i class="fas fa-inbox" style="font-size:2.5rem;margin-bottom:14px;display:block;opacity:0.4;"></i>
                <p style="font-weight:600;font-size:0.95rem;color:var(--gray-4);">No tasks found.</p>
                <p style="font-size:0.83rem;margin-top:6px;">Create a task using the button above or tell the AI Assistant.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = tasks.map(task => buildTaskCard(task)).join('');
}

function buildTaskCard(task) {
    const dl         = getDeadlineText(task.deadline);
    const isComplete = task.status === 'completed';

    const priLabel = { urgent:'Critical', high:'High', medium:'Medium', low:'Low' };
    const catLabel = { work:'Work', study:'Study', personal:'Personal', health:'Health', finance:'Finance' };

    let subtasksHTML = '';
    if (task.subtasks?.length > 0) {
        subtasksHTML = `<div class="subtasks-wrap">`;
        task.subtasks.slice(0,4).forEach((st,idx) => {
            const txt  = typeof st === 'string' ? st : st.text;
            const done = typeof st === 'object'  ? st.done : false;
            subtasksHTML += `
                <div class="subtask-row ${done ? 'st-done' : ''}" onclick="toggleSubtask('${task.id}',${idx})">
                    <div class="subtask-check">${done ? '✓' : ''}</div>
                    <span>${txt}</span>
                </div>`;
        });
        if (task.subtasks.length > 4) {
            subtasksHTML += `<div class="subtask-row" style="color:var(--gold);font-weight:600;font-size:0.76rem;">
                +${task.subtasks.length - 4} additional steps</div>`;
        }
        subtasksHTML += `</div>`;
    }

    return `
    <div class="task-card p-${task.priority} ${isComplete ? 'is-done' : ''}">
        <div class="tc-header">
            <div class="tc-title ${isComplete ? 'done-title' : ''}">${task.title}</div>
            <span class="pri-pill">${priLabel[task.priority] || 'Medium'}</span>
        </div>
        ${task.description ? `<p class="tc-desc">${task.description}</p>` : ''}
        ${subtasksHTML}
        <div class="tc-meta">
            <span class="meta-chip"><i class="fas fa-tag" style="font-size:0.6rem;"></i> ${catLabel[task.category] || task.category}</span>
            ${task.estimatedTime ? `<span class="meta-chip"><i class="fas fa-hourglass-half" style="font-size:0.6rem;"></i> ${task.estimatedTime}m</span>` : ''}
            ${dl ? `<span class="meta-chip ${dl.isUrgent ? 'overdue' : ''}"><i class="fas fa-calendar" style="font-size:0.6rem;"></i> ${dl.text}</span>` : ''}
            <span class="meta-chip"><i class="fas fa-circle" style="font-size:0.45rem;"></i> ${isComplete ? 'Completed' : 'Pending'}</span>
        </div>
        <div class="tc-actions">
            ${!isComplete ? `<button class="ta-btn ta-done" onclick="completeTask('${task.id}')"><i class="fas fa-check"></i> Complete</button>` : ''}
            <button class="ta-btn ta-edit" onclick="editTask('${task.id}')"><i class="fas fa-pen"></i> Edit</button>
            <button class="ta-btn ta-del"  onclick="deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
        </div>
    </div>`;
}

function toggleSubtask(taskId, idx) {
    const tasks = getAllTasks();
    const task  = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (typeof task.subtasks[idx] === 'string') {
        task.subtasks[idx] = { text:task.subtasks[idx], done:true };
    } else {
        task.subtasks[idx].done = !task.subtasks[idx].done;
    }
    saveTasks(tasks);
    renderTasks();
}

function filterTasks() { renderTasks(); }

// ---- Task Modal ----
function openAddTask() {
    document.getElementById('inp-title').value    = '';
    document.getElementById('inp-desc').value     = '';
    document.getElementById('inp-deadline').value = '';
    document.getElementById('inp-priority').value = 'medium';
    document.getElementById('inp-category').value = 'work';
    document.getElementById('inp-time').value     = '';
    document.getElementById('inp-aibreak').checked = false;
    const btn = document.querySelector('#taskPopup .btn-primary');
    if (btn) btn.dataset.editId = '';
    document.getElementById('taskPopup').classList.add('show');
}

function closeAddTask() {
    document.getElementById('taskPopup').classList.remove('show');
}

async function saveTask() {
    const title = document.getElementById('inp-title').value.trim();
    if (!title) { showToast('Task title is required.', 'error'); return; }

    const data = {
        title,
        description:   document.getElementById('inp-desc').value.trim(),
        deadline:      document.getElementById('inp-deadline').value || null,
        priority:      document.getElementById('inp-priority').value,
        category:      document.getElementById('inp-category').value,
        estimatedTime: document.getElementById('inp-time').value || 30
    };

    const btn    = document.querySelector('#taskPopup .btn-primary');
    const editId = btn?.dataset?.editId;

    if (editId) {
        updateTask(editId, data);
        if (btn) btn.dataset.editId = '';
        showToast('Task updated successfully.', 'success');
    } else {
        const newTask = addTask(data);
        showToast(`Task created: "${title}"`, 'success');

        if (document.getElementById('inp-aibreak').checked) {
            showToast('AI is generating subtasks...', 'info');
            try {
                const resp   = await askGemini(`Break this task into 4-5 specific, actionable subtasks: "${newTask.title}". Return JSON only: {"action":"break_task","subtasks":["step 1","step 2","step 3"]}`);
                conversationHistory = conversationHistory.slice(0,-2);
                const action = parseAction(resp);
                if (action?.subtasks) {
                    updateTask(newTask.id, { subtasks: action.subtasks.map(s => ({ text:s, done:false })) });
                    showToast('AI subtasks generated.', 'success');
                }
            } catch(e) { showToast('Subtask generation failed.', 'error'); }
        }
    }
    closeAddTask();
}

function editTask(taskId) {
    const task = getAllTasks().find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('inp-title').value    = task.title;
    document.getElementById('inp-desc').value     = task.description || '';
    document.getElementById('inp-deadline').value = task.deadline ? task.deadline.slice(0,16) : '';
    document.getElementById('inp-priority').value = task.priority;
    document.getElementById('inp-category').value = task.category;
    document.getElementById('inp-time').value     = task.estimatedTime || '';
    const btn = document.querySelector('#taskPopup .btn-primary');
    if (btn) btn.dataset.editId = taskId;
    document.getElementById('taskPopup').classList.add('show');
}

async function aiPrioritize() {
    const tasks = getAllTasks().filter(t => t.status !== 'completed');
    if (tasks.length === 0) { showToast('No pending tasks to prioritize.', 'info'); return; }
    showToast('AI is analyzing your tasks...', 'info');
    try {
        const resp = await askGemini('Prioritize all my pending tasks. Explain your reasoning clearly.');
        conversationHistory = conversationHistory.slice(0,-2);
        document.getElementById('aiResult').textContent = resp.replace(/\{[\s\S]*?\}/g,'').trim();
        document.getElementById('aiPopup').classList.add('show');
        renderTasks();
    } catch(e) { showToast('Prioritization failed. Check your API key.', 'error'); }
}

// ---- Goals ----
function openAddGoal()  { document.getElementById('goalPopup').classList.add('show'); }
function closeAddGoal() { document.getElementById('goalPopup').classList.remove('show'); }

function saveGoal() {
    const title = document.getElementById('goal-title').value.trim();
    if (!title) { showToast('Goal title is required.', 'error'); return; }
    const goals = getAllGoals();
    goals.push({
        id:          makeId(),
        title,
        description: document.getElementById('goal-desc').value.trim(),
        targetDate:  document.getElementById('goal-date').value || null,
        category:    document.getElementById('goal-cat').value,
        progress:    0,
        subtasks:    [],
        createdAt:   new Date().toISOString()
    });
    saveGoals(goals);
    renderGoals();
    closeAddGoal();
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value  = '';
    document.getElementById('goal-date').value  = '';
    showToast('Goal created.', 'success');
}

function renderGoals() {
    const grid  = document.getElementById('goalsGrid');
    if (!grid)  return;
    const goals = getAllGoals();
    const catEmoji = { career:'🚀', health:'💪', learning:'📚', financial:'💰', personal:'🌟' };

    if (goals.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:64px;color:var(--gray-5);grid-column:1/-1;">
                <i class="fas fa-crosshairs" style="font-size:2.5rem;margin-bottom:14px;display:block;opacity:0.4;"></i>
                <p style="font-weight:600;color:var(--gray-4);">No goals defined yet.</p>
                <p style="font-size:0.83rem;margin-top:6px;">Define your first goal to begin tracking progress.</p>
            </div>`;
        return;
    }

    grid.innerHTML = goals.map(goal => `
    <div class="goal-card">
        <div class="goal-cat-tag">${catEmoji[goal.category] || '🌟'} ${goal.category}</div>
        <div class="goal-title-text">${goal.title}</div>
        ${goal.description ? `<div class="goal-desc-text">${goal.description}</div>` : ''}
        <div class="progress-label-row">
            <span>Progress</span>
            <span class="progress-pct">${goal.progress}%</span>
        </div>
        <div class="progress-track">
            <div class="progress-fill" style="width:${goal.progress}%"></div>
        </div>
        ${goal.subtasks?.length > 0 ? `
        <div class="goal-steps">
            ${goal.subtasks.slice(0,5).map((st,i) => {
                const txt  = typeof st === 'string' ? st : st.text;
                const done = typeof st === 'object'  ? st.done : false;
                return `<div class="step-row ${done ? 'step-done' : ''}" onclick="toggleGoalStep('${goal.id}',${i})">
                    <div class="step-check">${done ? '✓' : ''}</div>
                    <span>${txt}</span>
                </div>`;
            }).join('')}
        </div>` : ''}
        <div class="goal-actions">
            <button class="btn-dark" style="flex:1;font-size:0.78rem;padding:8px;" onclick="aiBreakGoal('${goal.id}')">
                <i class="fas fa-brain"></i> AI Break Down
            </button>
            <button class="ta-btn ta-del" style="flex:0;" onclick="deleteGoal('${goal.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>`).join('');
}

function toggleGoalStep(goalId, idx) {
    const goals = getAllGoals();
    const goal  = goals.find(g => g.id === goalId);
    if (!goal) return;
    if (typeof goal.subtasks[idx] === 'string') {
        goal.subtasks[idx] = { text:goal.subtasks[idx], done:true };
    } else {
        goal.subtasks[idx].done = !goal.subtasks[idx].done;
    }
    const doneCount  = goal.subtasks.filter(s => typeof s === 'object' ? s.done : false).length;
    goal.progress    = Math.round((doneCount / goal.subtasks.length) * 100);
    saveGoals(goals);
    renderGoals();
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    saveGoals(getAllGoals().filter(g => g.id !== goalId));
    renderGoals();
    showToast('Goal removed.', 'info');
}

async function aiBreakGoal(goalId) {
    const goal = getAllGoals().find(g => g.id === goalId);
    if (!goal) return;
    showToast('AI is generating milestones...', 'info');
    try {
        const resp   = await askGemini(`Break this goal into 5-7 specific, measurable steps: "${goal.title}". Return JSON: {"action":"break_goal","goal_id":"${goalId}","subtasks":["step 1","step 2"]}`);
        conversationHistory = conversationHistory.slice(0,-2);
        const action = parseAction(resp);
        if (action?.subtasks) {
            const goals = getAllGoals();
            const g     = goals.find(g => g.id === goalId);
            if (g) {
                g.subtasks = action.subtasks.map(s => ({ text:s, done:false }));
                saveGoals(goals);
                renderGoals();
                showToast('Goal milestones generated.', 'success');
            }
        } else {
            showToast('Could not parse AI response. Try again.', 'error');
        }
    } catch(e) { showToast('AI request failed. Check API key.', 'error'); }
}