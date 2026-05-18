const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "steps"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "minutes", "reason"],
        properties: {
          title: { type: "string" },
          minutes: { type: "integer", minimum: 5, maximum: 120 },
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
          "You are GoalFlow's planning assistant. Create a small, realistic plan for today. Keep it practical, encouraging, and specific. Reply only with JSON matching the schema.",
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
    goals: normalizeList(body?.goals, 10).map((goal) => ({
      name: String(goal.name || "").slice(0, 80),
      category: String(goal.category || "").slice(0, 40),
      deadline: String(goal.deadline || "").slice(0, 20),
      note: String(goal.note || "").slice(0, 160),
    })),
    savedTasks: normalizeList(body?.savedTasks, 30).map((task) => ({
      title: String(task.title || "").slice(0, 80),
      goalId: String(task.goalId || "").slice(0, 80),
      minutes: Number(task.minutes || 0),
      reminder: String(task.reminder || "").slice(0, 40),
    })),
    todayItems: normalizeList(body?.todayItems, 20).map((item) => ({
      title: String(item.title || "").slice(0, 80),
      time: String(item.time || "").slice(0, 12),
      minutes: Number(item.minutes || 0),
      done: Boolean(item.done),
    })),
    recentProgress: normalizeList(body?.recentProgress, 7).map((day) => ({
      date: String(day.date || "").slice(0, 20),
      total: Number(day.total || 0),
      done: Number(day.done || 0),
    })),
  };
}

function normalizeList(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}
