// ============================================================
// DASHBOARD — Stats, Charts, Insights
// ============================================================

let chartInstance = null;

function updateDashboard() {
    const tasks = getAllTasks();
    const now   = new Date();

    const critical = tasks.filter(t => {
        if (t.status === 'completed') return false;
        if (t.priority === 'urgent')  return true;
        if (t.deadline) {
            const hrs = (new Date(t.deadline) - now) / 3600000;
            return hrs < 24;
        }
        return false;
    });

    const pending   = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    const score     = tasks.length > 0
        ? Math.round((completed.length / tasks.length) * 100)
        : 0;

    document.getElementById('stat-urgent').textContent = critical.length;
    document.getElementById('stat-pending').textContent = pending.length;
    document.getElementById('stat-done').textContent    = completed.length;
    document.getElementById('stat-score').textContent   = score + '%';

    renderUrgentList(critical);
    renderChart(tasks);
}

function renderUrgentList(critical) {
    const box = document.getElementById('urgent-list');
    if (!box) return;

    if (critical.length === 0) {
        box.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-circle-check empty-icon"></i>
                <p class="empty-text">No critical tasks. You are on track.</p>
            </div>`;
        return;
    }

    box.innerHTML = critical.slice(0,5).map(task => {
        const dl = task.deadline ? getDeadlineText(task.deadline) : null;
        return `
        <div class="urgent-item" onclick="showPage('tasks')">
            <div class="urgent-dot"></div>
            <span class="urgent-name">${task.title}</span>
            <span class="urgent-time">${dl ? dl.text : 'Critical'}</span>
        </div>`;
    }).join('');
}

function renderChart(tasks) {
    const ctx = document.getElementById('myChart');
    if (!ctx) return;

    const data = {
        labels: ['Critical','High','Medium','Low','Completed'],
        values: [
            tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
            tasks.filter(t => t.priority === 'high'   && t.status !== 'completed').length,
            tasks.filter(t => t.priority === 'medium' && t.status !== 'completed').length,
            tasks.filter(t => t.priority === 'low'    && t.status !== 'completed').length,
            tasks.filter(t => t.status === 'completed').length
        ]
    };

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['#E53935','#F57C00','#C9A84C','#43A047','#2C2C2C'],
                borderColor:     ['#111','#111','#111','#111','#111'],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color:         '#999999',
                        font:          { family:'Inter', size:11, weight:'600' },
                        padding:       16,
                        usePointStyle: true,
                        pointStyleWidth: 8
                    }
                }
            }
        }
    });
}

async function loadInsights() {
    const box = document.getElementById('insights-box');
    if (!box) return;

    box.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-circle-notch fa-spin" style="color:var(--gold);font-size:1.4rem;"></i>
            <span>Analyzing workspace with Gemini AI...</span>
        </div>`;

    try {
        const response = await getInsights();
        const lines    = response
            .split('\n')
            .filter(l => l.trim().length > 8)
            .slice(0,3);

        box.innerHTML = lines.map(line =>
            `<div class="insight-item">
                <i class="fas fa-chevron-right" style="color:var(--gold);font-size:0.65rem;margin-top:3px;flex-shrink:0;"></i>
                <span>${line.replace(/^[\d\.\-\*•]+\s*/,'').trim()}</span>
            </div>`
        ).join('');

    } catch(e) {
        box.innerHTML = `
            <div class="insight-item">
                <i class="fas fa-triangle-exclamation" style="color:var(--gold);font-size:0.65rem;margin-top:3px;flex-shrink:0;"></i>
                <span>Configure your Gemini API key in gemini.js to enable AI insights.</span>
            </div>`;
    }
}