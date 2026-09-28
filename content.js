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
  let answerBoxVisible = false;
  let answerBoxSettingsLoaded = false;
  const answerBoxSettingsReady = chrome.storage.local.get("answerBoxVisible").then(settings => {
    answerBoxVisible = settings.answerBoxVisible !== false;
    answerBoxSettingsLoaded = true;
  }).catch(() => {
    answerBoxSettingsLoaded = true;
  });

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
    if (changes.answerBoxVisible) {
      answerBoxVisible = changes.answerBoxVisible.newValue !== false;
      if (!answerBoxVisible) closeAllAnswerBoxes();
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
    } else if (message.type === "QSA_SOLVE_PAGE" && !panicMode) {
      solveEntirePage();
    } else if (message.type === "QSA_SHOW_TEXT_ANSWER" && !panicMode) {
      showAnswerBox({ text: message.text || "", question: message.question || "" });
    } else if (message.type === "QSA_AUTO_ANSWER" && !panicMode) {
      maybeAutoAnswer(message.text || "", message.question || "");
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
    overlay.addEventListener("wheel", onOverlayWheel, { passive: false });
    document.addEventListener("keydown", onKeyDown);
  }

  function onOverlayWheel(event) {
    if (!overlay || panicMode) return;

    // L'overlay deve restare sopra la pagina per consentire la selezione,
    // quindi inoltriamo manualmente la rotellina al contenitore sottostante.
    event.preventDefault();

    const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const deltaX = event.deltaX * deltaMultiplier;
    const deltaY = event.deltaY * deltaMultiplier;
    const previousPointerEvents = overlay.style.pointerEvents;
    overlay.style.pointerEvents = "none";
    const underlyingElement = document.elementFromPoint(event.clientX, event.clientY);
    overlay.style.pointerEvents = previousPointerEvents;

    let scrollContainer = underlyingElement instanceof Element ? underlyingElement : null;
    while (scrollContainer && scrollContainer !== document.documentElement) {
      const style = getComputedStyle(scrollContainer);
      const canScrollVertically = /(auto|scroll|overlay)/.test(style.overflowY)
        && scrollContainer.scrollHeight > scrollContainer.clientHeight;
      const canScrollHorizontally = /(auto|scroll|overlay)/.test(style.overflowX)
        && scrollContainer.scrollWidth > scrollContainer.clientWidth;
      if ((deltaY && canScrollVertically) || (deltaX && canScrollHorizontally)) break;
      scrollContainer = scrollContainer.parentElement;
    }

    if (scrollContainer && scrollContainer !== document.documentElement) {
      scrollContainer.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
    } else {
      window.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanupOverlay();
    }
  }

  function onGlobalKeyDown(e) {
    if (e.altKey && ["a", "9"].includes(String(e.key).toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
    }
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
      overlay.removeEventListener("wheel", onOverlayWheel);
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
      const questionContext = getQuestionContext(rect);
      const targetHint = getQuestionTargetForRect(rect);
      const targetList = Array.isArray(targetHint) ? targetHint : targetHint ? [targetHint] : [];
      const imageEntries = [...new Map(targetList.flatMap(target =>
        (target.imageUrls || []).map(url => [`${target.itemId}|${url}`, {url,itemId:target.itemId,number:target.number}])
      )).values()];
      const imageUrls = imageEntries.map(entry => entry.url);
      await solveFromImage(croppedDataUrl, questionContext, false, imageUrls, targetHint, imageEntries);
    } catch (err) {
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  function getQuestionTargetForRect(rect) {
    const targets = getVisibleQuestionTargets(true);
    const selected = targets.map(target => {
      const bounds = target.element?.getBoundingClientRect?.();
      if (!bounds) return null;
      const overlapWidth = Math.max(0, Math.min(bounds.right, rect.right) - Math.max(bounds.left, rect.left));
      const overlapHeight = Math.max(0, Math.min(bounds.bottom, rect.bottom) - Math.max(bounds.top, rect.top));
      const overlap = overlapWidth * overlapHeight;
      return overlap > 0 ? { target, overlap } : null;
    }).filter(Boolean).sort((a, b) => {
      const position = a.target.element.compareDocumentPosition(b.target.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return b.overlap - a.overlap;
    });
    if (!selected.length) return null;
    return selected.length === 1
      ? selected[0].target
      : selected.map(entry => entry.target);
  }

  async function solveEntirePage() {
    if (panicMode) return;
    try {
      const pageContext = await getWholePageQuestionContext();
      if (!pageContext?.prompt) throw new Error("Nessuna domanda compilabile trovata nella pagina.");
      await solveFromImage("", pageContext.prompt, true, pageContext.imageUrls, null, pageContext.imageEntries);
    } catch (err) {
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  function formatAnswerLabelsForDisplay(answer, question = "") {
    const questionNumbers = new Map();
    for (const match of String(question || "").matchAll(
      /\bITEM\s*#?(\d+)\s*\(\s*numero\s+(\d+)\s*\)/gi
    )) {
      questionNumbers.set(Number(match[1]), Number(match[2]));
    }
    if (!questionNumbers.size) {
      for (const item of getQuestionItems()) {
        questionNumbers.set(item.itemId, item.number);
      }
    }
    return String(answer || "").replace(
      /^(\s*)(?:ITEM|ID)\s*#?(\d+)(?:\s*\([^)]*\))?\s*:\s*/gim,
      (match, whitespace, id) => `${whitespace}${questionNumbers.get(Number(id)) ?? Number(id)}: `
    );
  }

  async function getWholePageQuestionContext() {
    await renderWholePage();
    const root = document.querySelector("form") || document.body;
    const clone = root.cloneNode(true);
    clone.querySelectorAll("script, style, noscript").forEach(node => node.remove());
    clone.querySelectorAll('input[type="hidden"]').forEach(node => node.remove());
    clone.querySelectorAll("input").forEach(node => {
      node.removeAttribute("value");
    });
    clone.querySelectorAll("[checked], [selected], [aria-checked], [aria-selected]").forEach(node => {
      node.removeAttribute("checked");
      node.removeAttribute("selected");
      node.removeAttribute("aria-checked");
      node.removeAttribute("aria-selected");
    });
    clone.querySelectorAll("textarea").forEach(node => {
      node.textContent = "";
      node.removeAttribute("value");
    });
    clone.querySelectorAll("option").forEach(node => node.removeAttribute("selected"));
    clone.querySelectorAll('[contenteditable]:not([contenteditable="false"])').forEach(node => node.textContent = "");
    const fullMarkup = clone.outerHTML;
    const markupWasTruncated = fullMarkup.length > 180000;
    const markup = fullMarkup.slice(0, 180000);
    if (!markup) return "";
    const structuredQuestionItems = getQuestionItems();
    const structuredQuestions = formatQuestionItems(structuredQuestionItems, true);
    const supportingContext = getSupportingQuestionContext(structuredQuestionItems);
    const questionImageEntries = structuredQuestionItems.flatMap(item => {
      const questionItem = item.element;
      const candidates = [
        ...[...questionItem.querySelectorAll("img")]
          .map(image => image.currentSrc || image.src || image.getAttribute("data-src") || ""),
        ...[questionItem, ...questionItem.querySelectorAll("*")]
          .map(element => getComputedStyle(element).backgroundImage)
          .flatMap(value => [...String(value || "").matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map(match => match[1]))
      ];
      return [...new Set(candidates.map(url => {
        try { return new URL(url, document.baseURI).href; } catch (_) { return ""; }
      }).filter(url => /^https?:|^data:image\//i.test(url)))]
        .map(url => ({ itemId: item.itemId, number: item.number, url }));
    });
    const imageEntries = [...new Map(questionImageEntries.map(entry => [`${entry.itemId}|${entry.url}`, entry])).values()]
      .slice(0, 24)
      .map((entry, index) => ({ ...entry, index: index + 1 }));
    const imageUrls = imageEntries.map(entry => entry.url);
    const imageManifest = imageEntries.length
      ? imageEntries.map(entry => `IMMAGINE ${entry.index} = ITEM ${entry.itemId} (numero ${entry.number}) (${entry.url})`).join("\n")
      : "(Nessuna immagine associata alle domande.)";
    return {
      prompt: [
      StudySnapAcquisition.getQuizAnswerRules(),
      "Per l'intera pagina risolvi tutte le domande leggibili, incluse quelle collegate allo stesso brano, email, tabella o immagine. I valori e le selezioni correnti nel form possono essere errati e non sono una chiave di risposta.",
      "<DOMANDE_E_OPZIONI>",
      structuredQuestions || "(Elenco strutturato non disponibile.)",
      "</DOMANDE_E_OPZIONI>",
      "<CONTESTO_CONDIVISO>",
      supportingContext || "(Nessun contesto condiviso rilevato.)",
      "</CONTESTO_CONDIVISO>",
      "<ASSOCIAZIONE_IMMAGINI>",
      "Gli allegati vision sono nello stesso ordine di questo elenco. Usa ogni immagine solo per la domanda indicata:",
      imageManifest,
      "</ASSOCIAZIONE_IMMAGINI>",
      markupWasTruncated ? "(Nota: il markup supplementare è stato abbreviato per lunghezza. L'elenco strutturato sopra contiene comunque tutte le domande e opzioni rilevate ed è la fonte completa per gli ID.)" : "",
      "<FORM_MARKUP>",
      markup,
      "</FORM_MARKUP>"
      ].join("\n"),
      imageUrls,
      imageEntries
    };
  }

  async function renderWholePage() {
    // Microsoft Forms renders the complete question list in its internal DOM.
    // Scrolling it only causes visible jumps and is unnecessary for extraction.
    // The same is true for Google Forms and semantic quiz pages when all
    // question targets are already present in the DOM.
    if (
      document.querySelectorAll('[data-automation-id="questionItem"]').length > 0 ||
      getQuestionItems().length > 0
    ) {
      return;
    }
    const containers = [...document.querySelectorAll("*")]
      .filter(element =>
        element !== document.documentElement &&
        element !== document.body &&
        element.scrollHeight > element.clientHeight + 50
      )
      .sort((a, b) => b.scrollHeight - a.scrollHeight)
      .slice(0, 4);
    const positions = [
      [window, window.scrollY],
      ...containers.map(element => [element, element.scrollTop])
    ];
    const hasInternalScrollContainer = containers.some(element =>
      element !== document.documentElement &&
      element !== document.body &&
      element.clientHeight > 0 &&
      element.scrollHeight > element.clientHeight + 50
    );
    if (!hasInternalScrollContainer) positions.push([window, window.scrollY]);
    let stablePasses = 0;
    let previousHeights = "";
    const maxScrollPasses = 32;
    const stablePassesRequired = 3;
    const scrollPollInterval = 120;
    for (let pass = 0; pass < maxScrollPasses && stablePasses < stablePassesRequired; pass++) {
      if (!hasInternalScrollContainer) {
        window.scrollTo(0, Math.min(document.documentElement.scrollHeight, (pass + 1) * window.innerHeight));
      }
      containers.forEach(element => {
        const step = Math.max(240, element.clientHeight - 80);
        element.scrollTop = Math.min(element.scrollHeight, element.scrollTop + step);
      });
      await new Promise(resolve => setTimeout(resolve, scrollPollInterval));
      const heights = containers.map(element => element.scrollHeight).join(",");
      if (heights === previousHeights) stablePasses++;
      else stablePasses = 0;
      previousHeights = heights;
    }
    positions.forEach(([element, position]) => {
      if (element === window) window.scrollTo(0, position);
      else element.scrollTop = position;
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async function solveFromImage(imageDataUrl, question = "", fillAll = false, imageUrls = [], targetHint = null, imageEntries = []) {
    if (panicMode) return;
    // Non mostrare alcun box durante l'elaborazione: la risposta viene
    // accumulata in memoria e il box appare solo quando la risposta finale
    // è arrivata ed è pronta per il rendering.
    let finalAnswer = "";

    try {
      finalAnswer = await callAIViaPort(imageDataUrl, () => {
        // Streaming interno: nessun elemento grafico viene mostrato mentre
        // la risposta sta arrivando.
      }, question, fillAll ? question : "", imageUrls, imageEntries);

      if (panicMode) return;
      await answerBoxSettingsReady;
      if (answerBoxVisible) {
        const liveBox = createAnswerBox();
        const liveBody = liveBox.querySelector(".qsa-answer-body");
        liveBody.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.className = "qsa-text";
        wrapper.appendChild(renderMathText(formatAnswerLabelsForDisplay(finalAnswer || "", question)));
        liveBody.appendChild(wrapper);
      }

      await maybeAutoAnswer(finalAnswer || "", fillAll ? "" : question, fillAll, targetHint);
    } catch (err) {
      // Gli errori restano visibili per permettere all'utente di capire cosa
      // è successo; il box normale non compare durante l'elaborazione.
      showAnswerBox({ error: err.message || String(err) });
    }
  }

  async function maybeAutoAnswer(answer, question, fillAll = false, targetHint = null) {
    const settings = await chrome.storage.local.get(["autoAnswer"]);
    // The toggle is a global safety gate. Acquisition and answer display remain
    // available when disabled, but no mode may mutate page controls.
    if (settings.autoAnswer !== true || panicMode || !answer) return;
    const cleanAnswer = StudySnapAcquisition.removeSkippedAnswerPlaceholders(
      StudySnapAcquisition.removeRepeatedMathExpressions(answer)
    );
    if (!cleanAnswer.trim()) return;
    await autoFillPage(cleanAnswer, question, fillAll, targetHint);
  }

    async function autoFillPage(answer, question, fillAll = false, targetHint = null) {
      if (fillAll) await renderWholePage();
      return await fillUnifiedAnswers(answer, question, targetHint, fillAll);
    }

      async function fillUnifiedAnswers(answer, question = "", targetHint = null, fillAll = false) {
      const targets = getVisibleQuestionTargets(true);
      if (!targets.length) return { filled: false };
      const numbered = getNumberedAnswers(answer);
      const questionNumbers = extractQuestionNumbers(question);
      const targetHints = Array.isArray(targetHint) ? targetHint : targetHint ? [targetHint] : [];
      const singleQuestionTarget = targetHints.length === 1
        ? targetHints[0]
        : targetHints.length
          ? null
          : (question && questionNumbers.length <= 1
            ? findBestQuestionTarget(question, targets)
            : null);
      const selectedBlocks = question && questionNumbers.length > 1
        ? extractQuestionBlocks(question)
        : [];
      const selectedTargets = targetHints.length > 1
        ? mapAnswersToSelectedTargets(numbered, getAnswerLines(answer), targetHints)
        : [];
      const values = selectedTargets.length
        ? selectedTargets
        : singleQuestionTarget && numbered.length
        ? [{ target: singleQuestionTarget, value: numbered[0].value }]
        : singleQuestionTarget
          ? [{ target: singleQuestionTarget, value: getAnswerLines(answer)[0] || answer }]
          : selectedBlocks.length === numbered.length
            ? mapAnswersToQuestionBlocks(numbered, selectedBlocks, targets)
          : numbered.length
        ? mapNumberedAnswersToTargets(numbered, targets, fillAll)
        : mapPlainAnswersToTargets(getAnswerLines(answer), question, questionNumbers, targets);
      const unmappedAnswers = numbered.filter(item => !values.some(({ target, value }) =>
        value === item.value &&
        (item.itemId != null
          ? target.itemId === item.itemId || target.number === item.itemId
          : target.number === item.number)
      ));
      if (unmappedAnswers.length) {
        console.warn("StudySnap: impossibile associare alcune risposte ai target:", unmappedAnswers.map(item => item.itemId ?? item.number));
      }
      let filled = 0;
      const failedTargets = [];
      for (const { target, value } of values) {
        const freshTarget = resolveFreshTarget(target);
        if (await applyAnswerToTarget(freshTarget, value)) filled++;
        else failedTargets.push(freshTarget?.number ?? freshTarget?.itemId ?? "sconosciuto");
      }
      if (failedTargets.length) {
        console.warn("StudySnap: risposta non applicata (nessuna opzione corrispondente, campo non supportato o target protetto):", failedTargets);
      }
      return { filled, complete: filled === values.length };
    }

    function findTargetForAnswerId(id, targets) {
      const byId = targets.filter(target => target.itemId === id);
      if (byId.length === 1) return byId[0];
      const byQuestionNumber = targets.filter(target => target.number === id);
      return byQuestionNumber.length === 1 ? byQuestionNumber[0] : null;
    }

    function mapAnswersToSelectedTargets(numbered, lines, targetHints) {
      if (numbered.length && numbered.some(item => item.itemId != null)) {
        return numbered
          .map(item => ({
            target: findTargetForAnswerId(item.itemId, targetHints),
            value: item.value
          }))
          .filter(item => item.target && item.value);
      }
      const values = numbered.length ? numbered.map(item => item.value) : lines;
      return targetHints
        .filter(target => !target.protected && !isProtectedQuestion(target.title, target.field || target.element))
        .slice(0, values.length)
        .map((target, index) => ({
          target,
          value: values[index]
        }))
        .filter(item => item.value);
    }

    function resolveFreshTarget(target) {
      if (!target) return null;
      const wantedTitle = normalizeText(target.title || target.element?.innerText || "");
      const directTarget = target.element?.isConnected &&
        (target.field?.isConnected || getTargetControls(target).length)
        ? target
        : null;
      if (directTarget) return directTarget;
      const currentTargets = getVisibleQuestionTargets(true);
      return currentTargets.find(candidate =>
          candidate.number === target.number &&
          wantedTitle &&
          (normalizeText(candidate.title || candidate.element?.innerText || "").includes(wantedTitle.slice(0, 80)) ||
            wantedTitle.includes(normalizeText(candidate.title || candidate.element?.innerText || "").slice(0, 80)))
        ) ||
        currentTargets.find(candidate => candidate.itemId === target.itemId) ||
        target;
    }

    function findBestQuestionTarget(question, targets) {
      const wanted = questionSearchText(question);
      if (!wanted || wanted.length < 3) return null;
      const ranked = targets.map(target => {
        const text = normalizeText(target.element?.innerText || "");
        const title = normalizeText(target.title || "");
        const score = Math.max(
          title && wanted.includes(title) ? title.length : 0,
          text.includes(wanted) ? wanted.length : 0,
          wanted.includes(text) ? text.length : 0
        );
        return { target, score, length: text.length };
      }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.length - b.length);
      return ranked[0]?.target || null;
    }

    function extractQuestionBlocks(question) {
      const lines = String(question || "").split(/\r?\n/);
      const blocks = [];
      let current = [];
      lines.forEach(line => {
        if (/^\s*\d{1,3}\s*[.)\-:]\s*/.test(line) && current.length) {
          blocks.push(current.join("\n"));
          current = [];
        }
        if (line.trim()) current.push(line);
      });
      if (current.length) blocks.push(current.join("\n"));
      return blocks;
    }

    function mapAnswersToQuestionBlocks(numbered, blocks, targets) {
      return numbered.map((item, index) => ({
        target: findBestQuestionTarget(blocks[index], targets),
        value: item.value
      })).filter(item => item.target);
    }

    function mapNumberedAnswersToTargets(numbered, targets, preferDocumentOrder = false) {
      const byNumber = new Map();
      targets.forEach(target => {
        if (target.number == null) return;
        if (!byNumber.has(target.number)) byNumber.set(target.number, []);
        byNumber.get(target.number).push(target);
      });
      const offsets = new Map();
      let documentIndex = -1;
      return numbered.map(item => {
        if (item.itemId != null) {
          const target = findTargetForAnswerId(item.itemId, targets);
          return { target, value: item.value };
        }
        const candidates = byNumber.get(item.number) || [];
        if (preferDocumentOrder) {
          const next = candidates.find(candidate => targets.indexOf(candidate) > documentIndex);
          if (next) {
            documentIndex = targets.indexOf(next);
            return { target: next, value: item.value };
          }
        }
        const offset = offsets.get(item.number) || 0;
        offsets.set(item.number, offset + 1);
        return { target: candidates[offset], value: item.value };
      }).filter(item => item.target);
    }

    function mapPlainAnswersToTargets(lines, question, questionNumbers, targets) {
      if (!lines.length) return [];
      if (lines.length === 1) {
        const wanted = questionSearchText(question);
        const target = wanted
          ? targets
            .map(item => ({ item, text: normalizeText(item.element?.innerText || "") }))
            .filter(item => item.text.includes(wanted))
            .sort((a, b) => a.text.length - b.text.length)[0]?.item
          : targets.find(item => item.controls?.length && isVisible(item.element)) || targets[0];
        return target ? [{ target, value: lines[0] }] : [];
      }
      if (questionNumbers.length) {
        const offsets = new Map();
        const selected = questionNumbers.map(number => {
          const candidates = targets.filter(target => target.number === number);
          const offset = offsets.get(number) || 0;
          offsets.set(number, offset + 1);
          return candidates[offset];
        }).filter(Boolean);
        if (selected.length === lines.length) {
          return lines.map((value, index) => ({ target: selected[index], value }));
        }
      }
      const visible = targets.filter(target => {
        const rect = target.element?.getBoundingClientRect?.();
        return rect && rect.bottom > 0 && rect.top < window.innerHeight;
      });
      const source = visible.length === lines.length ? visible : targets;
      return source.length === lines.length
        ? lines.map((value, index) => ({ target: source[index], value }))
        : [];
    }

    async function applyAnswerToTarget(target, value) {
      if (!target || isUncertainAnswer(value)) return false;
      if (target.protected) return false;
      if (isProtectedQuestion(target.title, target.field || target.element)) return false;
      const controls = getTargetControls(target);
      if (controls.length) {
        const choice = extractChoice(value);
        const select = controls.find(control => control.matches?.("select"));
        if (select) {
          const wanted = StudySnapAcquisition.normalizeChoiceText(choice?.optionText || extractOpenAnswer(value));
          const option = [...select.options].find(candidate =>
            StudySnapAcquisition.normalizeChoiceText(candidate.textContent) === wanted ||
            StudySnapAcquisition.normalizeChoiceText(candidate.value) === wanted ||
            (choice && Number(candidate.index) === "abcde".indexOf(choice.letter.toLowerCase()))
          );
          if (!option) return false;
          if (select.value === option.value) return true;
          select.value = option.value;
          dispatchFormEvents(select);
          return true;
        }
        const control = choice
          ? findChoiceInControls(choice, controls)
          : findChoiceByAnswerTextInControls(value, controls);
        if (!control) return false;
        if (isChoiceSelected(control)) return true;
        if (!clickChoiceControl(control)) return false;
        dispatchFormEvents(control);
        await new Promise(resolve => setTimeout(resolve, 20));
        return true;
      }
      if (!target.field) return false;
      let field = target.field;
      if (field.matches?.('button[aria-label="Switch to text"], button[title="Switch to text"]')) {
        field.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        const currentTarget = resolveFreshTarget(target) || target;
        field = getOpenAnswerField(currentTarget.element);
        if (!field) return false;
        target = { ...currentTarget, field };
      }
      const surroundingText = getFieldSurroundingText(field);
      const openValue = StudySnapAcquisition.normalizeOpenFieldValue(
        extractOpenAnswer(value),
        surroundingText.before,
        StudySnapAcquisition.requiresAnswerUnits(
          target.title || getFieldQuestionText(field, target.element)
        ) ? "" : surroundingText.after
      );
      if (!openValue || isUncertainAnswer(openValue)) return false;
      setNativeValue(field, openValue);
      dispatchFormEvents(field);
      await new Promise(resolve => setTimeout(resolve, 20));
      return true;
    }

    function getFieldSurroundingText(field) {
      let before = "";
      let after = "";
      for (let parent = field.parentElement, depth = 0; parent && depth < 4; parent = parent.parentElement, depth++) {
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(parent);
        beforeRange.setEndBefore(field);
        const afterRange = document.createRange();
        afterRange.selectNodeContents(parent);
        afterRange.setStartAfter(field);
        const candidateBefore = beforeRange.toString();
        const candidateAfter = afterRange.toString();

        if (candidateBefore.trim()) before = candidateBefore;
        if (candidateAfter.trim()) after = candidateAfter;
        if (before.trimEnd().match(/[a-z][a-z0-9_]{0,11}\s*(?:=|:)\s*$/i) && after.trimStart()) break;
      }
      return { before, after };
    }

    function extractQuestionNumbers(question) {
      const numbers = String(question || "")
        .split(/\r?\n/)
        .map(line => line.match(/^\s*(\d{1,3})\s*(?::|[.)\-]|$)/)?.[1])
        .filter(Boolean);
      return numbers.map(Number).filter(number => number > 0);
    }

    function isUncertainAnswer(value) {
      return /^\s*(?:\[.*\]|unknown|unclear|not sure|cannot determine|non so|non determinabile|non leggibile)\s*$/i.test(String(value || ""));
    }

    function getAnswerLines(answer) {
      return String(answer || "")
        .split(/\r?\n/)
        .map(line => line.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean);
    }

    function parseNumberedAnswer(line) {
      const itemMatch = String(line).match(/^\s*(?:ITEM|ID)\s*#?\s*(\d+)(?:\s*\([^)]*\))?\s*(?:[:.)\-]|\s)\s*(.+?)\s*$/i);
      if (itemMatch) return { number: null, itemId: Number(itemMatch[1]), value: itemMatch[2] };
      const match = String(line).match(/^\s*(\d{1,3})(?:(?:\s*[:)\-]\s*)|(?:[.,]\s+)|(?:\s+))(.+?)\s*$/);
      return match ? { number: Number(match[1]), itemId: null, value: match[2] } : { number: null, itemId: null, value: line };
    }

    function getNumberedAnswers(answer) {
      const answers = [];
      let current = null;
      for (const line of String(answer || "").split(/\r?\n/)) {
        const parsed = parseNumberedAnswer(line);
        if (parsed.itemId != null || parsed.number != null) {
          if (current) answers.push(current);
          current = parsed;
        } else if (current && line.trim()) {
          current.value = `${current.value}\n${line.trim()}`;
        }
      }
      if (current) answers.push(current);
      return answers.filter(item => item.value);
    }

    function questionNumber(element) {
      const container = element.closest('[role="listitem"], [role="radiogroup"], [role="group"]') || element;
      const labelledByText = (container.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .map(id => document.getElementById(id)?.innerText || "")
        .join(" ");
      for (let node = container, depth = 0; node && depth < 10; node = node.parentElement, depth++) {
        const text = `${node.getAttribute("aria-label") || ""}\n${labelledByText}\n${node.innerText || ""}`;
        const match = text.match(/^\s*(\d{1,3})\s*(?:[,.)\-:]|\n)/);
        if (match) return Number(match[1]);
      }
      return null;
    }

    function getVisibleQuestionTargets(includeOffscreen = false) {
      const targets = [];
      const questionItems = getQuestionItems();
      const knownControls = new Set();
      const knownFields = new Set();
      questionItems.forEach(item => {
        if (item.field) {
          knownFields.add(item.field);
          const rect = item.field.getBoundingClientRect();
          if (includeOffscreen || (rect.bottom > 0 && rect.top < window.innerHeight)) {
            targets.push({
              field: item.field,
              element: item.element,
              top: rect.top,
              number: item.number,
              title: item.title,
              itemId: item.itemId,
              imageUrls: item.imageUrls || [],
              protected: isProtectedQuestion(item.title, item.field)
            });
          }
          return;
        }
        const group = (item.controlElements || []).filter(control =>
          includeOffscreen || isVisible(control) || isVisible(controlLabelElement(control))
        );
        if (!group.length) return;
        group.forEach(control => knownControls.add(control));
        const label = controlLabelElement(group[0]);
        const rect = (label || group[0]).getBoundingClientRect();
        if (includeOffscreen || (rect.bottom > 0 && rect.top < window.innerHeight)) {
          targets.push({
            controls: group,
            element: item.element,
            top: rect.top,
            number: item.number,
            title: item.title,
            itemId: item.itemId,
            imageUrls: item.imageUrls || [],
            protected: isProtectedQuestion(item.title, group[0])
          });
        }
      });
      const groups = new Map();
      [...document.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], select, [role="combobox"], [role="listbox"]')]
        .filter(control => !knownControls.has(control))
        .filter(control => includeOffscreen || isVisible(control) || isVisible(controlLabelElement(control)))
        .forEach(control => {
          const container = control.closest('[role="listitem"], [role="radiogroup"], [role="group"]');
          const key = container || control.getAttribute("name") || control.parentElement;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(control);
        });
      groups.forEach(group => {
        const label = controlLabelElement(group[0]);
        const rect = (label || group[0]).getBoundingClientRect();
        if (includeOffscreen || (rect.bottom > 0 && rect.top < window.innerHeight)) {
          targets.push({ controls: group, element: group[0].closest('[role="listitem"], [role="radiogroup"], [role="group"]') || group[0], top: rect.top, number: questionNumber(group[0]), title: normalizeText(group[0].closest('[role="listitem"], [role="radiogroup"], [role="group"]')?.innerText || "") });
        }
      });

      document.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="search"], [role="textbox"], [contenteditable="true"]')
        .forEach(field => {
          if (knownFields.has(field) || (!includeOffscreen && !isVisible(field)) || field.disabled || field.readOnly) return;
          const protectedField = isProtectedQuestion("", field);
          const rect = field.getBoundingClientRect();
          if (includeOffscreen || (rect.bottom > 0 && rect.top < window.innerHeight)) {
            const element = field.closest('[data-question-id], [role="listitem"], [role="group"], fieldset, form') || field;
          targets.push({ field, element, top: rect.top, number: questionNumber(field), title: normalizeText(getFieldQuestionText(field, element)), protected: protectedField });
          }
        });
      return targets.sort((a, b) => {
        if (a.element === b.element) return 0;
        const position = a.element.compareDocumentPosition(b.element);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return a.top - b.top;
      })
        .map((target, index) => ({
          ...target,
          itemId: target.itemId || index + 1
        }));
    }

    function isProtectedQuestion(title, field) {
      const fieldMetadata = [
        field.getAttribute("type") || "",
        field.getAttribute("aria-label") || "",
        field.getAttribute("placeholder") || "",
        field.getAttribute("name") || "",
        field.getAttribute("id") || "",
        field.getAttribute("autocomplete") || ""
      ].join(" ");
      const labelledBy = (field.getAttribute("aria-labelledby") || "")
          .split(/\s+/)
          .map(id => document.getElementById(id)?.innerText || "")
          .join(" ");
      return StudySnapAcquisition.isProtectedIdentity(
        `${title || ""} ${labelledBy}`,
        fieldMetadata
      );
    }

    function getFieldQuestionText(field, container = field) {
      const labelledBy = (field.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .map(id => document.getElementById(id)?.innerText || "")
        .filter(Boolean)
        .join(" ");
      const labels = [...document.querySelectorAll("label")]
        .filter(label => label.htmlFor && field.id && label.htmlFor === field.id)
        .map(label => label.innerText || "")
        .join(" ");
      const ownLabel = field.getAttribute("aria-label") || field.getAttribute("placeholder") || "";
      const containerText = String(container?.innerText || "").trim();
      return [labelledBy, labels, ownLabel, containerText].filter(Boolean).join(" ").trim();
    }

    function isProtectedIdentityField(field) {
      return isProtectedQuestion("", field);
    }

    function getOpenAnswerField(container) {
      return container?.querySelector?.(
        'textarea, input:not([type]), input[type="text"], input[type="search"], [role="textbox"], [contenteditable="true"]'
      ) || null;
    }

    function findChoiceInControls(choice, controls) {
      const wanted = StudySnapAcquisition.normalizeChoiceText(choice.optionText);
      if (wanted) {
        const exact = controls.find(control =>
          StudySnapAcquisition.normalizeChoiceText(controlLabel(control)) === wanted ||
          StudySnapAcquisition.normalizeChoiceText(control.getAttribute("value")) === wanted
        );
        if (exact) return exact;
      }
      const position = "abcde".indexOf(choice.letter.toLowerCase()) + 1;
      return controls.find(control => {
        const label = StudySnapAcquisition.normalizeChoiceText(controlLabel(control));
        return new RegExp(`(^|\\W)${choice.letter.toLowerCase()}(?=\\W|$)`, "i").test(label) ||
          Number(control.getAttribute("aria-posinset")) === position;
      }) || (controls.length === 1 && choice.optionText === "" ? controls[0] : null);
    }

    function findChoiceByAnswerTextInControls(answer, controls) {
      const answerText = String(answer);
      const wanted = new Set([
        StudySnapAcquisition.normalizeChoiceText(answerText),
        ...(answerText.includes("\n")
          ? [StudySnapAcquisition.normalizeChoiceText(answerText.split(/\r?\n/).map(line => line.trim()).join("/"))]
          : [])
      ]);
      const exact = controls.find(control => {
        const labels = [
          StudySnapAcquisition.normalizeChoiceText(controlLabel(control)),
          StudySnapAcquisition.normalizeChoiceText(control.getAttribute("value"))
        ];
        return labels.some(label => wanted.has(label));
      });
      if (exact) return exact;
      const partial = controls
        .map(control => ({
          control,
          text: StudySnapAcquisition.normalizeChoiceText(controlLabel(control))
        }))
        .filter(item => item.text && (wanted.includes(item.text) || item.text.includes(wanted)))
        .sort((a, b) => b.text.length - a.text.length);
      return partial.length && (partial.length === 1 || partial[0].text.length > partial[1].text.length)
        ? partial[0].control
        : null;
    }

  function extractChoice(answer) {
      const text = String(answer).trim();
      const labelled = text.match(/(?:risposta|opzione|answer|choice)\s*(?:corretta)?\s*(?:è|is|:|-)?\s*(?:la|the)?\s*\(?([A-E])\)?(?:[.)\s:\-]|$)/i);
      const leading = text.match(/^\s*\(?([A-E])\)?[.)\s:\-]/i);
      const bare = text.match(/^\s*\(?([A-E])\)?\s*$/i);
      const letter = (labelled || leading || bare)?.[1]?.toUpperCase();
      if (!letter) return null;
      const match = text.match(new RegExp(`\\(?${letter}\\)?[.)\\s:\\-]+(.+?)(?=\\n|$)`, "i"));
      return { letter, optionText: match?.[1]?.trim() || "" };
    }

    function questionSearchText(question) {
      return normalizeText(String(question || "")
        .replace(/^\s*\d+\s*(?:[.)\-:]|\n)\s*/i, "")
        .split(/!\[/)[0]);
    }

  function clickChoiceControl(control) {
    if (!control) return false;
    if (isChoiceSelected(control)) return true;
    const target = isVisible(control) ? control : controlLabelElement(control) || control;
    if (!target) return false;
    target.click();
    if (target !== control && typeof control.focus === "function") control.focus();
    return true;
  }

  function isChoiceSelected(control) {
    if (!control) return false;
    return control.checked === true ||
      control.getAttribute("aria-checked") === "true" ||
      control.getAttribute("aria-selected") === "true";
  }

  function getTargetControls(target) {
    const selector = 'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"], [role="option"], select, [role="combobox"], [role="listbox"]';
    const fresh = target?.element?.querySelectorAll ? [...target.element.querySelectorAll(selector)] : [];
    return fresh.length ? fresh : (target?.controls || []);
  }

  function controlLabelElement(control) {
    const id = control.id;
    if (id) {
      try {
        const linked = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (linked) return linked;
      } catch (_) {}
    }
    return control.closest("label") || control.closest('[role="radio"], [role="option"]') || control.parentElement;
  }

  function controlLabel(control) {
      const labelledBy = (control.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .map(id => document.getElementById(id)?.innerText || document.getElementById(id)?.getAttribute("aria-label") || "")
        .filter(Boolean)
        .join(" ");
      return labelledBy || controlLabelElement(control)?.innerText || control.getAttribute("aria-label") ||
        control.getAttribute("value") || control.parentElement?.innerText || "";
    }

    function findAnswerField(question) {
      const candidates = [...document.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="search"], [role="textbox"], [contenteditable="true"]')]
        .filter(field => isVisible(field) && !field.disabled && !field.readOnly);
      const wantedQuestion = questionSearchText(question);
      if (wantedQuestion) {
        const ranked = candidates.map(field => {
          let bestSize = Number.POSITIVE_INFINITY;
          let node = field;
          for (let depth = 0; node && depth < 14; depth++, node = node.parentElement) {
            const text = normalizeText(node.innerText || "");
            if (text.includes(wantedQuestion)) bestSize = Math.min(bestSize, text.length);
          }
          const labelledBy = (field.getAttribute("aria-labelledby") || "").split(/\s+/);
          if (labelledBy.some(id => normalizeText(document.getElementById(id)?.innerText || "").includes(wantedQuestion))) {
            bestSize = Math.min(bestSize, wantedQuestion.length);
          }
          return {field, bestSize};
        }).filter(item => Number.isFinite(item.bestSize)).sort((a, b) => a.bestSize - b.bestSize);
        if (ranked.length) return ranked[0].field;
        return null;
      }
      const scored = candidates.filter(field => fieldScore(field) >= 35);
      return scored.length === 1 ? scored[0] : null;
    }

  function fieldScore(field) {
      const labelledText = (field.getAttribute("aria-labelledby") || "")
        .split(/\s+/)
        .map(id => document.getElementById(id)?.innerText || "")
        .join(" ");
      const text = `${field.getAttribute("aria-label") || ""} ${field.getAttribute("placeholder") || ""} ${field.name || ""} ${field.id || ""} ${labelledText}`.toLowerCase();
      let score = field.tagName === "TEXTAREA" || field.isContentEditable ? 20 : 0;
      if (/(answer|response|risposta|risposta aperta|reply|enter your answer)/i.test(text)) score += 30;
      if (/(^|\W)(name|nome)(\W|$)/i.test(text)) score -= 50;
      if (field.maxLength > 200 || field.isContentEditable) score += 10;
      return score;
    }

  function extractOpenAnswer(answer) {
      return String(answer)
        .replace(/^\s*(?:risposta|answer)\s*[:\-]\s*/i, "")
        .replace(/^\s*\d{1,3}(?:(?:\s*[:)\-]\s*)|(?:[.,]\s+)|(?:\s+))/i, "")
        .trim();
    }

  function setNativeValue(field, value) {
      if (field.isContentEditable) {
        field.focus();
        document.execCommand("selectAll", false);
        document.execCommand("insertText", false, value);
        return;
      }
      const prototype = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(field, value);
      else field.value = value;
    }

  function dispatchFormEvents(element) {
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }

  function isVisible(element) {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && element.getBoundingClientRect().width > 0;
    }

  function normalizeText(value) {
      return String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}%.,€$°Ω+\-\/ ]/gu, "").trim();
  }

  function callAIViaPort(imageDataUrl, onChunk, question = "", userPrompt = "", imageUrls = [], imageEntries = []) {
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

      port.postMessage({
        type: "QSA_CALL_AI",
        imageDataUrl,
        options: {
          question,
          userPrompt: userPrompt || undefined,
          ocrText: userPrompt || undefined,
          textOnly: !imageDataUrl && imageUrls.length === 0,
          imageUrls,
          imageEntries
        }
      });
    });
  }

  function getQuestionContext(rect) {
    const structured = getQuestionItems().filter(item => {
      const element = item.element;
      const bounds = element.getBoundingClientRect();
      return bounds.bottom >= rect.top && bounds.top <= rect.bottom &&
        bounds.right >= rect.left && bounds.left <= rect.right;
    });
    if (structured.length) {
      const context = getSupportingQuestionContext(structured);
      return buildUnifiedAcquisitionPrompt(`${formatQuestionItems(structured, true)}${context ? `\n\nCONTESTO CONDIVISO:\n${context}` : ""}`);
    }
    const points = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + 8, rect.top + 8],
      [rect.right - 8, rect.bottom - 8]
    ];
    const candidates = [];
    for (const [x, y] of points) {
      for (const element of document.elementsFromPoint(x, y)) {
        if (!element.innerText) continue;
        const text = element.innerText.trim();
        if (text.length >= 10 && text.length <= 1800) candidates.push(text);
      }
    }
    return buildUnifiedAcquisitionPrompt(candidates.sort((a, b) => a.length - b.length)[0] || "");
  }

  function getVisibleQuestionContext(targets = null) {
    const viewportItems = (targets || getVisibleQuestionTargets(false)).map(target => ({
      element: target.element,
      number: target.number,
      title: target.title || normalizeText(target.element?.innerText || ""),
      controls: getTargetControls(target).map(control => controlLabel(control).trim()).filter(Boolean),
      imageUrls: target.imageUrls || []
    })).filter(item => {
      const rect = item.element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const context = getSupportingQuestionContext(viewportItems);
    return buildUnifiedAcquisitionPrompt(`${formatQuestionItems(viewportItems, true)}${context ? `\n\nCONTESTO CONDIVISO:\n${context}` : ""}`);
  }

  function buildUnifiedAcquisitionPrompt(context) {
    return StudySnapAcquisition.buildQuizPrompt(context);
  }

  function getSupportingQuestionContext(items) {
    if (!items.length) return "";
    const pageText = String(document.body?.innerText || "").replace(/\r/g, "");
    const firstIndex = pageText.search(/(?:part\s+(?:iv|v|vi)|please\s+read\s+the\s+following|urgent\s+inbox|reading\s+comprehension)/i);
    if (firstIndex < 0) return "";
    const endMarkers = [
      pageText.indexOf("Clear selection", firstIndex),
      pageText.indexOf("Clear form", firstIndex),
      pageText.indexOf("Submit", firstIndex)
    ].filter(index => index > firstIndex);
    const endIndex = endMarkers.length ? Math.min(...endMarkers) : Math.min(pageText.length, firstIndex + 10000);
    const context = pageText.slice(firstIndex, endIndex).trim();
    return context.length >= 80 ? context.slice(0, 10000) : "";
  }

  function getQuestionItems() {
    const items = [];
    document.querySelectorAll('[data-automation-id="questionItem"]').forEach(element => {
      const number = questionNumber(element);
      const title = element.querySelector('[data-automation-id="questionTitle"]')?.innerText ||
        element.innerText.split(/\r?\n/).slice(1, 2).join(" ");
      const meaningfulTitle = String(title || "").replace(/\(1\s*Point\)|single\s*choice|multiple\s*choice|required\s*to\s*answer/gi, " ").trim();
      const controlElements = [...element.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], select, [role="combobox"], [role="listbox"]')];
      const field = getOpenAnswerField(element) ||
        element.querySelector('button[aria-label="Switch to text"], button[title="Switch to text"]');
      const controls = controlElements
        .map(control => controlLabel(control).trim())
        .filter(Boolean);
      const imageUrls = [...element.querySelectorAll("img")]
        .map(image => image.currentSrc || image.src || image.getAttribute("data-src") || "")
        .filter(Boolean);
      if (number != null && (meaningfulTitle || controlElements.length || field)) {
        items.push({
          element,
          number,
          title: normalizeText(meaningfulTitle || `Domanda ${number}`),
          controls,
          controlElements,
          field,
          imageUrls
        });
      }
    });
    if (items.length) return normalizeQuestionItems(items);
    document.querySelectorAll('[role="listitem"]').forEach(element => {
      const controls = [...element.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], select, [role="combobox"], [role="listbox"]')];
      const field = element.querySelector('textarea, input:not([type]), input[type="text"], input[type="search"], [role="textbox"], [contenteditable="true"]');
      if (!controls.length && !field) return;
      const number = questionNumber(element);
      const lines = String(element.innerText || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const titleLine = lines.find(line => /^\d{1,3}\s*[.)\-:]/.test(line));
      const title = (titleLine || lines[0] || "").replace(/^\s*\d{1,3}\s*[.)\-:]\s*/, "");
      if (number != null && (title || controls.length || field)) {
        items.push({
          element,
          number,
          title: normalizeText(title || `Domanda ${number}`),
          controls: controls.map(control => controlLabel(control).trim()).filter(Boolean),
          controlElements: controls,
          field,
          imageUrls: [...element.querySelectorAll("img")].map(image => image.currentSrc || image.src || "").filter(Boolean)
        });
      }
    });
    if (items.length) return normalizeQuestionItems(items);
    const groups = [...document.querySelectorAll('[role="radiogroup"], [role="group"], fieldset')];
    const semanticItems = groups.map(element => ({
      element,
      number: questionNumber(element),
      title: normalizeText(element.innerText || ""),
      controls: [...element.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], select, [role="combobox"], [role="listbox"]')]
        .map(control => controlLabel(control).trim()).filter(Boolean),
      controlElements: [...element.querySelectorAll('input[type="radio"], input[type="checkbox"], [role="radio"], [role="option"], select, [role="combobox"], [role="listbox"]')]
    })).filter(item => item.number != null);
    if (semanticItems.length) return normalizeQuestionItems(semanticItems);

    return getGenericQuestionItems();
  }

  function normalizeQuestionItems(items) {
    const orderedItems = items
      .filter(item => item.element && (item.controlElements?.length || item.controls?.length || item.field))
      .sort((a, b) => {
        const position = a.element.compareDocumentPosition(b.element);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
    const usedIds = new Set();
    let fallbackId = Math.max(0, ...orderedItems.map(item => Number(item.number) || 0)) + 1;
    return orderedItems.map((item, index) => {
      const number = item.number != null ? item.number : index + 1;
      let itemId = Number.isInteger(item.number) && item.number > 0 ? item.number : null;
      if (itemId == null || usedIds.has(itemId)) {
        while (usedIds.has(fallbackId)) fallbackId++;
        itemId = fallbackId++;
      }
      usedIds.add(itemId);
      return { ...item, number, itemId };
    });
  }

  function getGenericQuestionItems() {
    const controls = [...document.querySelectorAll(
      'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"], [role="option"], select, [role="combobox"], [role="listbox"]'
    )].filter(control => !isDisabledControl(control));
    const groups = new Map();
    controls.forEach(control => {
      const group = control.getAttribute("name") ||
        control.getAttribute("data-question-id") ||
        control.closest('[role="radiogroup"], [role="group"], fieldset') ||
        control.parentElement;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(control);
    });
    const controlItems = [...groups.values()].map(group => {
      const element = findGenericQuestionContainer(group);
      const labels = group.map(control => controlLabel(control).trim()).filter(Boolean);
      const fullText = String(element?.innerText || "").trim();
      const title = removeOptionLabels(fullText, labels);
      return {
        element: element || group[0],
        number: questionNumber(element || group[0]),
        title: normalizeText(title || fullText),
        controls: labels,
        controlElements: group,
        imageUrls: [...((element || group[0]).querySelectorAll?.("img") || [])]
          .map(image => image.currentSrc || image.src || "").filter(Boolean)
      };
    }).filter(item => item.title && item.controlElements.length > 0);
    const fieldItems = [...document.querySelectorAll(
      'textarea, input:not([type]), input[type="text"], input[type="search"], [role="textbox"], [contenteditable="true"]'
    )]
      .filter(field => !field.disabled && !field.readOnly)
      .map(field => {
        const element = field.closest('[data-question-id], [role="listitem"], [role="group"], fieldset, form') ||
          findGenericFieldContainer(field);
        return {
          element,
          field,
          number: questionNumber(field),
          title: normalizeText(getFieldQuestionText(field, element)),
          controls: [],
          controlElements: [],
          imageUrls: []
        };
      })
      .filter(item => item.title);
    return normalizeQuestionItems([...controlItems, ...fieldItems]);
  }

  function findGenericFieldContainer(field) {
    for (let node = field.parentElement, depth = 0; node && node !== document.body && depth < 8; node = node.parentElement, depth++) {
      const text = String(node.innerText || "").trim();
      if (node.matches?.("fieldset, [role='listitem'], [role='group'], [data-question-id]")) return node;
      if (text.length >= 2 && text.length <= 500) return node;
    }
    return field;
  }

  function findGenericQuestionContainer(controls) {
    let node = controls[0];
    let best = node;
    for (let depth = 0; node && depth < 12 && node !== document.body; depth++, node = node.parentElement) {
      const text = String(node.innerText || "").trim();
      if (text.length >= 8 && text.length <= 5000) best = node;
      if (node.matches?.("fieldset, [role='listitem'], [role='radiogroup'], [role='group'], [data-question-id]")) return node;
    }
    return best;
  }

  function removeOptionLabels(text, labels) {
    let result = String(text || "");
    labels.forEach(label => {
      if (label) result = result.replace(label, "");
    });
    return result.replace(/^\s*\d{1,3}\s*[.)\-:]\s*/, "").replace(/\(required\)|required/gi, "").trim();
  }

  function isDisabledControl(control) {
    return control.disabled === true ||
      control.getAttribute("aria-disabled") === "true" ||
      control.closest("[disabled], [aria-disabled='true']");
  }

  function formatQuestionItems(items, stableIds = false) {
    if (!items.length) return "";
    return [
      stableIds
        ? "Rispondi solo agli elementi acquisiti. Ogni riga deve usare esattamente il formato ITEM N: RISPOSTA, dove N e l'ID stabile scritto accanto all'elemento. Non usare il numero visualizzato della domanda e non rinumerare gli elementi, anche se ometti una risposta incerta. Usa il testo esatto dell'opzione per le scelte multiple e solo il testo da inserire per i campi aperti."
        : "Rispondi solo alle domande acquisite. Mantieni una riga per ogni domanda nel formato NUMERO: RISPOSTA. Usa il testo esatto dell'opzione per le scelte multiple e solo il testo da inserire per i campi aperti. Se una risposta non è certa, ometti quella domanda.",
      ...items
        .filter(item => !isProtectedQuestion(item.title, item.field || item.element))
        .sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
        .map((item, index) => `${stableIds ? `ITEM ${item.itemId || index + 1} (numero ${item.number})` : item.number}: ${item.title}${item.controls.length ? ` | Opzioni: ${item.controls.join(" / ")}` : item.field ? " | Campo aperto: inserisci solo quanto richiesto dalla consegna e dal contesto del campo; non ripetere etichette o testo gia visibile." : ""}${item.imageUrls?.length ? ` | Immagini associate: ${item.imageUrls.join(" ; ")}` : ""}${item.imageUrls?.length && /^domanda\s+\d+$/i.test(item.title) ? " | DOMANDA IMAGE-ONLY: usare obbligatoriamente l'immagine associata" : ""}`)
    ].join("\n");
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
    const entry = answerBoxes.find((b) => b.el === el);
    if (entry?.fadeTimer) clearTimeout(entry.fadeTimer);
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

    const entry = { el, fadeTimer: setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add("qsa-answer-box-fade-out");
      setTimeout(() => {
        if (el.isConnected) removeAnswerBox(el);
      }, 500);
    }, 30000) };
    answerBoxes.push(entry);

    while (answerBoxes.length > QSA_MAX_BOXES) {
      const oldest = answerBoxes.shift();
      oldest.el.remove();
    }

    repositionAnswerBoxes();
    return el;
  }

  function showAnswerBox({ text, error, question = "" }) {
    if (!answerBoxSettingsLoaded) {
      answerBoxSettingsReady.then(() => showAnswerBox({ text, error, question }));
      return;
    }
    if (panicMode || !answerBoxVisible) return;
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
    const fragment = renderMathText(formatAnswerLabelsForDisplay(text ?? "", question));
    wrapper.appendChild(fragment);

    const reveal = () => {
    if (panicMode || !answerBoxVisible) return;
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
    answerBoxes.forEach(({ fadeTimer }) => {
      if (fadeTimer) clearTimeout(fadeTimer);
    });
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
    text = StudySnapAcquisition.wrapBareLatexForDisplay(text);

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