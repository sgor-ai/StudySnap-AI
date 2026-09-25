<div align="center">
  <img src="./icona.png" alt="StudySnap AI Pro icon" width="128">
  <h1>StudySnap AI Pro</h1>
  <p><strong>Capture ideas. Explore concepts. Learn with AI.</strong></p>
  <p>Created by <strong><a href="https://github.com/sgor-ai">sgor</a></strong>.</p>
  <p>
    <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Manifest V3">
    <img src="https://img.shields.io/badge/version-2.0.0-6d5efc" alt="version 2.0.0">
    <img src="https://img.shields.io/badge/AI-cloud%20%7C%20local-8b5cf6" alt="Cloud and local AI">
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="MIT License"></a>
  </p>
</div>

## Version 2.0.0

Version 2.0 unifies the acquisition and answer-filling pipeline across area capture,
full-page solving, selected text and selected images.

Compared with 1.0:

- Added one canonical target and answer-mapping pipeline for Google Forms, Microsoft
  Forms and generic HTML/ARIA quiz pages.
- Added stable `ITEM` identifiers so repeated visible question numbers do not shift
  later answers.
- Improved radio, checkbox, select, combobox, textarea, input and contenteditable
  matching, including refreshed controls after dynamic DOM updates.
- Added support for image-only questions and associated image-to-question mapping.
- Added shared reading-context handling for passages, emails, tables and images.
- Protected Name, Class, email, student ID and similar identity fields from both AI
  output and automatic filling.
- Made Auto-answer a global safety gate: when disabled, acquisition and answer display
  continue, but no page control is changed.
- Removed the redundant `Alt+S` visible-screen shortcut; `Alt+A`, `Alt+9` and the
  context-menu acquisition paths remain available.
- Improved pointer-mode scrolling without disabling the selection cursor.

<div align="center">
  <img src="./docs/hero.svg" alt="StudySnap AI Pro - capture, understand, move faster" width="100%">
</div>

## See it in action

Watch the short demo to see how StudySnap captures a screen area, sends it to your selected AI provider, and displays a focused answer directly in the browser.

<div align="center">
  <img src="./docs/demo.gif" alt="Animated StudySnap AI Pro demo" width="100%">
</div>

Prefer the full-quality version? **[Watch the original MP4 demo](./docs/video.mp4)**.

## What is StudySnap?

StudySnap AI Pro is a Chrome extension for studying, exploring ideas and understanding visual material with AI.

Capture a selected area or the visible screen, send it to the AI provider you choose, and receive a focused explanation without leaving the page. Use cloud providers for convenience or local AI for private, on-device workflows.

<div align="center">
  <img src="./docs/workflow.svg" alt="Choose AI, snap the screen, understand the context, and get an answer" width="100%">
</div>

## Why use it?

| Choose your AI | Capture instantly | Get a useful answer |
| --- | --- | --- |
| Gemini, OpenAI, Anthropic, Ollama, LM Studio, Jan, GPT4All, LocalAI, vLLM and compatible servers | `Alt+A` for an area | Focused responses, follow-up chat, history and exports |

### Designed for

- Studying and understanding difficult material.
- Reading documentation and technical diagrams.
- Debugging code and error messages.
- Solving exercises from a screen capture.
- Research, writing and everyday AI-assisted work.

## Features

- **Area capture** with `Alt+A`.
- **Selected-text explanations** from the right-click menu **Answer by StudySnap AI**. StudySnap uses the selected passage together with visible page context to provide a focused explanation.
- **Image explanations** from the same right-click menu when you right-click an image. StudySnap sends the image to a vision model and returns an explanation in the page response box.
- If the selected content contains an image in Markdown or a direct image URL, StudySnap detects and sends that image together with the selected passage and page context. This is useful for diagrams, formulas and technical figures.
- When a page contains structured alternatives, StudySnap compares the available choices and explains which one best matches the question and why.
- **Answer by StudySnap AI** sends selected text and the associated image together in one multimodal user request. It does not capture the screen.
- **Guided page assistance** is available as an opt-in popup toggle and is off by default. `Alt+9` reviews the complete structured page context; it fills compatible interactive fields only when **Auto-answer** is enabled. Identity fields such as name, class, email and student ID remain protected. The form is never submitted automatically.
- Answers shown in an in-page StudySnap box automatically fade out and close after 30 seconds if you do not close them manually. The **Answer box** toggle in General settings can hide the box while keeping acquisition, solving and auto-answer active. When the box is visible, its nested sunglasses toggle controls **Undercover** mode; when the box is hidden, the Undercover control is hidden as well.
- Works on normal HTTP/HTTPS pages and secure authenticated websites when site access is enabled for the extension.
- Cloud and local AI providers in one popup.
- Native Ollama support for local vision models.
- OpenAI-compatible support for LM Studio, Jan, GPT4All, LocalAI, vLLM, llama.cpp and similar servers.
- Streamed answers in the selected language.
- Direct-answer prompt with no unnecessary digressions.
- Separate profiles for different providers, models or projects.
- Automatic fallback when a provider fails.
- Undercover and Normal answer display modes.
- Follow-up chat in the StudySnap workspace.
- Local history, cache and PDF export.
- Screenshots captured with `Alt+A` are attached to their workspace conversations. Open a conversation to preview its image or export that specific conversation as a PDF.
- Panic mode with `Alt+0`.

## Requirements

- Google Chrome or another Chromium-based browser with Manifest V3 support.
- Permission to load an unpacked extension in developer mode.
- A cloud AI API key or a compatible local AI server, depending on the provider you choose.

## Installation

1. Download this repository and extract it if needed.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder containing `manifest.json`.
6. Pin **StudySnap AI** to the Chrome toolbar.

After changing files, return to `chrome://extensions` and click **Reload** on StudySnap.

## Usage

1. Click the StudySnap icon.
2. Open **General settings** with the gear button.
3. Select a provider.
4. Choose or create a profile.
5. Enter the model and API key when required.
6. Click **Test connection**.
7. Click **Save settings**.
8. Open a webpage or learning resource and press `Alt+A`.
9. Select only the passage, concept or exercise you want to explore.
10. Right-click the selection and choose **Answer by StudySnap AI**.
11. To analyze an image, right-click the image itself and choose **Answer by StudySnap AI**.

### Exploring selected content with page context

When you use **Answer by StudySnap AI**, StudySnap sends:

1. The text you selected as the main concept or task to explore.
2. The visible text of the current page as supporting context.
3. The selected or associated image, when the selection contains an image.

If the page contains several topics, the AI focuses on the selected passage. The page text is treated as context, not as additional instructions. The selection is limited to 10,000 characters and the page context to 50,000 characters.

#### Text plus an image or Markdown image

For a selection such as:

```text
Quanto vale la corrente transitante per la resistenza da 20Ω in figura?
![](https://example.test/circuito2.jpg)
```

StudySnap first tries to find the real `<img>` element in the rendered selection. It checks the image's `currentSrc`, `src` and `data-src`, including images that intersect the selected range. If the selection contains the Markdown or a direct image URL instead, it also extracts the URL as a fallback.

When an image URL is found, StudySnap downloads the original image, converts it to a data URL and sends it to the configured vision model in the **same user request** as:

- the selected question;
- the text and HTML reconstructed from the browser selection;
- the visible page text, including answer choices when available;
- instructions to read the diagram or formula directly.

It does not take a screen capture for this context-menu flow. The exact transport depends on the provider: OpenAI-compatible APIs receive text plus `image_url`, Gemini receives text plus `inline_data`, Anthropic receives text plus a base64 image block, and Ollama receives text plus its `images` field. A text-only model cannot interpret the image even if the extension finds it, so a vision-capable model is required.

If the page is already rendered HTML, the browser may provide only the visible question text in `selectionText`; it does not necessarily provide the literal Markdown `![](URL)`. This is expected: StudySnap independently searches the selected HTML for the `<img>` element and then sends the actual image. If no image element or usable URL can be found, only the selected text and page context are sent and the model cannot inspect the diagram.

For structured exercises, the request asks the model to read the available alternatives, explain the reasoning and identify the best-supported result. For open-ended prompts, it returns a clear explanation or worked solution.

#### Response speed

The context-menu flow performs independent preparation steps in parallel: reading the visible page text runs while the selection is inspected, and downloading a detected image runs while the page text is read. This reduces waiting time without removing the question, page context or image from the request.

The first response still depends on the selected provider and model. A vision model must first receive and interpret the image, and local models may need to load into memory. Streaming is enabled for supported providers, but the answer box is rendered after the complete answer is received so that partial Markdown or LaTeX is not displayed as a broken intermediate result. For the lowest latency, use a fast vision-capable model, keep the image selection focused and avoid unnecessary page content.

On supported secure websites, area capture and selected-text explanations appear in the StudySnap answer box.

### Guided interaction with learning pages

Enable **Guided interaction** in the popup when you want the assistant to place a clearly identified result into a compatible interactive field on the current page. The feature is off by default; `Alt+9` remains an explicit full-page review command and applies only unambiguous numbered results. It works with visible native radio/checkbox inputs and accessible controls such as `role="radio"` used by many learning platforms. It also sends the interaction command to every frame of the tab, which covers embedded content. It matches the final result returned by the AI, then dispatches normal `input` and `change` events so reactive pages can update.

The fourth display setting, **Answer box**, controls only whether the in-page response panel is shown. Turning it off prevents the panel from appearing for every acquisition mode (`Alt+A`, `Alt+9`, image capture and **Answer by StudySnap AI**) and closes any panel already open. It does not stop AI requests or page capture. Automatic form filling is controlled separately by **Auto-answer**. It is enabled by default and is stored between browser sessions. When enabled, the nested compact mode selector shows both icons: the person icon for **Normal** and the hat-and-glasses icon for **Undercover**. Clicking the selector switches between them and the active icon is highlighted.

For open-ended activities, StudySnap chooses a visible `textarea`, text input or `contenteditable` response area, prioritizing fields whose label, placeholder, name or ID indicates a response. It inserts the generated result and dispatches `input`/`change`; it does not click **Submit**, **Next**, **Send** or any equivalent button. If the page has no unambiguous compatible control, the result remains available in the StudySnap box and no page field is changed.

When a question starts with a number, such as `22`, that number is treated as an identifier and is not used alone to choose a field. The complete question text is used to rank the smallest matching form container, preventing an answer for question 22 from being inserted into question 21 or the first name field. Area capture also extracts nearby DOM text before auto-answering, so `Alt+A` can target an open response when the selected area contains the question.


The context-menu command **Answer by StudySnap AI** also supports selecting multiple structured activity blocks at once. On Microsoft Forms it reconstructs every selected `questionItem` from the DOM, including its number, complete text, alternatives and images, instead of relying only on the truncated browser selection string. The AI returns one numbered result per selected block, and guided interaction maps those numbers back to compatible controls.

All acquisition modes now share the same structured question context: `Alt+A` includes every question intersecting the selected area and `Alt+9` uses the full form markup. This keeps multi-question answers aligned with their numbered fields instead of treating the whole capture as one open answer.

`Alt+9` reviews the complete page without sending a screenshot: it sends sanitized HTML markup, then maps clearly numbered results to matching controls on the page, including controls outside the viewport. Identification fields such as name, class, email and student ID are excluded. If the model cannot determine a result, it omits that item and the extension leaves the control unchanged. It never submits the page.

`Alt+9` also sends images that belong to each structured content block. The prompt includes an explicit mapping such as `IMAGE 1 = ITEM 3`, and the image attachments use the same order. Page-wide backgrounds, logos, headers and footers are excluded. Existing compatible field values can be updated when the result is unambiguous; identity fields remain protected. On Microsoft Forms, the rendered page structure is read without scrolling the page or its internal panel, avoiding visible jumps.

When a content block contains an image, `Alt+9` also collects its rendered image URL and sends the downloaded image as a vision attachment together with the page prompt. It handles platforms such as Microsoft Forms that render media as `<img>` elements or as a CSS background inside the individual content block. The prompt includes an explicit manifest such as `IMAGE 1 = ITEM 3`, and the attachments use the same order, so the model can associate each image with the correct block. Page-wide theme/backgrounds, headers, footers and logos are excluded. Multiple images are sent in document order.

Microsoft Forms may block page JavaScript from fetching its protected media with CORS. StudySnap downloads those URLs from its service worker instead; the Microsoft Forms media host is explicitly permitted in the extension manifest. On Microsoft Forms, the question list is read directly from the rendered DOM without scrolling the page or its internal panel, preventing visible jumps.

Google Forms pages are also supported. Their question blocks are detected through the accessible `listitem`/`radio` structure, including option labels and question numbers. If a form contains multiple sections that restart numbering at `1`, results are matched by their occurrence in document order within each repeated number, rather than by a single global number. This prevents later sections from overwriting or receiving the controls belonging to an earlier section.

The same detection pipeline also works with generic web forms and custom learning pages. It first prefers semantic HTML and accessibility metadata (`fieldset`, labels, `name`, ARIA roles and question containers), then falls back to nearby DOM structure and control groups. This keeps question order, options, text fields and answer targets consistent across different sites instead of relying on one provider's private markup.

All acquisition modes share the same final answer pipeline: `Alt+A`, text selection and full-page solving resolve answers against the same ordered targets and apply them through the same control and field handlers. Already-selected radio choices are left unchanged, which avoids toggling them off on interfaces such as Google Forms.

### Gemini

1. Select **Google Gemini**.
2. Create a key at [Google AI Studio](https://aistudio.google.com/).
3. Paste it into **API Key**.
4. Leave **Model** empty to use the recommended default, or enter a supported model.
5. Test the connection and save the profile.

Never place API keys in this repository, screenshots or public messages. StudySnap stores them in Chrome extension storage on your computer.

## Local AI

Open the provider menu and select **Local host / Local AI**.

<div align="center">
  <img src="./docs/local-ai.svg" alt="Choose a local engine, connect the server, and use vision AI" width="100%">
</div>

Choose one engine:

- **Ollama** - native local API, simple setup and no API key.
- **OpenAI-compatible** - LM Studio, Jan, GPT4All, LocalAI, vLLM, llama.cpp and other compatible servers.

### Ollama

1. Install [Ollama](https://ollama.com/).
2. Download a vision model:

   ```powershell
   ollama pull llava
   ```

3. Start Ollama:

   ```powershell
   ollama serve
   ```

4. In StudySnap, select **Local host / Local AI** and **Ollama**.
5. Leave **API Key** empty.
6. Click **Test connection**, then **Save settings**.

If Chrome blocks the local request on Windows, restart Ollama with:

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

The first request can take longer while the model loads into memory. StudySnap keeps the connection alive during generation.

### OpenAI-compatible servers

1. Install your preferred local AI application.
2. Download a **vision-capable model**. Text-only models cannot analyze screenshots.
3. Start its OpenAI-compatible API server.
4. Select **OpenAI-compatible** in the StudySnap local engine menu.
5. Enter the server base URL:

| Application | Common base URL |
| --- | --- |
| LM Studio | `http://localhost:1234/v1` |
| Jan | `http://localhost:1337/v1` |
| GPT4All | `http://localhost:4891/v1` |
| LocalAI | `http://localhost:8080/v1` |
| vLLM | `http://localhost:8000/v1` |

6. Enter the exact loaded model ID.
7. Leave **API Key** empty unless the server requires authentication.
8. Click **Test connection**, then **Save settings**.

The connection test checks:

```text
GET /v1/models
```

Screenshot requests use:

```text
POST /v1/chat/completions
```

The server must support streaming and image input. If authentication is enabled, StudySnap sends the local key as a Bearer token.

## Keyboard shortcuts

| Action | Windows/Linux | macOS |
| --- | --- | --- |
| Select an area | `Alt+A` | `Option+A` |
| Answer selected text | Right-click → **Answer by StudySnap AI** | Right-click → **Answer by StudySnap AI** |
| Answer an image | Right-click the image → **Answer by StudySnap AI** | Right-click the image → **Answer by StudySnap AI** |
| Toggle Panic mode | `Alt+0` | `Option+0` |
| Cancel an active selection | `Esc` | `Esc` |

If a shortcut is already used by Chrome or another extension, change it at `chrome://extensions/shortcuts`.

## Panic mode

Panic mode is off by default.

Press `Alt+0` to:

- close every visible StudySnap answer box;
- remove an active selection overlay;
- pause new captures;
- stop the active answer connection;
- keep all settings unchanged.

Press `Alt+0` again to restore normal use. The popup header shows the state with a dot:

- dark dot: **off**;
- bright red dot: **on**.

## StudySnap workspace

Click **Open StudySnap Workspace** in the popup to:

- review previous answers;
- ask follow-up questions;
- switch profiles;
- export history as Markdown;
- print history to PDF;
- preview and download the screenshot attached to each conversation;
- export the selected conversation as a PDF, including its screenshot when available;
- change the workspace theme.

Screenshots produced by `Alt+A` are attached to their saved conversation. Select a conversation before using **PDF**: the export contains only that conversation, including its screenshot when available. Markdown export is not available. For context-menu requests that include selected text and an image, the workspace also stores and displays the selected question. The image is an additional part of the same multimodal request, not a replacement for the text.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| A shortcut does nothing | On normal `http`/`https` pages, reload the extension after an update and check `chrome://extensions/shortcuts`. In `chrome://extensions`, set StudySnap site access to **On all sites**. Chrome internal pages, the Chrome Web Store and some PDF viewers cannot be scripted by extensions. |
| The text menu item is missing | Select text first, then open the context menu. If it is still missing, reload StudySnap from `chrome://extensions` and verify that the extension has site access. |
| The selected-text explanation lacks context | Select only the passage or exercise, not the whole page. StudySnap automatically adds the visible page text as context and focuses on the selected content. |
| A selected question with a diagram is answered without using the diagram | Confirm that the selection contains the rendered image or a usable image URL, and use a vision-capable model. On rendered pages, the Markdown syntax may not appear in `selectionText`; StudySnap must instead find the corresponding `<img>` element. Images that require authentication or block extension requests may not be downloadable by Chrome. |
| An image answer fails | Right-click the image itself, not its surrounding text, and use a configured vision-capable model. Images that require authentication or block extension requests may not be downloadable by Chrome. |
| An answer box does not appear on a Chrome screen | Chrome blocks extension content scripts on some internal screens; this restriction cannot be removed by extension permissions. |
| Gemini, OpenAI or Anthropic fails | Check the API key, model name, account quota and provider status. |
| Ollama is unreachable | Confirm `ollama serve` is running and retry with `OLLAMA_ORIGINS=*` if Chrome blocks localhost. |
| A local server is unreachable | Check the application, port, `/v1` suffix and **Test connection**. |
| The model cannot understand the image | Load a vision-capable model, not a text-only model. |
| The first local answer is slow | The application may be loading the model into memory. Wait for the first response. |
| The connection is interrupted | Reload the extension, keep the server running and confirm that it supports streaming. |
| The answer is incomplete | Check the provider logs and confirm that the server returns valid SSE or Ollama JSON-line output. |

Requests that receive no response are stopped after 10 minutes.

## Privacy

StudySnap does not include its own AI model. Captured images and prompts are sent to the provider selected in settings.

- Cloud providers process data under their own terms.
- Ollama and other local servers can keep inference on your computer.
- API keys remain in Chrome extension storage and are not included in the project files.
- Do not capture passwords, private keys, confidential customer data or anything you are not allowed to share.

AI answers may be incomplete or incorrect. Verify important academic, technical, legal and safety-critical information.

## Creator

StudySnap AI Pro is created and maintained by [sgor](https://github.com/sgor-ai).

## License

StudySnap AI Pro is released under the [MIT License](./LICENSE).

<div align="center">
  <strong>StudySnap AI Pro - built for practical, clear and fast AI-assisted work.</strong><br>
  <strong>SGOR</strong>
</div>
