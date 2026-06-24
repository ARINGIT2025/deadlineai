// ============================================================
// GEMINI AI — Core Intelligence Engine
// ============================================================

const API_KEY = 'AQ.Ab8RN6LJuTGL32G0yo5QL7IppbLqlfONrNIppsx2XNFv-KRyCQ'; // <-- Replace this

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

let conversationHistory = [];

// ============================================================
// PRIMARY FUNCTION — Send message to Gemini
// ============================================================
async function askGemini(userMessage) {
    const systemPrompt = buildSystemPrompt();

    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    const payload = {
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: conversationHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    };

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'API request failed');
        }

        const data = await response.json();
        const reply = data.candidates[0]?.content?.parts[0]?.text || 'No response generated.';

        conversationHistory.push({
            role: 'model',
            parts: [{ text: reply }]
        });

        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }

        return reply;

    } catch (error) {
        conversationHistory.pop();
        throw error;
    }
}

// ============================================================
// SYSTEM PROMPT — Defines AI behavior and context
// ============================================================
function buildSystemPrompt() {
    const tasks  = getAllTasks();
    const goals  = getAllGoals();
    const now    = new Date();

    const tasksList = tasks.length > 0
        ? tasks.map(t =>
            `  - [ID: ${t.id}] "${t.title}" | Priority: ${t.priority} | Deadline: ${t.deadline ? new Date(t.deadline).toLocaleString() : 'None'} | Status: ${t.status} | Category: ${t.category}`
          ).join('\n')
        : '  No tasks currently exist.';

    const goalsList = goals.length > 0
        ? goals.map(g =>
            `  - [ID: ${g.id}] "${g.title}" | Target: ${g.targetDate || 'Open-ended'} | Progress: ${g.progress}%`
          ).join('\n')
        : '  No goals currently exist.';

    return `You are DeadlineAI — an elite autonomous productivity intelligence system powered by Google Gemini.

CURRENT TIMESTAMP: ${now.toLocaleString()}

USER'S ACTIVE TASKS:
${tasksList}

USER'S GOALS:
${goalsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTONOMOUS ACTION PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the user requests an action, embed the appropriate JSON block in your response.
The system will automatically parse and execute it.

ACTION 1 — ADD TASK:
{"action":"add_task","task":{"title":"","description":"","deadline":"ISO_STRING","priority":"urgent|high|medium|low","category":"work|study|personal|health|finance","estimatedTime":30}}

ACTION 2 — PRIORITIZE TASKS:
{"action":"prioritize","order":["id1","id2","id3"],"reasoning":"explanation"}

ACTION 3 — PLAN THE DAY:
{"action":"plan_day","schedule":[{"time":"9:00 AM","task":"description","duration":"45 mins","type":"focus|break|admin"}]}

ACTION 4 — BREAK DOWN GOAL:
{"action":"break_goal","goal_id":"id","subtasks":["step 1","step 2","step 3"]}

ACTION 5 — COMPLETE TASK:
{"action":"complete_task","task_id":"id"}

ACTION 6 — DELETE TASK:
{"action":"delete_task","task_id":"id"}

ACTION 7 — RESCHEDULE:
{"action":"reschedule","updates":[{"task_id":"id","new_deadline":"ISO_STRING","reason":"explanation"}]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEHAVIORAL DIRECTIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Communicate in professional, clear English only
- Be direct, specific, and actionable
- Always acknowledge overdue tasks with urgency
- For action requests: include JSON block + human explanation
- For conversation: respond naturally and motivationally
- Identify scheduling conflicts and suggest solutions proactively
- Use the user's actual task data to personalize all advice`;
}

// ============================================================
// AI INSIGHTS — For dashboard intelligence feed
// ============================================================
async function getInsights() {
    const tasks    = getAllTasks();
    const total    = tasks.length;
    const done     = tasks.filter(t => t.status === 'completed').length;
    const overdue  = tasks.filter(t =>
        t.deadline &&
        new Date(t.deadline) < new Date() &&
        t.status !== 'completed'
    ).length;
    const urgent   = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

    const prompt = `Analyze this productivity data and provide exactly 3 concise, actionable insights.
Each insight must be 1-2 sentences maximum. Be specific and direct.

Data: ${total} total tasks | ${done} completed | ${overdue} overdue | ${urgent} critical priority

Format your response as exactly 3 numbered items:
1. [insight]
2. [insight]
3. [insight]`;

    try {
        const response = await askGemini(prompt);
        conversationHistory = conversationHistory.slice(0, -2);
        return response;
    } catch(e) {
        return '1. Connect your Gemini API key to unlock AI insights.\n2. Add tasks to begin tracking your productivity.\n3. Use the AI Assistant to plan your day intelligently.';
    }
}

// ============================================================
// PARSE JSON ACTION from AI response
// ============================================================
function parseAction(responseText) {
    try {
        const match = responseText.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
        if (match) return JSON.parse(match[0]);
    } catch(e) {
        // No valid JSON action found
    }
    return null;
}

// ============================================================
// RESET conversation history
// ============================================================
function resetChat() {
    conversationHistory = [];
}