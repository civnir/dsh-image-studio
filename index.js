/**
 * Host half of the Image Studio bundle.
 *
 * Owns the HTTP surface the browser panel talks to and the durable side of
 * image generation: it resolves the SiliconFlow credential, calls the
 * OpenAI-compatible generations endpoint, downloads the returned objects
 * immediately (SiliconFlow hands out S3 links that expire after an hour),
 * writes them into the configured output directory, and keeps the record
 * index the panel renders as history.
 *
 * Deliberately dependency-free: only Node builtins, so a hand-written package
 * living outside the Harness node_modules tree resolves without a manifest.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const name = 'image-studio';
const inject = ['credentials'];

/** Browser-facing route root; every endpoint below lives under it. */
const ROUTE_ROOT = '/api/image-studio';
/** Credential seam name holding the SiliconFlow key. */
const KEY_NAME = 'SILICONFLOW_API_KEY';
/** Largest accepted JSON request body. */
const MAX_BODY_BYTES = 256 * 1024;

/**
 * The text-to-image models the panel exposes. Each entry is the authority for
 * the parameters its model accepts, so the browser form is built from this
 * table instead of hard-coding per-model branches in the UI.
 */
const MODELS = [
  {
    id: 'OpenMOSS-Team/MOSS-Image',
    label: 'MOSS-Image',
    hint: '长文本 / JSON 布局渲染强，MOSS 5B DiT',
    sizes: [
      { value: '1024x1024', label: '1:1 · 1024' },
      { value: '768x1024', label: '3:4 · 768×1024' },
      { value: '1024x768', label: '4:3 · 1024×768' },
      { value: '512x512', label: '1:1 · 512 草稿' },
    ],
    defaultSize: '1024x1024',
    params: ['negative_prompt', 'seed', 'num_inference_steps'],
    defaults: { steps: 20 },
    pricePerImage: null,
  },
  {
    id: 'Tongyi-MAI/Z-Image-Turbo',
    label: 'Z-Image Turbo',
    hint: '通义 Z-Image 快速版，适合大量出图',
    sizes: [
      { value: '1024x1024', label: '1:1 · 1024' },
      { value: '768x1024', label: '3:4 · 768×1024' },
      { value: '1024x768', label: '4:3 · 1024×768' },
      { value: '512x512', label: '1:1 · 512 草稿' },
    ],
    defaultSize: '1024x1024',
    params: ['negative_prompt', 'seed', 'num_inference_steps'],
    defaults: { steps: 8 },
    pricePerImage: null,
  },
  {
    id: 'Tongyi-MAI/Z-Image',
    label: 'Z-Image',
    hint: '通义 Z-Image 质量版',
    sizes: [
      { value: '1024x1024', label: '1:1 · 1024' },
      { value: '768x1024', label: '3:4 · 768×1024' },
      { value: '1024x768', label: '4:3 · 1024×768' },
      { value: '512x512', label: '1:1 · 512 草稿' },
    ],
    defaultSize: '1024x1024',
    params: ['negative_prompt', 'seed', 'num_inference_steps'],
    defaults: { steps: 20 },
    pricePerImage: null,
  },
  {
    id: 'Qwen/Qwen-Image',
    label: 'Qwen-Image',
    hint: '文字渲染最稳，支持 CFG（图内文字需 CFG > 1）',
    sizes: [
      { value: '1328x1328', label: '1:1 · 1328' },
      { value: '1664x928', label: '16:9 · 1664×928' },
      { value: '928x1664', label: '9:16 · 928×1664' },
      { value: '1472x1140', label: '4:3 · 1472×1140' },
      { value: '1140x1472', label: '3:4 · 1140×1472' },
      { value: '1584x1056', label: '3:2 · 1584×1056' },
      { value: '1056x1584', label: '2:3 · 1056×1584' },
    ],
    defaultSize: '1328x1328',
    params: ['negative_prompt', 'seed', 'num_inference_steps', 'cfg'],
    defaults: { steps: 50, cfg: 4 },
    pricePerImage: null,
  },
  {
    id: 'Kwai-Kolors/Kolors',
    label: 'Kolors',
    hint: '快手可图，支持 guidance_scale 控制贴合度',
    sizes: [
      { value: '1024x1024', label: '1:1 · 1024' },
      { value: '960x1280', label: '3:4 · 960×1280' },
      { value: '768x1024', label: '3:4 · 768×1024' },
      { value: '720x1440', label: '1:2 · 720×1440' },
      { value: '720x1280', label: '9:16 · 720×1280' },
    ],
    defaultSize: '1024x1024',
    params: ['negative_prompt', 'seed', 'num_inference_steps', 'guidance_scale'],
    defaults: { steps: 20, guidanceScale: 7.5 },
    pricePerImage: null,
  },
];

const DEFAULT_MODEL = MODELS[0].id;

/** Resolve plugin configuration into the values the handlers use. */
function normalizeConfig(config) {
  const raw = config !== null && typeof config === 'object' ? config : {};
  const outputDir = typeof raw.outputDir === 'string' && raw.outputDir.trim() !== ''
    ? path.resolve(raw.outputDir)
    : path.join(os.homedir(), '.dsh', 'image-studio');
  const prices = raw.prices !== null && typeof raw.prices === 'object' ? raw.prices : {};
  const models = MODELS.map((model) => ({
    ...model,
    pricePerImage: typeof prices[model.id] === 'number' ? prices[model.id] : model.pricePerImage,
  }));
  const requestedDefault = typeof raw.defaultModel === 'string' ? raw.defaultModel : '';
  return {
    outputDir,
    baseURL: typeof raw.baseURL === 'string' && raw.baseURL.trim() !== ''
      ? raw.baseURL.replace(/\/+$/, '')
      : 'https://api.siliconflow.cn/v1',
    models,
    defaultModel: models.some((model) => model.id === requestedDefault) ? requestedDefault : DEFAULT_MODEL,
    maxCount: clampInt(raw.maxCount, 1, 4, 4),
    timeoutMs: clampInt(raw.timeoutMs, 20000, 600000, 180000),
  };
}

/** Clamp one integer into an inclusive range, falling back on non-numbers. */
function clampInt(value, min, max, fallback) {
  const parsed = typeof value === 'number' ? Math.trunc(value) : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Serialize index file mutations so concurrent generations cannot lose records. */
function createIndexQueue() {
  let tail = Promise.resolve();
  return (job) => {
    const run = tail.then(job, job);
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
}

/** Read the record index, tolerating a missing or corrupt file. */
async function readIndex(outputDir) {
  try {
    const text = await fsp.readFile(path.join(outputDir, 'index.json'), 'utf8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Replace the record index atomically. */
async function writeIndex(outputDir, records) {
  const file = path.join(outputDir, 'index.json');
  const tmp = file + '.' + process.pid + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(records, null, 2), 'utf8');
  await fsp.rename(tmp, file);
}

/** JSON response helper. */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

/** Read a bounded JSON request body. */
async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(text);
  return parsed !== null && typeof parsed === 'object' ? parsed : {};
}

/** Verify the encoded bytes are one of the raster formats the panel renders. */
function sniffImageType(buffer) {
  if (buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}

/** Intrinsic dimensions of a PNG (IHDR), or null for other formats. */
function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Timestamped, collision-resistant file stem. */
function newStem(modelId) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = String(now.getFullYear())
    + pad(now.getMonth() + 1) + pad(now.getDate()) + '-'
    + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  const slug = modelId.split('/').pop().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  return stamp + '-' + slug + '-' + rand;
}

/** Reject names that could escape the output directory. */
function safeStoredName(value) {
  if (typeof value !== 'string' || value === '') return null;
  if (!/^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp|gif)$/.test(value)) return null;
  return value;
}

/** Translate a SiliconFlow HTTP failure into a panel-facing code and message. */
function describeUpstreamFailure(status, payload) {
  const detail = payload !== null && typeof payload === 'object' && typeof payload.message === 'string'
    ? payload.message
    : '';
  if (status === 401 || status === 403) {
    return { code: 'auth', message: '硅基流动 API 密钥无效或权限不足' + (detail ? '：' + detail : '') };
  }
  if (status === 429) {
    return { code: 'rate-limit', message: '触发限流，请稍后重试' + (detail ? '：' + detail : '') };
  }
  if (status === 400 || status === 422) {
    return { code: 'bad-request', message: detail || '请求参数被拒绝（可能是尺寸不支持或内容审核）' };
  }
  return { code: 'upstream', message: '上游返回 HTTP ' + status + (detail ? '：' + detail : '') };
}

/** Validate a generation request against the model's declared parameter set. */
function buildGenerationBody(model, input) {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (prompt === '') throw Object.assign(new Error('提示词不能为空'), { code: 'bad-request' });
  if (prompt.length > 4000) throw Object.assign(new Error('提示词过长（上限 4000 字符）'), { code: 'bad-request' });

  let size = typeof input.size === 'string' ? input.size.trim() : model.defaultSize;
  if (!/^\d{3,4}x\d{3,4}$/.test(size)) size = model.defaultSize;
  const [width, height] = size.split('x').map((part) => Number.parseInt(part, 10));
  if (width < 256 || height < 256 || width > 2048 || height > 2048) {
    throw Object.assign(new Error('尺寸需在 256–2048 之间，格式如 1024x1024'), { code: 'bad-request' });
  }

  const body = { model: model.id, prompt, image_size: size };

  if (model.params.includes('negative_prompt')) {
    const negative = typeof input.negativePrompt === 'string' ? input.negativePrompt.trim() : '';
    if (negative !== '') body.negative_prompt = negative.slice(0, 2000);
  }
  if (model.params.includes('seed')) {
    const seed = input.seed === null || input.seed === undefined || input.seed === '' ? null : clampInt(input.seed, 0, 9999999999, null);
    if (seed !== null) body.seed = seed;
  }
  if (model.params.includes('num_inference_steps')) {
    body.num_inference_steps = clampInt(input.steps, 1, 100, model.defaults.steps ?? 20);
  }
  if (model.params.includes('guidance_scale')) {
    const guidance = typeof input.guidanceScale === 'number' ? input.guidanceScale : Number.parseFloat(String(input.guidanceScale));
    body.guidance_scale = Number.isFinite(guidance) ? Math.min(20, Math.max(0, guidance)) : (model.defaults.guidanceScale ?? 7.5);
  }
  if (model.params.includes('cfg')) {
    const cfg = typeof input.cfg === 'number' ? input.cfg : Number.parseFloat(String(input.cfg));
    body.cfg = Number.isFinite(cfg) ? Math.min(20, Math.max(0.1, cfg)) : (model.defaults.cfg ?? 4);
  }
  // Explicit "AI 生成" watermark: SiliconFlow adds it by default; the caller may
  // turn it off via the X-Enable-Watermark header (0 = off).
  const watermark = input.watermark !== false;
  return { body, size, width, height, prompt, negativePrompt: body.negative_prompt ?? '', watermark };
}

/** One generation attempt for a single image: request, download, persist. */
async function generateOne(ctx, settings, model, prepared, key, signal) {
  const startedAt = Date.now();
  const response = await fetch(settings.baseURL + '/images/generations', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + key,
      'content-type': 'application/json',
      ...(prepared.watermark ? {} : { 'x-enable-watermark': '0' }),
    },
    body: JSON.stringify(prepared.body),
    signal,
  });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* non-JSON error page */ }
  if (!response.ok) {
    const failure = describeUpstreamFailure(response.status, payload);
    throw Object.assign(new Error(failure.message), { code: failure.code, status: response.status });
  }

  const urls = [];
  if (payload !== null && Array.isArray(payload.images)) {
    for (const image of payload.images) {
      if (image !== null && typeof image === 'object' && typeof image.url === 'string' && image.url !== '') urls.push(image.url);
    }
  }
  if (urls.length === 0) throw Object.assign(new Error('上游未返回图片地址'), { code: 'upstream' });

  const remote = await fetch(urls[0], { signal });
  if (!remote.ok) throw Object.assign(new Error('下载生成结果失败：HTTP ' + remote.status), { code: 'upstream' });
  const bytes = Buffer.from(await remote.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (mediaType === null) throw Object.assign(new Error('生成结果不是可识别的图片格式'), { code: 'upstream' });

  const extension = mediaType === 'image/jpeg' ? '.jpg'
    : mediaType === 'image/webp' ? '.webp'
      : mediaType === 'image/gif' ? '.gif' : '.png';
  const storedName = newStem(model.id) + extension;
  await fsp.mkdir(settings.outputDir, { recursive: true });
  await fsp.writeFile(path.join(settings.outputDir, storedName), bytes);

  const dimensions = mediaType === 'image/png' ? pngDimensions(bytes) : null;
  const record = {
    name: storedName,
    mediaType,
    bytes: bytes.length,
    width: dimensions?.width ?? prepared.width,
    height: dimensions?.height ?? prepared.height,
    model: model.id,
    modelLabel: model.label,
    prompt: prepared.prompt,
    negativePrompt: prepared.negativePrompt,
    size: prepared.size,
    seed: prepared.body.seed ?? null,
    steps: prepared.body.num_inference_steps ?? null,
    guidanceScale: prepared.body.guidance_scale ?? null,
    cfg: prepared.body.cfg ?? null,
    watermark: prepared.watermark,
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
  };
  return record;
}

/** Resolve the API key through the credential seam; empty means unconfigured. */
async function resolveKey(ctx) {
  try {
    const hit = await ctx.credentials.resolve(KEY_NAME);
    const value = hit !== null && typeof hit === 'object' && typeof hit.value === 'string' ? hit.value.trim() : '';
    return value === '' ? null : value;
  } catch {
    return null;
  }
}

/** Build one HTTP handler closure per plugin activation. */
function createHandler(ctx, settings) {
  const enqueueIndex = createIndexQueue();

  const handleConfig = async (res) => {
    const key = await resolveKey(ctx);
    let keySource = null;
    try {
      const info = await ctx.credentials.describe(KEY_NAME);
      if (info !== null && typeof info === 'object' && typeof info.source === 'string') keySource = info.source;
    } catch { /* describe is advisory only */ }
    sendJson(res, 200, {
      models: settings.models,
      defaultModel: settings.defaultModel,
      maxCount: settings.maxCount,
      outputDir: settings.outputDir,
      keyConfigured: key !== null,
      keySource,
    });
  };

  const handleHistory = async (res, url) => {
    const limit = clampInt(url.searchParams.get('limit'), 1, 500, 200);
    const records = await readIndex(settings.outputDir);
    sendJson(res, 200, { items: records.slice(0, limit), total: records.length });
  };

  const handleGenerate = async (req, res) => {
    const key = await resolveKey(ctx);
    if (key === null) {
      sendJson(res, 409, { code: 'no-key', message: '未配置 SILICONFLOW_API_KEY，请先在设置里填入硅基流动密钥' });
      return;
    }
    let input;
    try {
      input = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { code: 'bad-request', message: '无法解析请求体：' + error.message });
      return;
    }

    const requestedModel = typeof input.model === 'string' ? input.model : settings.defaultModel;
    const model = settings.models.find((entry) => entry.id === requestedModel) ?? settings.models.find((entry) => entry.id === settings.defaultModel);
    if (model === undefined) {
      sendJson(res, 400, { code: 'bad-request', message: '未知模型：' + requestedModel });
      return;
    }

    let prepared;
    try {
      prepared = buildGenerationBody(model, input);
    } catch (error) {
      sendJson(res, 400, { code: error.code ?? 'bad-request', message: error.message });
      return;
    }

    const count = clampInt(input.count, 1, settings.maxCount, 1);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    const startedAt = Date.now();
    const records = [];
    const failures = [];
    try {
      const settled = await Promise.allSettled(Array.from({ length: count }, () =>
        generateOne(ctx, settings, model, prepared, key, controller.signal)));
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') records.push(outcome.value);
        else failures.push({ message: outcome.reason?.message ?? String(outcome.reason), code: outcome.reason?.code ?? 'upstream' });
      }
    } finally {
      clearTimeout(timer);
    }

    if (records.length > 0) {
      await enqueueIndex(async () => {
        const existing = await readIndex(settings.outputDir);
        await writeIndex(settings.outputDir, [...records, ...existing].slice(0, 5000));
      });
    }

    if (records.length === 0) {
      const first = failures[0];
      sendJson(res, 502, { code: first?.code ?? 'upstream', message: first?.message ?? '生成失败', failures });
      return;
    }
    sendJson(res, 200, { items: records, failures, elapsedMs: Date.now() - startedAt });
  };

  const handleFile = async (res, storedName, method) => {
    const name = safeStoredName(storedName);
    if (name === null) {
      sendJson(res, 400, { code: 'bad-request', message: '非法的文件名' });
      return;
    }
    const file = path.join(settings.outputDir, name);
    let bytes;
    try {
      bytes = await fsp.readFile(file);
    } catch {
      sendJson(res, 404, { code: 'not-found', message: '图片不存在' });
      return;
    }
    const mediaType = sniffImageType(bytes) ?? 'application/octet-stream';
    res.writeHead(200, {
      'content-type': mediaType,
      'content-length': bytes.length,
      'cache-control': 'public, max-age=31536000, immutable',
    });
    res.end(method === 'HEAD' ? undefined : bytes);
  };

  const handleDelete = async (res, storedName) => {
    const name = safeStoredName(storedName);
    if (name === null) {
      sendJson(res, 400, { code: 'bad-request', message: '非法的文件名' });
      return;
    }
    const removed = await enqueueIndex(async () => {
      const existing = await readIndex(settings.outputDir);
      const next = existing.filter((record) => record.name !== name);
      if (next.length === existing.length) return false;
      await writeIndex(settings.outputDir, next);
      return true;
    });
    if (!removed) {
      sendJson(res, 404, { code: 'not-found', message: '记录不存在' });
      return;
    }
    await fsp.rm(path.join(settings.outputDir, name), { force: true });
    sendJson(res, 200, { deleted: name });
  };

  const handleKeyStatus = async (res) => {
    try {
      const info = await ctx.credentials.describe(KEY_NAME);
      const configured = info !== null && typeof info === 'object' && info.configured === true;
      const source = info !== null && typeof info === 'object' && typeof info.source === 'string' ? info.source : null;
      sendJson(res, 200, { configured, source, keyName: KEY_NAME });
    } catch (error) {
      sendJson(res, 500, { code: 'internal', message: '无法读取密钥状态：' + (error?.message ?? String(error)) });
    }
  };

  const handleKeySave = async (req, res) => {
    let input;
    try {
      input = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { code: 'bad-request', message: '无法解析请求体：' + error.message });
      return;
    }
    const raw = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
    if (raw.length < 8) {
      sendJson(res, 400, { code: 'bad-request', message: 'API Key 看起来不完整（至少 8 个字符）' });
      return;
    }
    if (raw.length > 400) {
      sendJson(res, 400, { code: 'bad-request', message: 'API Key 过长' });
      return;
    }
    try {
      await ctx.credentials.set(KEY_NAME, raw);
      sendJson(res, 200, { configured: true, source: 'file' });
    } catch (error) {
      sendJson(res, 500, { code: 'internal', message: '保存密钥失败：' + (error?.message ?? String(error)) });
    }
  };

  const handleKeyClear = async (res) => {
    try {
      await ctx.credentials.unset(KEY_NAME);
      sendJson(res, 200, { configured: false, source: null });
    } catch (error) {
      sendJson(res, 500, { code: 'internal', message: '清除密钥失败：' + (error?.message ?? String(error)) });
    }
  };

  return async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const suffix = url.pathname.slice(ROUTE_ROOT.length);
      const method = (req.method ?? 'GET').toUpperCase();

      if (suffix === '/key' && (method === 'GET' || method === 'HEAD')) return await handleKeyStatus(res);
      if (suffix === '/key' && method === 'POST') return await handleKeySave(req, res);
      if (suffix === '/key' && method === 'DELETE') return await handleKeyClear(res);
      if (suffix === '/config' && (method === 'GET' || method === 'HEAD')) return await handleConfig(res);
      if (suffix === '/history' && method === 'GET') return await handleHistory(res, url);
      if (suffix === '/generate' && method === 'POST') return await handleGenerate(req, res);
      if (suffix.startsWith('/file/') && (method === 'GET' || method === 'HEAD')) {
        return await handleFile(res, decodeURIComponent(suffix.slice('/file/'.length)), method);
      }
      if (suffix.startsWith('/history/') && method === 'DELETE') {
        return await handleDelete(res, decodeURIComponent(suffix.slice('/history/'.length)));
      }
      sendJson(res, 404, { code: 'not-found', message: '未知接口 ' + method + ' ' + url.pathname });
    } catch (error) {
      sendJson(res, 500, { code: 'internal', message: error?.message ?? String(error) });
    }
  };
}

/** Register the browser-facing route once the web server is available. */
async function apply(ctx, config = {}) {
  const settings = normalizeConfig(config);
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'prefix',
      path: ROUTE_ROOT,
      handler: createHandler(webCtx, settings),
    }), 'image-studio: route');
  });
}

export { apply, inject, name };
