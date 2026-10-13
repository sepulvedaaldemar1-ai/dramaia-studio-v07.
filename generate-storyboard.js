const MAX_BODY_BYTES = 120_000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clip(value, max) {
  return String(value ?? '').slice(0, max);
}

function extractJson(text) {
  let candidate = String(text || '').trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(candidate);
  if (!parsed || !Array.isArray(parsed.shots)) throw new Error('invalid_model_json');
  const shots = parsed.shots.slice(0, 8).map((s) => ({
    title: clip(s?.title, 180),
    framing: clip(s?.framing, 180),
    camera: clip(s?.camera, 180),
    action: clip(s?.action, 3000),
    dialogue: clip(s?.dialogue, 2000),
    prompt: clip(s?.prompt, 3000),
  })).filter((s) => s.title && s.action && s.prompt);
  if (!shots.length) throw new Error('empty_model_shots');
  return shots;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido. Usa POST.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, { error: 'Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel.' });
  }

  let rawBody;
  try {
    rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return send(res, 413, { error: 'La solicitud es demasiado grande. Reduce el tamaño del guion.' });
    }
  } catch (_) {
    return send(res, 400, { error: 'No se pudo leer la solicitud.' });
  }

  let body;
  try { body = JSON.parse(rawBody); } catch (_) {
    return send(res, 400, { error: 'El cuerpo de la solicitud debe ser JSON válido.' });
  }
  const project = body?.project || {};
  const episode = body?.episode || {};
  if (!clip(episode.title, 180).trim()) return send(res, 400, { error: 'Falta el título del episodio.' });

  const model = /^[a-zA-Z0-9._-]{1,80}$/.test(process.env.GEMINI_MODEL || '')
    ? process.env.GEMINI_MODEL : DEFAULT_MODEL;
  const prompt = `Eres guionista y director de fotografía de minidramas verticales. Crea un storyboard claro, filmable y emocional para UN SOLO episodio. Devuelve exclusivamente JSON válido con la forma {"shots":[{"title":"...","framing":"...","camera":"...","action":"...","dialogue":"...","prompt":"..."}]}. Genera entre 5 y 8 planos ordenados que cubran el episodio, respeten el guion y terminen en el gancho. No inventes personajes que contradigan la historia. Cada prompt visual debe describir sujeto, acción, entorno, iluminación, emoción, continuidad y formato ${clip(project.ratio, 20) || '9:16'}. El diálogo debe conservar el sentido del guion y puede resumirse si no hay texto suficiente. No incluyas Markdown ni texto fuera del JSON.

PROYECTO: ${clip(project.title, 180)}
PREMISA: ${clip(project.premise, 3500)}
GÉNEROS: ${clip(project.genre, 250)}
ESTILO VISUAL: ${clip(project.style, 180)}
FORMATO: ${clip(project.ratio, 20)}
DURACIÓN OBJETIVO: ${clip(project.duration, 80)}
CONTINUIDAD: ${clip(project.continuity, 2500)}

EPISODIO: ${clip(episode.title, 180)}
RESUMEN: ${clip(episode.summary, 3500)}
GANCHO FINAL: ${clip(episode.hook, 1500)}
GUION: ${clip(episode.script, 18000)}

Mantén cada acción concisa y concreta. No uses explicaciones sobre el proceso.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 6500 },
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (_) {
    return send(res, 502, { error: 'No se pudo conectar con el proveedor de IA. Comprueba la conexión y vuelve a intentarlo.' });
  }

  if (!upstream.ok) {
    // No return upstream body or headers: they may contain provider diagnostics.
    if (upstream.status === 429) return send(res, 429, { error: 'El proveedor de IA alcanzó un límite temporal o de cuota. Espera y vuelve a intentar.' });
    if (upstream.status === 401 || upstream.status === 403) return send(res, 502, { error: 'El proveedor rechazó la credencial o el acceso al modelo. Revisa la variable secreta en Vercel.' });
    return send(res, 502, { error: 'El proveedor de IA no pudo completar la generación. Inténtalo más tarde.' });
  }

  let providerData;
  try { providerData = await upstream.json(); } catch (_) {
    return send(res, 502, { error: 'El proveedor devolvió una respuesta ilegible.' });
  }
  const text = providerData?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) return send(res, 502, { error: 'La IA no devolvió contenido. Reintenta con un guion más breve.' });
  try {
    return send(res, 200, { shots: extractJson(text), model });
  } catch (_) {
    return send(res, 502, { error: 'La respuesta de IA no tuvo el formato esperado. Pulsa generar otra vez.' });
  }
};
