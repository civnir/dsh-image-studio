# dsh-image-studio

An **Image Studio** panel for [DeepSeek Harness](https://github.com/deepseek-ai) — a sidebar page that turns
prompts into images with SiliconFlow image models, stores them on your disk, and keeps a browsable history.

> No build step. No bundler. Pure ESM: a host half that talks to the API and a client half that renders the panel.

## Features

- **Five text-to-image models** — MOSS-Image, Z-Image-Turbo, Z-Image, Qwen-Image, Kolors.
- **Model-aware parameter forms** — per-model size presets, steps, seed, negative prompt,
  `guidance_scale` (Kolors only) and `cfg` (Qwen-Image only).
- **Images are downloaded immediately.** SiliconFlow returns S3 links that expire after one hour,
  so every generated image is fetched and written to `outputDir` right away.
- **History grid** — preview, download, delete, and re-use the prompt of any past generation.
- **AI watermark toggle** — SiliconFlow stamps a “AI 生成” mark by default; flip it off with one switch.
- **API key entry inside the panel** — click the gear in the panel toolbar and paste your key.
  The key goes to the credential store, never to a config file, and is never echoed back.
- **Bilingual UI** — Chinese and English, following the harness locale.

## Requirements

- DeepSeek Harness with the web client (`dsh web`).
- A SiliconFlow account and an API key from <https://siliconflow.cn>.

## Install

The package is installed as a linked bundle into a profile. In `~/.dsh/profiles/<profile>/`:

1. Add the dependency to `package.json`:

   ```json
   "dependencies": { "@civnir/dsh-image-studio": "link:<path to this directory>" },
   "dsh": { "profile": { "bundles": ["...", "@civnir/dsh-image-studio"] } }
   ```

2. Run `pnpm install` in the profile directory.

3. Restart the harness (or touch the profile `cordis.patch.yml` to trigger a recompose) and reload the page.

The panel appears in the left sidebar as **Image Studio**, and image output lands in `~/.dsh/image-studio`
unless you configure `outputDir`.

## Configuration

Every key is optional; the shipped defaults live in `cordis.patch.yml`. Override them from your profile
patch layer:

```yaml
- id: dsh-image-studio
  name: "@civnir/dsh-image-studio"
  config:
    outputDir: 'D:\images'          # default: ~/.dsh/image-studio
    defaultModel: 'OpenMOSS-Team/MOSS-Image'
    maxCount: 4                       # max images per request
    baseURL: 'https://api.siliconflow.cn/v1'
    prices:                           # optional, per-model price hints
      OpenMOSS-Team/MOSS-Image: 0.1
```

## API key

Open the panel and click the **gear icon** at the right end of the toolbar. The popover takes one
key — a SiliconFlow key — and shows `Configured · from <source>` once stored. The popover also lets you
clear it again.

Behind the scenes the key is written through the harness credential seam as the reference
`SILICONFLOW_API_KEY`. That means you can equally provide it as an environment variable, and any other
plugin reading the same reference sees it too.

## Models

| Model | Best at | Sizes | Extra params | Defaults |
| --- | --- | --- | --- | --- |
| `OpenMOSS-Team/MOSS-Image` | long prompts, JSON layout control | 1:1, 3:4, 4:3, 512 draft | negative, seed, steps | steps 20 |
| `Tongyi-MAI/Z-Image-Turbo` | fast batches | 1:1, 3:4, 4:3, 512 draft | negative, seed, steps | steps 8 |
| `Tongyi-MAI/Z-Image` | higher quality Z-Image | 1:1, 3:4, 4:3, 512 draft | negative, seed, steps | steps 20 |
| `Qwen/Qwen-Image` | text rendering (needs `cfg > 1`) | 7 ratios up to 1664px | negative, seed, steps, `cfg` | steps 50, cfg 4 |
| `Kwai-Kolors/Kolors` | prompt adherence | 5 ratios | negative, seed, steps, `guidance_scale` | steps 20, guidance 7.5 |

## Watermark

SiliconFlow stamps generated images with a visible “AI 生成” mark unless the request sends
`X-Enable-Watermark: 0`. The panel exposes this as a switch in the toolbar. Turning it off means the
images are unmarked — please label them as AI-generated yourself where the law requires it.

## HTTP routes

All routes live under `/api/image-studio` and are registered on the harness web server.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/config` | model catalog, defaults and key status |
| GET | `/key` | whether a key is configured (never returns the value) |
| POST | `/key` | store a SiliconFlow API key |
| DELETE | `/key` | forget the stored key |
| POST | `/generate` | generate one or more images and persist them |
| GET | `/history` | stored records, newest first |
| GET | `/file/<name>` | image bytes |
| DELETE | `/history/<name>` | delete one record and its file |

## How it works

- `index.js` — the host half. Registers the routes above, builds the request body per model, calls
  SiliconFlow, downloads the resulting images, sniffs their real type from magic bytes, and maintains a
  small `index.json` next to the images so history survives restarts.
- `client.js` — the client half. Registers a `main` slot (the page) and a `sidebar.panellist` slot (the
  sidebar entry) through the harness module loader, with no build-time tooling.
- `locale/*.json` — UI strings, Chinese and English.

Stored file names are generated locally and every path that comes from a record is re-validated before
the file is served or deleted, so a hand-edited `index.json` cannot escape `outputDir`.

## Development

There is nothing to build. Edit `index.js` or `client.js`, then trigger a recompose by touching the
profile patch file, and reload the browser tab.

## License

MIT — see [LICENSE](LICENSE).

---

## 中文说明

给 DeepSeek Harness 用的**生图面板**：侧边栏多一个「Image Studio」，用硅基流动的图像模型出图，图片
直接落盘并保留历史记录。纯 ESM，无需构建。

**功能**：5 个文生图模型；按模型自适应的参数表单（尺寸、步数、种子、负向提示词、`guidance_scale`/`cfg`）；
生成的图立刻下载保存（硅基流动的链接 1 小时过期）；历史记录预览 / 下载 / 删除 / 复用提示词；
「AI 生成」水印开关；面板内齿轮按钮直接填写 API Key（只进凭证库，不落配置文件，不回显）。

**安装**：把本目录以 `link:` 方式加入某个 profile 的 `package.json` 依赖，并把包名加到
`dsh.profile.bundles`，然后在 profile 目录 `pnpm install`，重载页面即可。

**配置**：`outputDir`（默认 `~/.dsh/image-studio`）、`defaultModel`、`maxCount`、`baseURL`、`prices`，
在自己的 profile `cordis.patch.yml` 里覆盖。

**密钥**：面板右上角齿轮 → 粘贴硅基流动 API Key → 保存。写入的是凭证引用 `SILICONFLOW_API_KEY`，
也可以用环境变量提供。

**水印**：默认带「AI 生成」标记，工具条上的开关可以关掉；关掉后请自行标注 AI 生成。
