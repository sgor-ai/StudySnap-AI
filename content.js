// content.js
(() => {
  if (window.__qsaInjected) return;
  window.__qsaInjected = true;

  let overlay = null;
  let selectionBox = null;
  let startX = 0;
  let startY = 0;
  let isSelecting = false;
  let animationFrameId = null;
  let panicMode = false;

  chrome.storage.local.get(["panicMode"], (data) => {
    panicMode = data.panicMode === true;
    if (panicMode) closeAllAnswerBoxes();
  });

  document.addEventListener("keydown", onGlobalKeyDown);

  // ---- Modalità di visualizzazione risposta (Undercover / Normale) ----
  // Letta da chrome.storage.local e tenuta aggiornata in tempo reale, cosi'
  // il cambio di modalita' dal popup si applica subito senza ricaricare la
  // pagina (vale sia per i box gia' presenti sia per quelli futuri).
  let undercoverMode = true;

  chrome.storage.local.get(["undercoverMode"], (data) => {
    undercoverMode = data.undercoverMode !== false;
    applyDisplayModeToAllBoxes();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.undercoverMode) {
      undercoverMode = changes.undercoverMode.newValue !== false;
      applyDisplayModeToAllBoxes();
    }
    if (changes.panicMode) {
      panicMode = changes.panicMode.newValue === true;
      if (panicMode) {
        cleanupOverlay();
        closeAllAnswerBoxes();
      }
    }
  });

  function applyDisplayModeToBox(el) {
    el.classList.toggle("qsa-mode-undercover", undercoverMode);
    el.classList.toggle("qsa-mode-normal", !undercoverMode);
  }

  function applyDisplayModeToAllBoxes() {
    answerBoxes.forEach(({ el }) => applyDisplayModeToBox(el));
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "QSA_PANIC_MODE") {
      panicMode = message.enabled === true;
      if (panicMode) {
        cleanupOverlay();
        closeAllAnswerBoxes();
      }
    } else if (message.type === "QSA_ACTIVATE_SELECTION" && !panicMode) {
      startSelectionMode();
    } else if (message.type === "QSA_CAPTURE_FULLSCREEN" && !panicMode) {
      captureFullScreenAndSolve();
    }
  });

  function startSelectionMode() {
    if (overlay || panicMode) return;

    overlay = document.createElement("div");
    overlay.id = "qsa-overlay";

    selectionBox = document.createElement("div");
    selectionBox.id = "qsa-selection-box";
    overlay.appendChild(selectionBox);

    document.documentElement.appendChild(overlay);

    overlay.addEventListener("mousedown", onMouseDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanupOverlay();
    }
  }

  function onGlobalKeyDown(e) {
    if (e.altKey && e.key === "0") {
      if (onGlobalKeyDown.lastToggle && Date.now() - onGlobalKeyDown.lastToggle < 750) return;
      onGlobalKeyDown.lastToggle = Date.now();
      e.preventDefault();
      chrome.runtime.sendMessage({ type: "QSA_TOGGLE_PANIC" }).catch(() => {});
    }
  }

  function onMouseDown(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    Object.assign(selectionBox.style, {
      left: startX + "px",
      top: startY + "px",
      width: "0px",
      height: "0px",
      display: "block"
    });

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e) {
    if (!isSelecting) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    animationFrameId = requestAnimationFrame(() => {
      const left = Math.min(currentX, startX);
      const top = Math.min(currentY, startY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      if (selectionBox) {
        Object.assign(selectionBox.style, {
          left: left + "px",
          top: top + "px",
          width: width + "px",
          height: height + "px"
        });
      }
    });
  }

  async function onMouseUp() {
    isSelecting = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    if (!selectionBox) return;
    const rect = selectionBox.getBoundingClientRect();
    cleanupOverlay();

    if (rect.width < 8 || rect.height < 8) return;

    await captureAndSolve(rect);
  }

  function cleanupOverlay() {
    document.removeEventListener("keydown", onKeyDown);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    if (overlay) {
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.remove();
      overlay = null;
      selectionBox = null;
    }
  }

  async function captureAndSolve(rect) {
    if (panicMode) return;
    try {
      const captureRes = await chrome.runtime.sendMessage({ type: "QSA_CAPTURE_VISIBLE_TAB" });
      if (!captureRes || !captureRes.ok) {
        throw new Error(captureRes?.error || "Cattura schermo fallita.");
      }

      const croppedDataUrl = await cropImage(captureRes.dataUrl, rect);
      await solveFromImage(croppedDataUrl);
    } catch (err) {
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  // Cattura l'intera pagina visibile (senza chiedere di selezionare un'area)
  // e la invia direttamente all'AI, attivata dalla scorciatoia Alt+S.
  async function captureFullScreenAndSolve() {
    if (panicMode) return;
    try {
      const captureRes = await chrome.runtime.sendMessage({ type: "QSA_CAPTURE_VISIBLE_TAB" });
      if (!captureRes || !captureRes.ok) {
        throw new Error(captureRes?.error || "Cattura schermo fallita.");
      }

      await solveFromImage(captureRes.dataUrl);
    } catch (err) {
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  async function solveFromImage(imageDataUrl) {
    if (panicMode) return;
    // Non mostrare alcun box durante l'elaborazione: la risposta viene
    // accumulata in memoria e il box appare solo quando la risposta finale
    // è arrivata ed è pronta per il rendering.
    let finalAnswer = "";

    try {
      finalAnswer = await callAIViaPort(imageDataUrl, () => {
        // Streaming interno: nessun elemento grafico viene mostrato mentre
        // la risposta sta arrivando.
      });

      if (panicMode) return;
      const liveBox = createAnswerBox();
      const liveBody = liveBox.querySelector(".qsa-answer-body");
      liveBody.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "qsa-text";
      wrapper.appendChild(renderMathText(finalAnswer || ""));
      liveBody.appendChild(wrapper);
    } catch (err) {
      // Gli errori restano visibili per permettere all'utente di capire cosa
      // è successo; il box normale non compare durante l'elaborazione.
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  function callAIViaPort(imageDataUrl, onChunk) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let streamedAnswer = "";
      let lastProviderError = "";
      const port = chrome.runtime.connect({ name: "qsa-ai-call" });

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        try { port.disconnect(); } catch (_) {}
        fn(value);
      };

      port.onMessage.addListener((res) => {
        if (!res) return;

        // The background service worker uses a streaming protocol:
        // start -> chunk* -> done, with provider_error messages between
        // fallback attempts. Do not treat the initial start message as an error.
        if (res.type === "start") return;

        if (res.type === "chunk") {
          streamedAnswer += res.text || "";
          if (typeof onChunk === "function") onChunk(streamedAnswer);
          return;
        }

        if (res.type === "provider_error") {
          lastProviderError = res.error || "";
          return;
        }

        if (res.type === "done") {
          finish(resolve, res.answer ?? streamedAnswer);
          return;
        }

        if (res.type === "error") {
          finish(reject, new Error(res.error || lastProviderError || "Errore durante la richiesta all'AI."));
          return;
        }

        // Backward compatibility with a non-streaming response.
        if (res.ok) {
          finish(resolve, res.answer || streamedAnswer);
        } else if (res.error) {
          finish(reject, new Error(res.error));
        }
      });

      port.onDisconnect.addListener(() => {
        if (!settled) {
          settled = true;
          reject(new Error(lastProviderError || "Connessione con l'estensione interrotta prima di ricevere una risposta."));
        }
      });

      port.postMessage({ type: "QSA_CALL_AI", imageDataUrl });
    });
  }

  function cropImage(dataUrl, rect) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Impossibile inizializzare il contesto Canvas 2D"));
          return;
        }

        ctx.drawImage(
          img,
          rect.left * dpr,
          rect.top * dpr,
          rect.width * dpr,
          rect.height * dpr,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Caricamento immagine fallito per il ritaglio."));
      img.src = dataUrl;
    });
  }

  // ---- Stack Box Risposte ----
  let answerBoxes = [];
  let qsaBoxCounter = 0;

  const QSA_MAX_BOXES = 5;
  const QSA_GAP = 14;

  function qsaBoxWidth() {
    return window.matchMedia("(max-width: 480px)").matches ? 260 : 300;
  }
  function qsaBaseRight() {
    return window.matchMedia("(max-width: 480px)").matches ? 20 : 30;
  }

  function repositionAnswerBoxes() {
    const width = qsaBoxWidth();
    const base = qsaBaseRight();
    const total = answerBoxes.length;

    answerBoxes.forEach((box, i) => {
      const distanceFromNewest = total - 1 - i;
      const right = base + distanceFromNewest * (width + QSA_GAP);
      box.el.style.right = right + "px";
    });
  }

  function removeAnswerBox(el) {
    answerBoxes = answerBoxes.filter((b) => b.el !== el);
    el.remove();
    repositionAnswerBoxes();
  }

  function createAnswerBox() {
    qsaBoxCounter += 1;
    const el = document.createElement("div");
    el.className = "qsa-answer-box";
    el.id = `qsa-answer-box-${qsaBoxCounter}`;
    applyDisplayModeToBox(el);
    el.innerHTML = `
      <div class="qsa-answer-header">
        <span class="qsa-answer-title">Risposta</span>
        <div class="qsa-answer-actions">
          <button class="qsa-copy-btn" title="Copia risposta">Copia</button>
          <button class="qsa-close-btn" title="Chiudi">&times;</button>
        </div>
      </div>
      <div class="qsa-answer-body"></div>
    `;
    document.documentElement.appendChild(el);

    el.querySelector(".qsa-close-btn").addEventListener("click", () => removeAnswerBox(el));

    el.querySelector(".qsa-copy-btn").addEventListener("click", () => {
      const body = el.querySelector(".qsa-answer-body");
      navigator.clipboard.writeText(body.innerText).then(() => {
        const btn = el.querySelector(".qsa-copy-btn");
        const original = btn.textContent;
        btn.textContent = "Copiato";
        setTimeout(() => (btn.textContent = original), 1200);
      });
    });

    answerBoxes.push({ el });

    while (answerBoxes.length > QSA_MAX_BOXES) {
      const oldest = answerBoxes.shift();
      oldest.el.remove();
    }

    repositionAnswerBoxes();
    return el;
  }

  function showAnswerBox({ text, error }) {
    if (panicMode) return;
    if (error) {
      const el = createAnswerBox();
      const body = el.querySelector(".qsa-answer-body");
      body.innerHTML = `<div class="qsa-error">${escapeHtml(error)}</div>`;
      return;
    }

    // Costruisce prima l'intero contenuto (testo + formule LaTeX gia'
    // renderizzate da KaTeX) in un elemento ancora fuori dal DOM, e solo
    // quando tutto e' pronto crea e mostra il box delle risposte. In questo
    // modo il box non appare mai vuoto per poi "riempirsi" un istante dopo:
    // box e contenuto compaiono sempre insieme.
    const wrapper = document.createElement("div");
    wrapper.className = "qsa-text";
    const fragment = renderMathText(text ?? "");
    wrapper.appendChild(fragment);

    const reveal = () => {
      if (panicMode) return;
      const el = createAnswerBox();
      const body = el.querySelector(".qsa-answer-body");
      body.appendChild(wrapper);
    };

    // Aspetta che i font (incluso quello di KaTeX) siano effettivamente
    // caricati prima di creare il box: senza questa attesa il box potrebbe
    // comparire con un font di fallback per poi "saltare" al font
    // matematico corretto un istante dopo.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reveal).catch(reveal);
    } else {
      reveal();
    }

  }

  function closeAllAnswerBoxes() {
    document.querySelectorAll(".qsa-answer-box").forEach((el) => el.remove());
    answerBoxes = [];
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---- Rendering LaTeX (KaTeX) + markdown-lite ottimizzato ----
  const QSA_MATH_REGEX = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$((?:[^$\n]|\\\$)+?)\$/g;

  function renderMathText(text) {
    // Usa un document fragment per costruire tutto in memoria
    const fragment = document.createDocumentFragment();

    // 1) Tokenizza il testo intero separando i blocchi matematici (KaTeX)
    //    dal testo semplice.
    const rawChunks = [];
    let lastIndex = 0;
    let match;
    QSA_MATH_REGEX.lastIndex = 0;

    while ((match = QSA_MATH_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        rawChunks.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }

      const displaySrc = match[1] !== undefined ? match[1] : match[2];
      const inlineSrc = match[3] !== undefined ? match[3] : match[4];
      const isDisplay = displaySrc !== undefined;
      const mathSrc = isDisplay ? displaySrc : inlineSrc;

      rawChunks.push({ type: 'math', content: mathSrc, display: isDisplay, raw: match[0] });

      lastIndex = QSA_MATH_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      rawChunks.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // 2) Ricostruisce le righe andando a capo sui chunk di testo, mantenendo
    //    i chunk matematici come token atomici nella riga in cui cadono.
    //    Cosi' un elenco puntato che contiene una formula viene comunque
    //    riconosciuto correttamente riga per riga.
    const lines = [[]];
    for (const chunk of rawChunks) {
      if (chunk.type === 'math') {
        lines[lines.length - 1].push(chunk);
        continue;
      }
      const parts = chunk.content.split("\n");
      parts.forEach((part, i) => {
        if (part) lines[lines.length - 1].push({ type: 'text', content: part });
        if (i < parts.length - 1) lines.push([]);
      });
    }

    // 3) Riconosce elenchi puntati/numerati riga per riga e raggruppa le
    //    righe consecutive dello stesso tipo in <ul>/<ol>.
    const BULLET_RE = /^[ \t]*[-*•][ \t]+/;
    const NUMBERED_RE = /^[ \t]*\d+[.)][ \t]+/;

    let currentList = null; // { type: 'ul' | 'ol', el }
    const closeList = () => { currentList = null; };

    lines.forEach((line, idx) => {
      const isEmpty = line.length === 0 || (line.length === 1 && line[0].type === 'text' && line[0].content.trim() === "");
      if (isEmpty) {
        closeList();
        if (idx < lines.length - 1) fragment.appendChild(document.createElement("br"));
        return;
      }

      let listType = null;
      let renderedLine = line;
      const first = line[0];
      if (first && first.type === 'text') {
        if (BULLET_RE.test(first.content)) {
          listType = 'ul';
          renderedLine = [{ type: 'text', content: first.content.replace(BULLET_RE, "") }, ...line.slice(1)];
        } else if (NUMBERED_RE.test(first.content)) {
          listType = 'ol';
          renderedLine = [{ type: 'text', content: first.content.replace(NUMBERED_RE, "") }, ...line.slice(1)];
        }
      }

      if (listType) {
        if (!currentList || currentList.type !== listType) {
          currentList = { type: listType, el: document.createElement(listType) };
          fragment.appendChild(currentList.el);
        }
        const li = document.createElement("li");
        appendLineSegments(li, renderedLine);
        currentList.el.appendChild(li);
      } else {
        closeList();
        appendLineSegments(fragment, renderedLine);
        if (idx < lines.length - 1) fragment.appendChild(document.createElement("br"));
      }
    });

    return fragment;
  }

  function appendLineSegments(container, segments) {
    for (const seg of segments) {
      if (seg.type === 'math') {
        appendMathSegment(container, seg);
      } else {
        appendInlineMarkdown(container, seg.content);
      }
    }
  }

  function appendMathSegment(container, seg) {
    if (typeof katex === "undefined") {
      container.appendChild(document.createTextNode(seg.raw !== undefined ? seg.raw : seg.content));
      return;
    }
    const span = document.createElement(seg.display ? "div" : "span");
    try {
      katex.render(seg.content, span, {
        throwOnError: false,
        displayMode: seg.display,
        trust: true,
        strict: "ignore",
        macros: {
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}"
        }
      });
    } catch (e) {
      span.textContent = seg.raw !== undefined ? seg.raw : seg.content;
    }
    container.appendChild(span);
  }

  // ---- Markdown-lite: solo **grassetto** e *corsivo* (niente titoli/link/codice) ----
  const QSA_INLINE_MD_REGEX = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;

  function appendInlineMarkdown(container, text) {
    QSA_INLINE_MD_REGEX.lastIndex = 0;
    let lastIndex = 0;
    let match;
    let found = false;

    while ((match = QSA_INLINE_MD_REGEX.exec(text)) !== null) {
      found = true;
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const boldContent = match[1] !== undefined ? match[1] : match[2];
      const italicContent = match[3] !== undefined ? match[3] : match[4];

      if (boldContent !== undefined) {
        const strong = document.createElement("strong");
        strong.textContent = boldContent;
        container.appendChild(strong);
      } else {
        const em = document.createElement("em");
        em.textContent = italicContent;
        container.appendChild(em);
      }

      lastIndex = QSA_INLINE_MD_REGEX.lastIndex;
    }

    if (!found) {
      container.appendChild(document.createTextNode(text));
      return;
    }
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }
})();