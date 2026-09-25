# StudySnap AI

<div align="center">
  <img src="./icona.png" alt="StudySnap AI" width="128">
  <h2>Capture, understand and study with AI</h2>
  <img src="./docs/demo.gif" alt="StudySnap AI demo" width="100%">
</div>

A Chrome extension for analyzing webpages, exercises, text and images with an AI provider.
It can also assist with study forms without changing the page when **Auto-answer** is disabled.

## Features

- Capture an area with `Alt+A`.
- Solve a structured page with `Alt+9`.
- Analyze selected text or images from the **Answer by StudySnap AI** context menu.
- Support for Google Forms, Microsoft Forms and common HTML/ARIA pages.
- Answers in the in-page box and workspace history.
- Optional filling of radio buttons, checkboxes, selects and text fields.
- Support for image-based questions and shared context.
- Protection for Name, Class, email, student ID and similar fields.
- **Auto-answer** and **Panic mode** (`Alt+0`).

## Shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+A` | Select an area and ask the AI |
| `Alt+9` | Analyze the page and solve detected questions |
| `Alt+0` | Enable or disable panic mode |
| Context menu | Analyze selected text or images |

## Auto-answer

- **Disabled:** shows the answer without changing page fields.
- **Enabled:** can select options and fill compatible fields.
- The form is never submitted automatically.
- Identity fields remain protected.

## Supported providers

- OpenAI
- Google Gemini
- Anthropic
- Ollama
- OpenAI-compatible local servers such as LM Studio, Jan, GPT4All, LocalAI and vLLM

## Installation

1. Download or clone the repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing `manifest.json`.
6. Configure the provider, model and API key in the popup.

Reload the extension from `chrome://extensions` after updating it.

## Release

Current version: **2.0.0**.

[Download the latest release](https://github.com/sgor-ai/StudySnap-AI/releases)

## Privacy

Settings, history and saved images remain in the browser.
Captured content is sent only to the configured AI provider.

