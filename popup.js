// popup.js

// ---------------------------------------------------------------------
// Traduzioni dell'interfaccia.
// ---------------------------------------------------------------------
const TRANSLATIONS = {
  it: {
    appTitle: "StudySnap AI",
    popupTitle: "StudySnap AI - Impostazioni",
    settingsGearTitle: "Impostazioni generali",
    settingsPanelTitle: "Impostazioni generali",
    displayModeLabel: "Modalità risposta",
    modeUndercover: "Undercover",
    modeUndercoverDesc: "Risposta discreta e poco evidente.",
    modeNormal: "Normale",
    modeNormalDesc: "Risposta evidente in un box ben visibile.",
    fallbackLabel: "Fallback automatico",
    fallbackOn: "Attivo",
    fallbackOff: "Disattivato",
    fallbackOnDesc: "Passa a un altro profilo/provider se si verifica un errore.",
    fallbackOffDesc: "Resta sul provider selezionato senza cambiare profilo.",
    autoAnswerLabel: "Auto-answer",
    autoAnswerOn: "Attivato",
    autoAnswerOff: "Disattivato",
    autoAnswerOnDesc: "Seleziona l'opzione o compila il campo di risposta.",
    autoAnswerOffDesc: "Mostra solo la risposta nel box StudySnap.",
    autoAnswerWarning: "Non invia automaticamente il modulo.",
    answerBoxLabel: "Box risposte",
    answerBoxOn: "Visibile",
    answerBoxOff: "Nascosto",
    answerBoxOnDesc: "Mostra il box con la risposta dell'AI.",
    answerBoxOffDesc: "Nasconde il box, mantenendo attive acquisizione e compilazione.",
    panicLabel: "Panic mode",
    panicOn: "Attiva",
    panicOff: "Disattivata",
    panicOnDesc: "Catture e box di risposta bloccati.",
    panicOffDesc: "Estensione pronta all'uso.",
    languageLabel: "Lingua (interfaccia e risposte AI)",
    languageHint: "Cambia sia la lingua del popup sia la lingua in cui l'AI risponde.",
    activeProfileLabel: "Profilo Attivo",
    newProfileBtn: "+ Nuovo",
    renameProfileBtn: "Modifica Nome",
    deleteProfileBtn: "Elimina",
    renamePlaceholder: "Nuovo nome profilo...",
    renameSaveBtn: "Salva",
    aiProviderLabel: "Provider AI",
    providerGemini: "Google Gemini (API gratuita, cloud)",
    providerLocalHost: "Local host / AI locale (Ollama, LM Studio, Jan, GPT4All...)",
    localEngineLabel: "Motore locale",
    localEngineOllama: "Ollama",
    localEngineCompatible: "OpenAI-compatible (LM Studio, Jan, GPT4All, LocalAI...)",
    providerOpenai: "OpenAI (cloud)",
    providerAnthropic: "Anthropic (Claude)",
    modelLabel: "Modello",
    modelPlaceholder: "es. gemini-2.5-flash",
    modelHint: "Lascia vuoto per usare il default consigliato.",
    endpointLabel: "URL server locale",
    endpointPlaceholder: "es. http://localhost:1234/v1",
    endpointHint: "Solo per AI locali OpenAI-compatible. Inserisci l'URL base che espone /v1/models e /v1/chat/completions.",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "La tua API key",
    apiKeyPlaceholderNone: "Non necessaria",
    apiKeyHint: "Non richiesta per Ollama. Per server OpenAI-compatible usala solo se il server la richiede.",
    geminiHintHtml: '💡 Gemini: ottieni la key gratis su <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a> → "Get API key". Nessuna carta richiesta.',
    ollamaHintHtml: '💡 Ollama: installa <b>ollama.com</b>, poi da terminale: <code>ollama pull llava</code>.<br>Avvia con <code>OLLAMA_ORIGINS=* ollama serve</code>.',
    localOpenAIHintHtml: '💡 Compatibile con <b>LM Studio</b>, <b>Jan</b>, <b>GPT4All</b>, vLLM, LocalAI e ogni server OpenAI-compatible. Avvia il server locale, inserisci l\'URL (di solito <code>http://localhost:1234/v1</code>) e il nome del modello.',
    testConnectionBtn: "🔌 Testa connessione",
    saveSettingsBtn: "Salva impostazioni",
    signature: "Creato con cura da SGOR",
    shortcutHtml: '⌨️ Scorciatoie: <b>Alt+A</b> seleziona un\'area, <b>Alt+9</b> risolve l\'intera pagina, <b>Alt+0</b> attiva/disattiva la panic mode. Se una scorciatoia è occupata, cambiala in <code>chrome://extensions/shortcuts</code>.',
    statusProfileUpdated: "Profilo attivo aggiornato ✔",
    statusProfileCreated: "Nuovo profilo creato ✔",
    statusProfileRenamed: "Nome profilo aggiornato ✔",
    statusMinProfiles: "Devi mantenere almeno un profilo.",
    statusProfileDeleted: (name) => `Profilo "${name}" eliminato ✔`,
    statusSettingsSaved: "Impostazioni salvate con successo ✔",
    newProfileNamePrefix: "Profilo",
    defaultProfileName: "Profilo Predefinito",
    testInProgress: "Verifica in corso...",
    testOllamaUnreachable: "Ollama non raggiungibile su localhost:11434. È avviato con OLLAMA_ORIGINS=* ollama serve?",
    testOllamaError: (status) => `Ollama ha risposto con un errore (${status}).`,
    testOllamaOkWithModels: (names) => `Ollama raggiungibile ✔ — modelli: ${names}`,
    testOllamaOkNoModels: "Ollama raggiungibile ✔ (nessun modello ancora scaricato)",
    testLocalCompatibleError: (status) => `Server AI locale ha risposto con errore (${status}).`,
    testLocalCompatibleOk: "Server AI locale raggiungibile ✔",
    testNeedApiKey: "Inserisci prima una API key da testare.",
    testGeminiError: (status) => `API key Gemini non valida (${status}).`,
    testGeminiOk: "API key Gemini valida ✔",
    testOpenaiError: (status) => `API key OpenAI non valida (${status}).`,
    testOpenaiOk: "API key OpenAI valida ✔",
    testAnthropicError: (status) => `API key Anthropic non valida (${status}).`,
    testAnthropicOk: "API key Anthropic valida ✔",
    testUnknownProvider: "Provider non riconosciuto."
  },
  en: {
    appTitle: "StudySnap AI",
    popupTitle: "StudySnap AI - Settings",
    settingsGearTitle: "General settings",
    settingsPanelTitle: "General settings",
    displayModeLabel: "Answer display",
    modeUndercover: "Undercover",
    modeUndercoverDesc: "Discreet, low-visibility answer.",
    modeNormal: "Normal",
    modeNormalDesc: "Answer shown in a clearly visible box.",
    fallbackLabel: "Automatic fallback",
    fallbackOn: "Enabled",
    fallbackOff: "Disabled",
    fallbackOnDesc: "Switch to another profile/provider when an error occurs.",
    fallbackOffDesc: "Stay on the selected provider without switching.",
    autoAnswerLabel: "Auto-answer",
    autoAnswerOn: "Enabled",
    autoAnswerOff: "Disabled",
    autoAnswerOnDesc: "Selects an option or fills the answer field.",
    autoAnswerOffDesc: "Only shows the answer in the StudySnap box.",
    autoAnswerWarning: "The form is never submitted automatically.",
    answerBoxLabel: "Answer box",
    answerBoxOn: "Visible",
    answerBoxOff: "Hidden",
    answerBoxOnDesc: "Shows the AI answer box.",
    answerBoxOffDesc: "Hides the box while keeping capture and auto-answer active.",
    panicLabel: "Panic mode",
    panicOn: "Enabled",
    panicOff: "Disabled",
    panicOnDesc: "Captures and answer boxes are blocked.",
    panicOffDesc: "The extension is ready to use.",
    languageLabel: "Language (interface and AI answers)",
    languageHint: "Changes both the popup language and the language the AI answers in.",
    activeProfileLabel: "Active Profile",
    newProfileBtn: "+ New",
    renameProfileBtn: "Rename",
    deleteProfileBtn: "Delete",
    renamePlaceholder: "New profile name...",
    renameSaveBtn: "Save",
    aiProviderLabel: "AI Provider",
    providerGemini: "Google Gemini (free API, cloud)",
    providerLocalHost: "Local host / Local AI (Ollama, LM Studio, Jan, GPT4All...)",
    localEngineLabel: "Local engine",
    localEngineOllama: "Ollama",
    localEngineCompatible: "OpenAI-compatible (LM Studio, Jan, GPT4All, LocalAI...)",
    providerOpenai: "OpenAI (cloud)",
    providerAnthropic: "Anthropic (Claude)",
    modelLabel: "Model",
    modelPlaceholder: "e.g. gemini-2.5-flash",
    modelHint: "Leave empty to use the recommended default.",
    endpointLabel: "Local server URL",
    endpointPlaceholder: "e.g. http://localhost:1234/v1",
    endpointHint: "Only for OpenAI-compatible local AI. Enter the base URL exposing /v1/models and /v1/chat/completions.",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "Your API key",
    apiKeyPlaceholderNone: "Not needed",
    apiKeyHint: "Not required for Ollama. For OpenAI-compatible servers, use one only if the server requires it.",
    geminiHintHtml: '💡 Gemini: get a free key at <a href="https://aistudio.google.com" target="_blank">aistudio.google.com</a> → "Get API key". No card required.',
    ollamaHintHtml: '💡 Ollama: install <b>ollama.com</b>, then in a terminal: <code>ollama pull llava</code>.<br>Start it with <code>OLLAMA_ORIGINS=* ollama serve</code>.',
    localOpenAIHintHtml: '💡 Works with <b>LM Studio</b>, <b>Jan</b>, <b>GPT4All</b>, vLLM, LocalAI, and any OpenAI-compatible server. Start the local server, enter its URL (usually <code>http://localhost:1234/v1</code>), and enter the model name.',
    testConnectionBtn: "🔌 Test connection",
    saveSettingsBtn: "Save settings",
    signature: "Crafted with care by SGOR",
    shortcutHtml: '⌨️ Shortcuts: <b>Alt+A</b> selects an area, <b>Alt+9</b> solves the complete page, <b>Alt+0</b> toggles panic mode. If a shortcut is already used, change it at <code>chrome://extensions/shortcuts</code>.',
    statusProfileUpdated: "Active profile updated ✔",
    statusProfileCreated: "New profile created ✔",
    statusProfileRenamed: "Profile name updated ✔",
    statusMinProfiles: "You must keep at least one profile.",
    statusProfileDeleted: (name) => `Profile "${name}" deleted ✔`,
    statusSettingsSaved: "Settings saved successfully ✔",
    newProfileNamePrefix: "Profile",
    defaultProfileName: "Default Profile",
    testInProgress: "Testing...",
    testOllamaUnreachable: "Ollama unreachable at localhost:11434. Is it running with OLLAMA_ORIGINS=* ollama serve?",
    testOllamaError: (status) => `Ollama responded with an error (${status}).`,
    testOllamaOkWithModels: (names) => `Ollama reachable ✔ — models: ${names}`,
    testOllamaOkNoModels: "Ollama reachable ✔ (no models downloaded yet)",
    testLocalCompatibleError: (status) => `Local AI server returned an error (${status}).`,
    testLocalCompatibleOk: "Local AI server reachable ✔",
    testNeedApiKey: "Enter an API key to test first.",
    testGeminiError: (status) => `Invalid Gemini API key (${status}).`,
    testGeminiOk: "Gemini API key valid ✔",
    testOpenaiError: (status) => `Invalid OpenAI API key (${status}).`,
    testOpenaiOk: "OpenAI API key valid ✔",
    testAnthropicError: (status) => `Invalid Anthropic API key (${status}).`,
    testAnthropicOk: "Anthropic API key valid ✔",
    testUnknownProvider: "Unrecognized provider."
  }
};

let currentLanguage = "it";

function t(key, ...args) {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.it;
  const entry = dict[key] !== undefined ? dict[key] : TRANSLATIONS.it[key];
  return typeof entry === "function" ? entry(...args) : entry;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
  document.title = t("popupTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });

  updateHint();
}

const profileSelectEl = document.getElementById("profileSelect");
const newProfileBtn = document.getElementById("newProfileBtn");
const renameProfileBtn = document.getElementById("renameProfileBtn");
const deleteProfileBtn = document.getElementById("deleteProfileBtn");

const renameContainer = document.getElementById("renameContainer");
const renameInput = document.getElementById("renameInput");
const renameSaveBtn = document.getElementById("renameSaveBtn");

const providerEl = document.getElementById("provider");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const testConnectionBtn = document.getElementById("testConnectionBtn");
const testStatusEl = document.getElementById("testStatus");
const undercoverToggle = document.getElementById("undercoverToggle");
const fallbackToggle = document.getElementById("fallbackToggle");
const autoAnswerToggle = document.getElementById("autoAnswerToggle");
const answerBoxToggle = document.getElementById("answerBoxToggle");
const panicStatus = document.getElementById("panicStatus");
const fallbackTitleEl = document.getElementById("fallbackTitle");
const fallbackDescriptionEl = document.getElementById("fallbackDescription");
const autoAnswerTitleEl = document.getElementById("autoAnswerTitle");
const autoAnswerDescriptionEl = document.getElementById("autoAnswerDescription");
const answerBoxTitleEl = document.getElementById("answerBoxTitle");
const answerBoxDescriptionEl = document.getElementById("answerBoxDescription");
const answerBoxUnderToggle = document.getElementById("answerBoxUnderToggle");
const modeTitleEl = document.getElementById("modeTitle");
const modeDescriptionEl = document.getElementById("modeDescription");
const modeNormalIconEl = document.getElementById("modeNormalIcon");
const modeIncognitoIconEl = document.getElementById("modeIncognitoIcon");
let undercoverMode = true;
let autoFallback = true;
let autoAnswer = false;
let answerBoxVisible = true;
let panicMode = false;

function updateDisplayModeUI() {
  undercoverToggle.setAttribute("aria-checked", String(undercoverMode));
  modeTitleEl.textContent = t(undercoverMode ? "modeUndercover" : "modeNormal");
  modeDescriptionEl.textContent = t(undercoverMode ? "modeUndercoverDesc" : "modeNormalDesc");
  undercoverToggle.title = modeTitleEl.textContent;
  modeNormalIconEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8.5C5.8 16.8 8.1 15 12 15s6.2 1.8 7 5.5H5Z"/></svg>';
  modeIncognitoIconEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 2.5 17.8 2.5 20 9.4 4 9.4 6.2 2.5ZM2 11.2c3.1-1.5 6.5-2.2 10-2.2s6.9.7 10 2.2H2ZM7 13.1a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm10 0a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2ZM9.9 15.7h4.2v1H9.9v-1Z"/></svg>';
  modeNormalIconEl.classList.toggle("active", !undercoverMode);
  modeIncognitoIconEl.classList.toggle("active", undercoverMode);
}

undercoverToggle.addEventListener("click", async () => {
  undercoverMode = !undercoverMode;
  updateDisplayModeUI();
  await chrome.storage.local.set({ undercoverMode });
});

function updateFallbackUI() {
  fallbackToggle.setAttribute("aria-checked", String(autoFallback));
  fallbackTitleEl.textContent = t(autoFallback ? "fallbackOn" : "fallbackOff");
  fallbackDescriptionEl.textContent = t(autoFallback ? "fallbackOnDesc" : "fallbackOffDesc");
}

fallbackToggle.addEventListener("click", async () => {
  autoFallback = !autoFallback;
  updateFallbackUI();
  await chrome.storage.local.set({ autoProvider: autoFallback });
});

function updateAutoAnswerUI() {
  autoAnswerToggle.setAttribute("aria-checked", String(autoAnswer));
  autoAnswerTitleEl.textContent = t(autoAnswer ? "autoAnswerOn" : "autoAnswerOff");
  autoAnswerDescriptionEl.textContent = t(autoAnswer ? "autoAnswerOnDesc" : "autoAnswerOffDesc");
  autoAnswerToggle.title = autoAnswerTitleEl.textContent;
}

autoAnswerToggle.addEventListener("click", async () => {
  autoAnswer = !autoAnswer;
  updateAutoAnswerUI();
  await chrome.storage.local.set({ autoAnswer });
});

function updateAnswerBoxUI() {
  answerBoxToggle.setAttribute("aria-checked", String(answerBoxVisible));
  answerBoxTitleEl.textContent = t(answerBoxVisible ? "answerBoxOn" : "answerBoxOff");
  answerBoxDescriptionEl.textContent = t(answerBoxVisible ? "answerBoxOnDesc" : "answerBoxOffDesc");
  answerBoxUnderToggle.hidden = !answerBoxVisible;
}

answerBoxToggle.addEventListener("click", async () => {
  answerBoxVisible = !answerBoxVisible;
  updateAnswerBoxUI();
  await chrome.storage.local.set({ answerBoxVisible });
});

function updatePanicUI() {
  panicStatus.setAttribute("aria-checked", String(panicMode));
  panicStatus.title = `${t("panicLabel")}: ${t(panicMode ? "panicOn" : "panicOff")}`;
  panicStatus.setAttribute("aria-label", panicStatus.title);
}

panicStatus.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({ type: "QSA_TOGGLE_PANIC" });
  if (result?.ok) {
    panicMode = result.panicMode === true;
    updatePanicUI();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.panicMode) {
    panicMode = changes.panicMode.newValue === true;
    updatePanicUI();
  }
});

const geminiHint = document.getElementById("geminiHint");
const ollamaHint = document.getElementById("ollamaHint");
const localOpenAIHint = document.getElementById("localOpenAIHint");
const endpointEl = document.getElementById("endpoint");
const localEngineEl = document.getElementById("localEngine");

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const settingsBackBtn = document.getElementById("settingsBackBtn");
const languageEl = document.getElementById("language");

let profiles = {};
let currentProfileId = "default";

function normalizeProfiles(value) {
  if (Array.isArray(value)) {
    return value.reduce((result, profile) => {
      if (profile && profile.id) result[profile.id] = profile;
      return result;
    }, {});
  }
  return value && typeof value === "object" ? value : {};
}

function updateHint() {
  geminiHint.style.display = providerEl.value === "gemini" ? "block" : "none";
  const isLocal = providerEl.value === "local";
  const isOllama = isLocal && localEngineEl.value === "ollama";
  ollamaHint.style.display = isOllama ? "block" : "none";
  localOpenAIHint.style.display = isLocal && !isOllama ? "block" : "none";
  localEngineEl.closest(".field-group").style.display = isLocal ? "block" : "none";
  endpointEl.closest(".field-group").style.display = isLocal && !isOllama ? "block" : "none";
  const keyOptional = isLocal;
  apiKeyEl.disabled = false;
  apiKeyEl.placeholder = keyOptional ? t("apiKeyPlaceholderNone") : t("apiKeyPlaceholder");
}

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.add("visible");
});

settingsBackBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("visible");
});

languageEl.addEventListener("change", async () => {
  currentLanguage = languageEl.value;
  applyTranslations();
  updateDisplayModeUI();
  updateFallbackUI();
  updateAutoAnswerUI();
  await chrome.storage.local.set({ language: currentLanguage });
});

providerEl.addEventListener("change", () => {
  loadProviderFields();
  updateHint();
  saveCurrentProfileInMemory();
  saveToStorageQuiet();
});

localEngineEl.addEventListener("change", () => {
  loadProviderFields();
  updateHint();
  saveCurrentProfileInMemory();
  saveToStorageQuiet();
});

modelEl.addEventListener("input", () => {
  saveCurrentProfileInMemory();
  saveToStorageQuiet();
});

apiKeyEl.addEventListener("input", () => {
  saveCurrentProfileInMemory();
  saveToStorageQuiet();
});

endpointEl.addEventListener("input", () => {
  saveCurrentProfileInMemory();
  saveToStorageQuiet();
});

async function load() {
  const data = await chrome.storage.local.get(["profiles", "activeProfileId", "provider", "apiKey", "model", "language", "undercoverMode", "autoProvider", "autoAnswer", "answerBoxVisible", "panicMode"]);

  currentLanguage = data.language || "it";
  undercoverMode = data.undercoverMode !== false;
  autoFallback = data.autoProvider !== false;
  autoAnswer = data.autoAnswer === true;
  answerBoxVisible = data.answerBoxVisible !== false;
  panicMode = data.panicMode === true;
  updateDisplayModeUI();
  updateFallbackUI();
  updateAutoAnswerUI();
  updateAnswerBoxUI();
  updatePanicUI();
  languageEl.value = currentLanguage;
  applyTranslations();

  profiles = normalizeProfiles(data.profiles);
  if (!Object.keys(profiles).length) {
    const migratedProvider = data.provider || "gemini";
    profiles = {
      default: {
        name: t("defaultProfileName"),
        provider: migratedProvider,
        apiKey: data.apiKey || "",
        model: data.model || "",
        apiKeys: { [migratedProvider]: data.apiKey || "" },
        models: { [migratedProvider]: data.model || "" },
        endpoints: {}
      }
    };
    currentProfileId = "default";
  } else {
    currentProfileId = data.activeProfileId && profiles[data.activeProfileId]
      ? data.activeProfileId
      : Object.keys(profiles)[0] || "default";
    Object.values(profiles).forEach((prof) => {
      if (!prof.apiKeys) prof.apiKeys = prof.provider ? { [prof.provider]: prof.apiKey || "" } : {};
      if (!prof.models) prof.models = prof.provider ? { [prof.provider]: prof.model || "" } : {};
      if (!prof.endpoints) prof.endpoints = {};
    });
  }

  renderProfileSelect();
  loadCurrentProfileData();
}

function renderProfileSelect() {
  profileSelectEl.innerHTML = "";
  Object.keys(profiles).forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = profiles[id].name;
    if (id === currentProfileId) opt.selected = true;
    profileSelectEl.appendChild(opt);
  });
}

function loadCurrentProfileData() {
  const prof = profiles[currentProfileId] || {};
  const legacyLocal = prof.provider === "ollama" || prof.provider === "local-openai";
  providerEl.value = legacyLocal ? "local" : (prof.provider || "gemini");
  localEngineEl.value = prof.localEngine || (prof.provider === "local-openai" ? "openai-compatible" : "ollama");
  if (legacyLocal) {
    prof.provider = "local";
    prof.localEngine = localEngineEl.value;
  }
  loadProviderFields();
  updateHint();
  renameContainer.classList.remove("visible");
  testStatusEl.textContent = "";
}

profileSelectEl.addEventListener("change", async () => {
  currentProfileId = profileSelectEl.value;
  loadCurrentProfileData();
  await saveToStorage();
  showStatus(t("statusProfileUpdated"));
});

newProfileBtn.addEventListener("click", async () => {
  const newId = "prof_" + Date.now();
  const newName = t("newProfileNamePrefix") + " " + (Object.keys(profiles).length + 1);

  profiles[newId] = {
    name: newName,
    provider: "gemini",
    localEngine: "ollama",
    apiKey: "",
    model: "",
    apiKeys: {},
    models: {},
    endpoints: {}
  };

  currentProfileId = newId;
  renderProfileSelect();
  loadCurrentProfileData();
  await saveToStorage();

  renameContainer.classList.add("visible");
  renameInput.value = newName;
  renameInput.focus();
  renameInput.select();
  showStatus(t("statusProfileCreated"));
});

renameProfileBtn.addEventListener("click", () => {
  const currentProf = profiles[currentProfileId];
  if (!currentProf) return;

  if (renameContainer.classList.contains("visible")) {
    renameContainer.classList.remove("visible");
  } else {
    renameContainer.classList.add("visible");
    renameInput.value = currentProf.name;
    renameInput.focus();
    renameInput.select();
  }
});

renameSaveBtn.addEventListener("click", async () => {
  const newName = renameInput.value.trim();
  if (!newName) return;

  profiles[currentProfileId].name = newName;
  renderProfileSelect();
  renameContainer.classList.remove("visible");
  await saveToStorage();
  showStatus(t("statusProfileRenamed"));
});

renameInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    renameSaveBtn.click();
  } else if (e.key === "Escape") {
    renameContainer.classList.remove("visible");
  }
});

deleteProfileBtn.addEventListener("click", async () => {
  if (Object.keys(profiles).length <= 1) {
    showStatus(t("statusMinProfiles"), true);
    return;
  }

  const profName = profiles[currentProfileId].name;
  delete profiles[currentProfileId];
  currentProfileId = Object.keys(profiles)[0];
  renderProfileSelect();
  loadCurrentProfileData();
  await saveToStorage();
  showStatus(t("statusProfileDeleted", profName));
});

function loadProviderFields() {
  const prof = profiles[currentProfileId];
  if (!prof) return;
  const provider = providerEl.value;
  const apiKeys = prof.apiKeys || {};
  const models = prof.models || {};
  const legacyApiKey = prof.provider === provider ? (prof.apiKey || "") : "";
  const legacyModel = prof.provider === provider ? (prof.model || "") : "";
  apiKeyEl.value = apiKeys[provider] ?? legacyApiKey;
  modelEl.value = models[provider] ?? legacyModel;
  endpointEl.value = (prof.endpoints || {})[provider] || "";
}

function saveCurrentProfileInMemory() {
  if (!profiles[currentProfileId]) return;
  const prof = profiles[currentProfileId];
  const provider = providerEl.value;
  const apiKey = apiKeyEl.value.trim();
  const model = modelEl.value.trim();

  prof.provider = provider;
  prof.localEngine = localEngineEl.value;
  prof.apiKey = apiKey;
  prof.model = model;
  if (!prof.apiKeys) prof.apiKeys = {};
  if (!prof.models) prof.models = {};
  if (!prof.endpoints) prof.endpoints = {};
  prof.apiKeys[provider] = apiKey;
  prof.models[provider] = model;
  prof.endpoints[provider] = endpointEl.value.trim();
}

async function saveToStorage() {
  saveCurrentProfileInMemory();
  const active = profiles[currentProfileId];

  await chrome.storage.local.set({
    profiles: profiles,
    activeProfileId: currentProfileId,
    provider: active.provider,
    apiKey: active.apiKey,
    model: active.model,
    apiKeys: active.apiKeys,
    models: active.models,
    endpoints: active.endpoints,
    language: currentLanguage,
    autoProvider: autoFallback
  });
}

async function saveToStorageQuiet() {
  saveCurrentProfileInMemory();
  const active = profiles[currentProfileId];
  await chrome.storage.local.set({
    profiles: profiles,
    activeProfileId: currentProfileId,
    provider: active.provider,
    apiKey: active.apiKey,
    model: active.model,
    apiKeys: active.apiKeys,
    models: active.models,
    endpoints: active.endpoints,
    language: currentLanguage,
    autoProvider: autoFallback
  });
}

function showStatus(msg, isError = false) {
  statusEl.style.color = isError ? "var(--danger)" : "var(--success)";
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) {
      statusEl.textContent = "";
    }
  }, 2500);
}

saveBtn.addEventListener("click", async () => {
  await saveToStorage();
  showStatus(t("statusSettingsSaved"));
});

function showTestStatus(msg, isError = false) {
  testStatusEl.style.color = isError ? "var(--danger)" : "var(--success)";
  testStatusEl.textContent = msg;
}

async function testConnection(provider, apiKey, model) {
  if (provider === "local" && localEngineEl.value === "ollama") {
    let res;
    try {
      res = await fetch("http://localhost:11434/api/tags");
    } catch (e) {
      throw new Error(t("testOllamaUnreachable"));
    }

    if (!res.ok) {
      throw new Error(t("testOllamaError", res.status));
    }
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name).join(", ");
    return names ? t("testOllamaOkWithModels", names) : t("testOllamaOkNoModels");
  }

  if (provider === "local" && localEngineEl.value === "openai-compatible") {
    const endpoint = endpointEl.value.trim().replace(/\/+$/, "") || "http://localhost:1234/v1";
    let res;
    try {
      res = await fetch(`${endpoint}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      });
    } catch (e) {
      throw new Error(`Server AI locale non raggiungibile: ${endpoint}`);
    }
    if (!res.ok) {
      throw new Error(t("testLocalCompatibleError", res.status));
    }
    return t("testLocalCompatibleOk");
  }

  if (!apiKey) {
    throw new Error(t("testNeedApiKey"));
  }

  if (provider === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) {
      throw new Error(t("testGeminiError", res.status));
    }
    return t("testGeminiOk");
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      throw new Error(t("testOpenaiError", res.status));
    }
    return t("testOpenaiOk");
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      }
    });
    if (!res.ok) {
      throw new Error(t("testAnthropicError", res.status));
    }
    return t("testAnthropicOk");
  }

  throw new Error(t("testUnknownProvider"));
}

testConnectionBtn.addEventListener("click", async () => {
  const provider = providerEl.value;
  const apiKey = apiKeyEl.value.trim();
  const model = modelEl.value.trim();

  testConnectionBtn.disabled = true;
  showTestStatus(t("testInProgress"));

  try {
    const result = await testConnection(provider, apiKey, model);
    showTestStatus(result, false);
  } catch (err) {
    showTestStatus(err.message || String(err), true);
  } finally {
    testConnectionBtn.disabled = false;
  }
});

load();

const workspaceBtn = document.getElementById('workspaceBtn');
if (workspaceBtn) workspaceBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (tab?.id) await chrome.sidePanel?.open({windowId:tab.windowId}).catch(()=>{});
  window.close();
});