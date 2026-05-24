---
title: Speech Coach AI API
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# 言镜 AI：多模态公众表达训练助手

言镜 AI 是一个面向高中 AI 应用比赛展示的 Web 应用。用户上传 1 到 3 分钟演讲视频后，系统会从语言、语音、动作、手势、姿态和镜头交流等角度生成一份可视化训练报告。

项目定位是“稳定、可解释、能演示”。系统不会判断用户心理状态，不输出“你很紧张”“你不自信”等结论，只提供具体、可解释的表达训练建议。

## 项目亮点

- 多模态分析：同时分析语音文本和视频动作。
- 可解释评分：使用清晰规则生成六维评分和综合分。
- 稳定演示：阿里云 ASR、Vosk、MediaPipe 或 FFmpeg 出错时自动 fallback/mock。
- 比赛友好：支持演示模式、进度展示、报告打印导出。
- 训练导向：建议聚焦可改进动作，例如停顿、看镜头、减少低头、优化手势。

## 功能说明

- 上传演讲视频，支持 `mp4`、`mov`、`avi`、`mkv`。
- 支持 200MB 以内视频。为了保证语音转写准确，正式展示建议使用 1 到 3 分钟、声音清晰的视频。
- 提取音频并转写中英文演讲文本。
- 视频会上传到后端，由 FFmpeg 提取 16k 单声道 wav 音频后再进行语音识别，优先保证转写稳定性。
- 统计字数、语速、口头禅、逻辑连接词。
- 分析人脸可见、镜头交流近似比例、低头次数、身体稳定、手势活跃度、遮脸次数和表情变化幅度。
- 生成内容表达、语音表现、手势表现、姿态稳定、镜头交流和综合表现评分。
- 生成问题时间点、个性化建议和总结。
- 支持“导出演示报告”，当前使用浏览器打印 `window.print()` 实现。

## 技术栈

- 前端：React + Vite + MediaPipe Tasks Vision WASM
- 后端：Python + FastAPI
- 音频提取：FFmpeg / imageio-ffmpeg
- 语音识别：阿里云智能语音交互实时识别优先，Vosk 中英文离线模型兜底
- 视频处理：OpenCV
- 姿态、手势、人脸分析：浏览器端 MediaPipe Tasks Vision，后端 Python MediaPipe / OpenCV 兜底
- 图表：Recharts

## 最终作品上线方式

如果希望“把作品链接发给任何一个人，点开就能用”，需要把前端和后端都部署到公网：

- 前端：推荐部署到 Vercel。
- 后端：推荐部署到 Hugging Face Spaces Docker。
- 前端通过 `VITE_API_BASE_URL` 连接公网后端。
- 后端通过 `CORS_ORIGINS` 允许公网前端访问。

本项目已经准备了部署所需的配置：

- `Dockerfile`：Hugging Face Spaces Docker 后端部署文件。
- `vercel.json`：Vercel 前端部署文件。
- `render.yaml`：Render Blueprint 备用配置。
- `frontend/.env.example`：前端公网 API 地址示例。
- `frontend/public/mediapipe/`：浏览器端 MediaPipe WASM 和 `.task` 模型文件，部署后从你自己的网站加载。
- `backend/.env.example`：后端 CORS 和模型参数示例。
- `backend/Dockerfile`：后端容器部署文件，包含 FFmpeg 安装。

部署后，用户访问前端网址，上传视频即可生成训练报告。前端负责浏览器端视觉指标预分析，后端负责保存视频、提取音频和语音转写，避免浏览器无法从 `.mov/.mp4` 中稳定提取音频。

### 推荐部署步骤：Hugging Face Spaces + Vercel

后端：

1. 打开 Hugging Face，创建一个新的 Space。
2. Space SDK 选择 `Docker`。
3. 连接或上传这个 GitHub 仓库。
4. Space 会读取根目录 `Dockerfile`，启动 FastAPI 后端。
5. 后端健康检查地址通常是：

```text
https://你的用户名-你的space名.hf.space/health
```

前端：

1. 打开 Vercel，导入同一个 GitHub 仓库。
2. 使用根目录的 `vercel.json` 部署前端。
3. 在 Vercel 项目环境变量中设置：

```bash
VITE_API_BASE_URL=https://你的用户名-你的space名.hf.space
```

4. 重新部署 Vercel，最终把 Vercel 网址发给用户即可。

### Render Blueprint 部署步骤（备用）

推荐使用 Blueprint 方式部署：

1. 把整个 `speech-coach-ai` 项目推到一个 GitHub 仓库。
2. 打开 Render Dashboard。
3. 点击 `New +`，选择 `Blueprint`。
4. 选择你的 GitHub 仓库。
5. Render 会读取仓库根目录的 `render.yaml`，并创建两个服务：
   - `speech-coach-api`：FastAPI 后端。
   - `speech-coach`：React 前端。
6. 部署完成后，打开前端服务的网址即可使用。

如果 Render 提示 `speech-coach` 或 `speech-coach-api` 名称不可用，需要改 `render.yaml` 里的服务名，同时把前端环境变量 `VITE_API_BASE_URL` 改成新的后端地址。

## 项目结构

```text
speech-coach-ai/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── uploads/
│   ├── outputs/
│   ├── services/
│   │   ├── audio_service.py
│   │   ├── speech_service.py
│   │   ├── video_service.py
│   │   ├── gesture_service.py
│   │   ├── text_analysis_service.py
│   │   ├── scoring_service.py
│   │   └── report_service.py
│   └── utils/
│       └── file_utils.py
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── components/
│       └── styles.css
└── README.md
```

## 后端运行方法

如果当前终端在 `AI大赛` 目录下，请先进入项目目录：

```bash
cd speech-coach-ai
```

macOS / Linux：

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Windows：

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

健康检查：

```text
http://localhost:8000/health
```

期望返回：

```json
{"status":"ok"}
```

## 前端运行方法

如果当前终端在 `AI大赛` 目录下，请先进入项目目录：

```bash
cd speech-coach-ai
```

```bash
cd frontend
npm install
npm run dev
```

默认访问：

```text
http://localhost:5173
```

如果前端要连接公网后端，在 `frontend` 目录新建 `.env`：

```bash
VITE_API_BASE_URL=https://你的后端域名
```

然后重新构建：

```bash
npm run build
```

## 后端部署环境变量

后端公网部署时建议设置：

```bash
CORS_ORIGINS=https://你的前端域名
USE_MOCK=false
VOSK_MODEL_PATH=/app/models/vosk-model-small-cn-0.22
VOSK_EN_MODEL_PATH=/app/models/vosk-model-small-en-us-0.15
ALIYUN_NLS_APP_KEY=你的阿里云智能语音交互AppKey
ALIYUN_AK_ID=你的阿里云AccessKey ID
ALIYUN_AK_SECRET=你的阿里云AccessKey Secret
```

如果比赛现场只需要稳定演示，可以临时设置：

```bash
USE_MOCK=true
```

但正式作品建议保持 `USE_MOCK=false`，让系统优先进行真实分析。

## FFmpeg 安装提示

FFmpeg 用于从视频中提取 `wav` 音频。macOS 推荐：

```bash
brew install ffmpeg
```

Windows 可以从 FFmpeg 官网下载安装，并将 `ffmpeg` 和 `ffprobe` 加入环境变量 `PATH`。

项目也安装了 `imageio-ffmpeg` 作为备用方案。如果系统 FFmpeg 不可用，程序会尝试使用备用 FFmpeg；如果仍失败，会自动切换到 mock 文本报告。

## 阿里云语音识别说明

语音识别会优先使用阿里云智能语音交互实时识别。前端会把视频音频转换为 `wav / 16000 Hz / mono`，后端再以 PCM 流方式发送给阿里云识别，适合中英文演讲稿转写。

需要在后端部署环境中配置：

```bash
ALIYUN_NLS_APP_KEY=你的阿里云智能语音交互AppKey
ALIYUN_AK_ID=你的阿里云AccessKey ID
ALIYUN_AK_SECRET=你的阿里云AccessKey Secret
```

后端会自动使用 `AccessKey ID / Secret` 向阿里云换取临时 NLS Token，并在 Token 快过期时自动刷新。也可以临时直接配置 `ALIYUN_NLS_TOKEN`，但不推荐长期使用，因为 NLS Token 会过期。

如果未配置阿里云参数，或阿里云识别失败，系统会自动尝试 Vosk 中文模型；中文无结果时再尝试 Vosk 英文模型。后端 Docker 构建时会尝试预下载 Vosk 中英文小模型，减少第一次分析等待。

如果模型下载失败、音频中没有清晰人声或运行出错，系统不会崩溃。报告页会显示“未检测到文本”，不会用演示稿冒充真实转写。

## MediaPipe 说明

视频分析使用 OpenCV 抽帧，并优先用 MediaPipe 检测人体姿态、手部关键点和人脸关键点。系统每隔 10 帧分析一帧，最长只分析前 3 分钟，避免普通电脑运行太慢。

当前版本会优先在浏览器端使用 MediaPipe Tasks Vision WASM 分析用户上传的视频帧，得到人脸、姿态和手部关键点指标。浏览器端分析成功后，前端会把 `visual_metrics` 随视频一起提交给后端生成报告。

浏览器端 MediaPipe 所需的 WASM 和模型文件已经放在 `frontend/public/mediapipe/`，部署前端时会一起发布，不依赖用户额外安装软件，也不依赖外部 CDN。

如果浏览器端 MediaPipe 失败，后端会继续尝试 Python 版 MediaPipe。如果后端 MediaPipe 也无法正常运行，系统会使用 OpenCV 对真实视频帧做降级分析，估算人脸可见比例、近似镜头交流、低头次数、画面晃动、手势活跃度、手部可见比例、遮脸次数和表情变化程度。只有 OpenCV 也无法读取视频时，才会使用 mock 视觉指标。

注意：在部分 macOS 沙盒或远程运行环境中，Python 版 MediaPipe 可能因为无法创建 OpenGL/Metal 图形上下文而失败。因此本项目把精确视觉分析优先放在浏览器端执行，更适合“发链接即可使用”的最终作品形态。

视觉分析会受到光线、角度、遮挡、人物距离、画面清晰度和多人入镜影响。本系统只做辅助分析，不做绝对评价。

## Mock 模式说明

推荐比赛演示前准备 mock 模式，保证现场稳定。

macOS / Linux：

```bash
export USE_MOCK=true
```

Windows PowerShell：

```powershell
$env:USE_MOCK="true"
```

然后启动后端：

```bash
uvicorn main:app --reload --port 8000
```

如果 `USE_MOCK=true`，后端不执行 Vosk、MediaPipe 或 OpenCV 分析，直接返回完整演示报告。如果 `USE_MOCK=false` 或未设置，后端会正常尝试真实分析：Vosk 未检测到清晰文本时显示“未检测到文本”，MediaPipe 失败时优先使用 OpenCV 真实近似分析，最后才使用 mock 指标。

## 评分规则

系统生成六维评分：

- 内容表达：根据开头、结尾、逻辑连接词、字数和口头禅数量评分。
- 语音表现：根据语速区间和口头禅数量评分。
- 手势表现：根据手势活跃度、手部可见比例和遮脸次数评分。
- 姿态稳定：以身体稳定分为基础，并根据低头次数扣分。
- 镜头交流：根据镜头交流近似比例评分。
- 综合表现：内容 30%、语音 20%、手势 15%、姿态 15%、镜头交流 20% 加权计算。

使用可解释规则评分，是为了让比赛展示时能清楚说明“为什么给出这个建议”，避免不可解释的黑箱判断。

## 常见问题

1. `cd backend` 提示目录不存在  
   请先进入项目目录：`cd /Users/zlz/Documents/AI大赛/speech-coach-ai`。

2. 语音识别第一次运行很慢  
   后端镜像会尝试预下载 Vosk 中文模型。如果 Render 构建时网络不稳定，首次运行可能无法识别。建议比赛演示使用 30 秒到 1 分钟的清晰人声视频。

3. MediaPipe 没检测到人  
   可能与光线、角度、距离或遮挡有关。系统会自动 fallback/mock。

4. FFmpeg 不可用  
   安装系统 FFmpeg，或依赖 `imageio-ffmpeg` 备用方案。失败时仍会返回演示报告。

5. 页面显示未检测到文本或 OpenCV 真实近似分析  
   说明某个模块没有跑满能力。未检测到文本表示音频转写没有拿到可用文字；OpenCV 真实近似分析仍然来自上传视频，只是没有使用 MediaPipe 关键点。

## 比赛演示流程

1. 打开网页首页。
2. 上传一段 1 到 3 分钟演讲视频。
3. 点击“开始分析”。
4. 展示 AI 分析过程。
5. 展示综合分和六维评分。
6. 展示语速、口头禅、低头次数、手势活跃度等指标。
7. 展示问题时间点和改进建议。
8. 说明 AI 不是替代学生表达，而是帮助学生发现问题、持续训练。

## 后续可扩展方向

1. 实时摄像头训练。
2. 英语演讲训练。
3. 辩论陪练。
4. 教师端班级表达能力报告。
5. 多次训练进步曲线。
6. AI 自动生成练习题。
7. 演讲稿优化建议。
