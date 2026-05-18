const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "insight", "nudge", "steps"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    insight: { type: "string" },
    nudge: { type: "string" },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "minutes", "source", "reason"],
        properties: {
          title: { type: "string" },
          minutes: { type: "integer", minimum: 5, maximum: 120 },
          source: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  try {
    const payload = sanitizePayload(parseBody(request.body));
    const aiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.2",
        instructions:
          [
            "You are GoalFlow's in-app planning engine, not a generic chatbot.",
            "Use only the user's GoalFlow data in the payload: today's unfinished items, saved tasks, goal deadlines, recent progress, missed days, streak, and current time.",
            "Prioritize incompleteTodayItems first. If today's list is empty, choose from unscheduledSavedTasks or suggest one small setup action tied to a goal.",
            "The plan should answer: what should the user do next today, why this item matters, and what pattern GoalFlow noticed.",
            "Keep Japanese concise, specific, and calm. Avoid generic motivation, lectures, and mentioning that you are an AI model.",
            "Reply only with JSON matching the schema.",
          ].join(" "),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(payload),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "goalflow_today_plan",
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      response.status(aiResponse.status).json({ error: data.error?.message || "OpenAI request failed" });
      return;
    }

    const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
    if (!text) {
      response.status(502).json({ error: "AI response did not include a plan" });
      return;
    }

    response.status(200).json(JSON.parse(text));
  } catch (error) {
    response.status(500).json({ error: error.message || "AI plan failed" });
  }
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(body) {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function sanitizePayload(body) {
  return {
    today: String(body?.today || "").slice(0, 20),
    currentHour: clampNumber(body?.currentHour, 0, 23),
    isLateNight: Boolean(body?.isLateNight),
    goals: normalizeList(body?.goals, 10).map((goal) => ({
      id: String(goal.id || "").slice(0, 80),
      name: String(goal.name || "").slice(0, 80),
      category: String(goal.category || "").slice(0, 40),
      deadline: String(goal.deadline || "").slice(0, 20),
      note: String(goal.note || "").slice(0, 160),
    })),
    savedTasks: normalizeList(body?.savedTasks, 30).map((task) => ({
      id: String(task.id || "").slice(0, 80),
      title: String(task.title || "").slice(0, 80),
      goalId: String(task.goalId || "").slice(0, 80),
      minutes: Number(task.minutes || 0),
      reminder: String(task.reminder || "").slice(0, 40),
    })),
    todayItems: normalizeList(body?.todayItems, 20).map((item) => ({
      title: String(item.title || "").slice(0, 80),
      goalName: String(item.goalName || "").slice(0, 80),
      time: String(item.time || "").slice(0, 12),
      minutes: Number(item.minutes || 0),
      done: Boolean(item.done),
    })),
    incompleteTodayItems: normalizeList(body?.incompleteTodayItems, 10).map(sanitizeScheduledItem),
    completedTodayItems: normalizeList(body?.completedTodayItems, 10).map(sanitizeScheduledItem),
    unscheduledSavedTasks: normalizeList(body?.unscheduledSavedTasks, 20).map((task) => ({
      title: String(task.title || "").slice(0, 80),
      goalName: String(task.goalName || "").slice(0, 80),
      minutes: Number(task.minutes || 0),
      reminder: String(task.reminder || "").slice(0, 40),
    })),
    goalProgress: normalizeList(body?.goalProgress, 10).map((goal) => ({
      name: String(goal.name || "").slice(0, 80),
      scheduled: Number(goal.scheduled || 0),
      done: Number(goal.done || 0),
      completionRate: clampNumber(goal.completionRate, 0, 100),
      daysLeft: goal.daysLeft === null ? null : Number(goal.daysLeft || 0),
    })),
    recentProgress: normalizeList(body?.recentProgress, 7).map((day) => ({
      date: String(day.date || "").slice(0, 20),
      total: Number(day.total || 0),
      done: Number(day.done || 0),
    })),
    signals: {
      todayTotal: Number(body?.signals?.todayTotal || 0),
      todayDone: Number(body?.signals?.todayDone || 0),
      todayRemaining: Number(body?.signals?.todayRemaining || 0),
      todayCompletionRate: clampNumber(body?.signals?.todayCompletionRate, 0, 100),
      recentCompletionRate: clampNumber(body?.signals?.recentCompletionRate, 0, 100),
      recentMissedDays: Number(body?.signals?.recentMissedDays || 0),
      currentStreak: Number(body?.signals?.currentStreak || 0),
    },
  };
}

function normalizeList(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function sanitizeScheduledItem(item) {
  return {
    title: String(item.title || "").slice(0, 80),
    goalName: String(item.goalName || "").slice(0, 80),
    time: String(item.time || "").slice(0, 12),
    minutes: Number(item.minutes || 0),
    done: Boolean(item.done),
  };
}

function clampNumber(value, min, max) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}
