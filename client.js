const socket = io();

// Universal Modal Show/Hide Helpers (fixes CSS opacity & pointer-events issue)
function showModal(el) {
    if (!el) return;
    el.style.display = 'flex';
    el.classList.add('show');
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
}

function hideModal(el) {
    if (!el) return;
    el.classList.remove('show');
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    setTimeout(() => {
        if (!el.classList.contains('show')) {
            el.style.display = 'none';
        }
    }, 300);
}

// UI Translations for Workers based on chosen country
const uiTranslations = {
    vi: {
        title: "Worker View - Live Multi-Language Translator",
        hideSettings: "Hide Settings",
        showSettings: "Show Settings",
        autoTts: "Voice (Auto-TTS)",
        allLanguages: "All Languages",
        singleLanguage: "Single Language",
        testAudio: "Test Audio",
        changeCountry: "Change Country",
        chooseCountry: "Choose Your Country",
        waitingOperator: "Waiting for operator's voice...",
        waitingMessages: "(waiting for incoming messages...)",
        adminSpeaking: "Admin is speaking — Live audio is playing on this device",
        audioBlocked: "⚠️ Audio is auto-blocked by browser. Please click anywhere on this screen to enable Auto-TTS.",
        connLost: "⚠️ Connection lost. Trying to reconnect to translation server..."
    },
    id: {
        title: "Tampilan Pekerja - Live Multi-Language Translator",
        hideSettings: "Sembunyikan Setelan",
        showSettings: "Tampilkan Setelan",
        autoTts: "Suara (Auto-TTS)",
        allLanguages: "Semua Bahasa",
        singleLanguage: "Satu Bahasa",
        testAudio: "Tes Suara",
        changeCountry: "Ubah Negara",
        chooseCountry: "Pilih Negara Anda",
        waitingOperator: "Menunggu suara operator...",
        waitingMessages: "(menunggu pesan masuk...)",
        adminSpeaking: "Operator sedang berbicara — Audio langsung diputar di perangkat ini",
        audioBlocked: "⚠️ Audio diblokir browser. Klik di mana saja pada layar ini untuk mengaktifkan Auto-TTS.",
        connLost: "⚠️ Koneksi terputus. Mencoba menghubungkan kembali ke server terjemahan..."
    },
    my: {
        title: "အလုပ်သမားအမြင် - Live Multi-Language Translator",
        hideSettings: "ဆက်တင်များ ဖျောက်ရန်",
        showSettings: "ဆက်တင်များ ပြသရန်",
        autoTts: "အသံထွက် (Auto-TTS)",
        allLanguages: "ဘာသာစကားအားလုံး",
        singleLanguage: "ဘာသာစကားတစ်ခုတည်း",
        testAudio: "အသံစမ်းသပ်ရန်",
        changeCountry: "နိုင်ငံပြောင်းရန်",
        chooseCountry: "သင့်နိုင်ငံကို ရွေးချယ်ပါ",
        waitingOperator: "အော်ပရေတာ၏ အသံကို စောင့်ဆိုင်းနေပါသည်...",
        waitingMessages: "(ဝင်လာသော မက်ဆေ့ခ်ျများကို စောင့်ဆိုင်းနေပါသည်...)",
        adminSpeaking: "အော်ပရေတာ စကားပြောနေပါသည် — တိုက်ရိုက်အသံ ဖွင့်ထားပါသည်",
        audioBlocked: "⚠️ အသံကို ဘရောက်ဇာမှ ပိတ်ထားသည်။ Auto-TTS ဖွင့်ရန် မျက်နှာပြင်ပေါ်တွင် နှိပ်ပါ။",
        connLost: "⚠️ ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသဖြင့် ဆာဗာသို့ ပြန်လည်ချိတ်ဆက်ရန် ကြိုးစားနေပါသည်..."
    },
    tl: {
        title: "Worker View - Live Multi-Language Translator",
        hideSettings: "Itago ang Setelan",
        showSettings: "Ipakita ang Setelan",
        autoTts: "Boses (Auto-TTS)",
        allLanguages: "Lahat ng Wika",
        singleLanguage: "Isang Wika",
        testAudio: "Subukan ang Tunog",
        changeCountry: "Baguhin ang Bansa",
        chooseCountry: "Piliin ang Iyong Bansa",
        waitingOperator: "Naghihintay ng boses ng operator...",
        waitingMessages: "(naghihintay ng mga bagong mensahe...)",
        adminSpeaking: "Nagsasalita ang operator — Live na audio ay tumutugtog sa device na ito",
        audioBlocked: "⚠️ Naka-block ang audio ng browser. I-click kahit saan para paganahin ang Auto-TTS.",
        connLost: "⚠️ Nawalan ng koneksyon. Sinusubukang kumonekta muli sa server..."
    },
    en: {
        title: "Worker View - Live Multi-Language Translator",
        hideSettings: "Hide Settings",
        showSettings: "Show Settings",
        autoTts: "Voice (Auto-TTS)",
        allLanguages: "All Languages",
        singleLanguage: "Single Language",
        testAudio: "Test Audio",
        changeCountry: "Change Language",
        chooseCountry: "Choose Your Language",
        waitingOperator: "Waiting for operator's voice...",
        waitingMessages: "(waiting for incoming messages...)",
        adminSpeaking: "Admin is speaking — Live audio is playing on this device",
        audioBlocked: "⚠️ Audio is blocked by browser. Click anywhere to enable Auto-TTS.",
        connLost: "⚠️ Connection lost. Trying to reconnect to the translation server..."
    },
    ja: {
        title: "ワーカービュー - ライブ多言語翻訳",
        hideSettings: "設定を非表示",
        showSettings: "設定を表示",
        autoTts: "音声 (自動読み上げ)",
        allLanguages: "全言語",
        singleLanguage: "一言語",
        testAudio: "音声テスト",
        changeCountry: "言語変更",
        chooseCountry: "言語を選択してください",
        waitingOperator: "オペレーターの音声を待っています...",
        waitingMessages: "(メッセージ待機中...)",
        adminSpeaking: "管理者が話しています — このデバイスでライブ音声を再生中",
        audioBlocked: "⚠️ ブラウザに音声がブロックされています。Auto-TTSを有効にするには画面をクリックしてください。",
        connLost: "⚠️ 接続が切断されました。翻訳サーバーへの再接続を試みています..."
    }
};

// State Management
const state = {
    roomName: null,
    selectedLang: 'vi',
    fontSize: 6.0, // in vw
    viewMode: 'single', // 'single' or 'grid'
    autoTTS: false,
    soundAlert: true, // Always default to ON as requested
    lastTranslations: { vi: '', id: '', my: '', tl: '', en: '', ja: '' },
    lastSourceText: '',   // The original source text from admin
    lastSourceLang: '',   // The language admin is speaking in
    translationHistory: [], // Persistent rolling list of finalized translations
    lastProcessedMsgId: null, // Unique ID of last processed finalized translation
    interimTranslation: null, // Holds currently active live interim translation segment
    isFinal: true,
    fadeTimer: null,
    autoResetTimer: null, // Auto-reset screen to placeholder after 45s silence
    activeUtterance: null, // Keep reference to prevent garbage collection
    ttsUnlocked: false, // Track if SpeechSynthesis is unlocked on mobile
    
    // Audio streaming state
    audioCtx: null,        // AudioContext for playing admin audio
    audioQueue: [],        // Queue of ArrayBuffers waiting to be decoded
    isPlayingAudio: false, // Whether audio is currently being decoded
    adminStreamMime: 'audio/webm;codecs=opus', // MIME type from admin
    
    languages: {
        vi: { name: 'Vietnam',      code: 'vi-VN',  key: 'vi' },
        id: { name: 'Indonesia',    code: 'id-ID',  key: 'id' },
        my: { name: 'Myanmar',      code: 'my-MM',  key: 'my' },
        tl: { name: 'Filipina',     code: 'fil-PH', key: 'tl' },
        en: { name: 'English',      code: 'en-US',  key: 'en' },
        ja: { name: 'Japanese',     code: 'ja-JP',  key: 'ja' }
    }
};

// UI Elements
const els = {
    displayContainer: document.getElementById('displayContainer'),
    langSelect: document.getElementById('clientLangSelect'),
    langSelectWrapper: document.getElementById('langSelectWrapper'),
    currentFlag: document.getElementById('currentFlag'),
    btnToggleMode: document.getElementById('btnToggleMode'),
    btnSizeDec: document.getElementById('btnSizeDec'),
    btnSizeInc: document.getElementById('btnSizeInc'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    chkAutoTTS: document.getElementById('chkAutoTTS'),
    audioStreamBanner: document.getElementById('audioStreamBanner'),
    audioStreamIndicator: document.getElementById('audioStreamIndicator'),
    networkWarningBanner: document.getElementById('networkWarningBanner'),
    btnToggleSettings: document.getElementById('btnToggleSettings'),
    clientSettingsPanel: document.getElementById('clientSettingsPanel'),
    btnTestSound: document.getElementById('btnTestSound'),
    btnChangeCountry: null, // Removed from UI
    
    // Dynamic elements
    giantText: null,
    gridContainer: null
};

// Update status indicator
function updateConnectionStatus(status) {
    els.statusDot.className = 'status-dot';
    if (status === 'connected') {
        els.statusDot.classList.add('active');
        els.statusText.innerText = 'Connected';
    } else {
        els.statusDot.classList.add('error');
        els.statusText.innerText = 'Disconnected';
    }
}

// Update flag SVG in header (only used in single mode)
function updateFlagIcon(langCode) {
    const template = document.getElementById(`flag-${langCode}`);
    if (template) {
        els.currentFlag.innerHTML = '';
        els.currentFlag.appendChild(template.content.cloneNode(true));
    }
}

// Apply dynamic UI translation strings based on worker country choice
function applyUILocalization(lang) {
    const t = uiTranslations[lang] || uiTranslations['en'];
    
    // 1. Document Title
    document.title = t.title;
    
    // 2. Buttons
    const btnToggleSettings = document.getElementById('btnToggleSettings');
    if (btnToggleSettings) {
        const isCollapsed = els.clientSettingsPanel ? els.clientSettingsPanel.classList.contains('collapsed') : true;
        btnToggleSettings.innerText = isCollapsed ? t.showSettings : t.hideSettings;
    }
    
    const toggleAutoTTS = document.getElementById('toggleAutoTTS');
    if (toggleAutoTTS && toggleAutoTTS.querySelector('span')) {
        toggleAutoTTS.querySelector('span').innerText = t.autoTts;
    }
    
    const lblToggleMode = document.getElementById('lblToggleMode');
    if (lblToggleMode) {
        lblToggleMode.innerText = state.viewMode === 'single' ? t.allLanguages : t.singleLanguage;
    }
    
    const btnTestSound = document.getElementById('btnTestSound');
    if (btnTestSound) {
        const svgHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        btnTestSound.innerHTML = `${svgHTML} ${t.testAudio}`;
    }
    
    const lblChangeCountry = document.getElementById('lblChangeCountry');
    if (lblChangeCountry) {
        lblChangeCountry.innerText = t.changeCountry;
    }
    
    // 3. Banners
    const audioWarningBanner = document.getElementById('audioWarningBanner');
    if (audioWarningBanner && audioWarningBanner.querySelector('span')) {
        audioWarningBanner.querySelector('span').innerText = t.audioBlocked;
    }
    const audioStreamBanner = document.getElementById('audioStreamBanner');
    if (audioStreamBanner && audioStreamBanner.querySelector('span:nth-child(2)')) {
        audioStreamBanner.querySelector('span:nth-child(2)').innerHTML = `🎙️ <strong>${t.adminSpeaking}</strong>`;
    }
    const networkWarningBanner = document.getElementById('networkWarningBanner');
    if (networkWarningBanner && networkWarningBanner.querySelector('span')) {
        networkWarningBanner.querySelector('span').innerText = t.connLost;
    }
}

// Rebuild the main content area based on the selected View Mode (Single / Split Grid)
function rebuildDisplayDOM() {
    els.displayContainer.innerHTML = '';
    const t = uiTranslations[state.selectedLang] || uiTranslations['vi'];
    
    if (state.viewMode === 'single') {
        els.langSelectWrapper.style.display = 'flex';
        
        const textEl = document.createElement('div');
        textEl.className = 'giant-text';
        textEl.id = 'giantText';
        textEl.innerHTML = `<span class="translation-placeholder">${t.waitingOperator} <span class="placeholder-sub">${t.waitingMessages}</span></span>`;
        
        els.displayContainer.appendChild(textEl);
        els.giantText = textEl;
    } else {
        els.langSelectWrapper.style.display = 'none';
        
        const gridEl = document.createElement('div');
        gridEl.className = 'grid-container';
        gridEl.id = 'gridContainer';
        
        const defaultLangs = [
            { key: 'vi', name: 'Vietnam',     tag: 'VI-VN', flag: 'flag-vi' },
            { key: 'id', name: 'Indonesia',   tag: 'ID-ID', flag: 'flag-id' },
            { key: 'my', name: 'Myanmar',     tag: 'MY-MM', flag: 'flag-my' },
            { key: 'tl', name: 'Philippines', tag: 'TL-PH', flag: 'flag-tl' },
            { key: 'en', name: 'English',     tag: 'EN-US', flag: 'flag-en' },
            { key: 'ja', name: 'Japanese',    tag: 'JA-JP', flag: 'flag-ja' }
        ];
        
        // Put the user's selected language first in grid view reordering
        const activeKey = state.selectedLang;
        const reorderedLangs = [
            defaultLangs.find(l => l.key === activeKey),
            ...defaultLangs.filter(l => l.key !== activeKey)
        ].filter(Boolean);
        
        reorderedLangs.forEach(l => {
            const item = document.createElement('div');
            item.className = 'grid-item';
            item.setAttribute('data-lang', l.key);
            
            const flagHTML = document.getElementById(l.flag).innerHTML;
            
            item.innerHTML = `
                <div class="grid-item-header">
                    <div class="grid-item-lang">
                        <div class="flag-icon-container">${flagHTML}</div>
                        <span>${l.name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button class="action-icon-btn btnSpeakGrid" data-lang="${l.key}" title="Listen to Voice (TTS)" style="background:none; border:none; padding:4px; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                        </button>
                        <div class="grid-item-tag">${l.tag}</div>
                    </div>
                </div>
                <div class="grid-item-text" id="gridText-${l.key}">
                    <span class="grid-item-placeholder">${t.waitingOperator} <span class="placeholder-sub">${t.waitingMessages}</span></span>
                </div>
            `;
            gridEl.appendChild(item);
        });
        
        els.displayContainer.appendChild(gridEl);
        els.gridContainer = gridEl;
    }
    
    // Make sure button label in settings is localized too
    const lblToggleMode = document.getElementById('lblToggleMode');
    if (lblToggleMode) {
        lblToggleMode.innerText = state.viewMode === 'single' ? t.allLanguages : t.singleLanguage;
    }
    
    applyFontSize();
    renderTranslation();
}

// Render the translation texts into the active DOM nodes
function renderTranslation() {
    const hasActiveText = state.translationHistory.length > 0 || !!state.interimTranslation || !!state.lastSourceText;
    
    if (state.viewMode === 'single') {
        if (!els.giantText) return;
        
        const finalizedLines = state.translationHistory.map(msg => {
            const isSrc = (state.selectedLang === msg.sourceLang);
            const activeText = isSrc ? msg.source : msg.translations[state.selectedLang];
            return activeText ? activeText.replace(/\*Masukkan API.*/, '').trim() : '';
        }).filter(Boolean);

        const hasInterim = !!state.interimTranslation;
        let interimText = '';
        if (hasInterim) {
            const isSrc = (state.selectedLang === state.interimTranslation.sourceLang);
            interimText = isSrc ? state.interimTranslation.source : state.interimTranslation.translations[state.selectedLang];
            interimText = interimText ? interimText.replace(/\*Masukkan API.*/, '').trim() : '';
        }

        const allLines = [...finalizedLines];
        if (hasInterim && interimText) {
            allLines.push(interimText);
        }

        const len = allLines.length;
        if (len > 0) {
            if (len >= 3) {
                // Split Layout Mode: Top half (Static Older Lines) + Bottom half (Active Running Lines)
                const olderLines = allLines.slice(0, len - 2);
                const runningLines = allLines.slice(len - 2);

                const topHTML = olderLines.map(line => `<div class="prompter-line level-1" style="font-size: 0.85em; opacity: 0.75; margin: 4px 0;">${line}</div>`).join('');
                const bottomHTML = `
                    <div class="prompter-line level-2" style="font-size: 0.9em; opacity: 0.9; margin: 4px 0;">${runningLines[0]}</div>
                    <div class="prompter-line active-line ${hasInterim ? 'interim-line' : ''}" style="font-weight: 700; margin: 4px 0;">${runningLines[1]}</div>
                `;

                els.giantText.innerHTML = `
                    <div class="split-card-wrapper" style="display: flex; flex-direction: column; width: 100%; height: calc(100vh - 160px); gap: 16px; box-sizing: border-box;">
                        <div class="split-card-top glass" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; border-radius: 20px; border: 1px solid var(--border-glass); background: rgba(255, 255, 255, 0.02); overflow: hidden;">
                            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 12px; opacity: 0.8;">Bagian Awal (Statis)</div>
                            <div style="width: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                ${topHTML}
                            </div>
                        </div>
                        <div class="split-card-bottom glass" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; border-radius: 20px; border: 2px solid var(--color-accent); background: rgba(188, 54, 86, 0.03); overflow: hidden;">
                            <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--color-accent); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-block; width: 6px; height: 6px; background: var(--color-accent); border-radius: 50%; animation: livePulse 1s ease-in-out infinite;"></span>
                                Berjalan (Running)
                            </div>
                            <div style="width: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                ${bottomHTML}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Normal rolling teleprompter mode (when text is short)
                let prompterHTML = '<div class="prompter-container">';
                allLines.forEach((line, idx) => {
                    const distFromEnd = len - 1 - idx;
                    let lineClass = 'prompter-line';
                    
                    if (distFromEnd === 0) {
                        lineClass += ' active-line';
                        if (hasInterim && idx === len - 1) {
                            lineClass += ' interim-line';
                        }
                    } else if (distFromEnd === 1) {
                        lineClass += ' level-1';
                    } else if (distFromEnd === 2) {
                        lineClass += ' level-2';
                    } else {
                        lineClass += ' level-out';
                    }
                    
                    prompterHTML += `<div class="${lineClass}">${line}</div>`;
                });
                prompterHTML += '</div>';
                
                els.giantText.innerHTML = prompterHTML;
            }
            els.giantText.classList.remove('loading');
        } else {
            showPlaceholderSingle();
        }
    } else {
        // Grid View Rendering
        const langKeys = ['vi', 'id', 'my', 'tl', 'en', 'ja'];
        langKeys.forEach(key => {
            const textNode = document.getElementById(`gridText-${key}`);
            if (!textNode) return;
            
            const finalizedLines = state.translationHistory.map(msg => {
                const isSrc = (key === msg.sourceLang);
                const activeText = isSrc ? msg.source : msg.translations[key];
                return activeText ? activeText.replace(/\*Masukkan API.*/, '').trim() : '';
            }).filter(Boolean);

            const hasInterim = !!state.interimTranslation;
            let interimText = '';
            if (hasInterim) {
                const isSrc = (key === state.interimTranslation.sourceLang);
                interimText = isSrc ? state.interimTranslation.source : state.interimTranslation.translations[key];
                interimText = interimText ? interimText.replace(/\*Masukkan API.*/, '').trim() : '';
            }

            const allLines = [...finalizedLines];
            if (hasInterim && interimText) {
                allLines.push(interimText);
            }

            const len = allLines.length;
            if (len > 0) {
                if (len >= 3) {
                    // Split mode for Grid Cell to prevent overflow/scrollbars
                    const olderLines = allLines.slice(0, len - 2);
                    const runningLines = allLines.slice(len - 2);
                    
                    textNode.innerHTML = `
                        <div class="split-grid-wrapper" style="display: flex; flex-direction: column; height: 100%; width: 100%; gap: 6px; box-sizing: border-box; overflow: hidden; padding: 4px;">
                            <div class="split-grid-top" style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 0.85em; opacity: 0.75; border-bottom: 1px dashed var(--border-glass); padding-bottom: 6px; overflow: hidden; word-break: break-word;">
                                ${olderLines.join(' / ')}
                            </div>
                            <div class="split-grid-bottom" style="flex: 1.2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; overflow: hidden;">
                                <div style="font-size: 0.9em; opacity: 0.9;">${runningLines[0]}</div>
                                <div style="font-weight: 700; color: var(--color-accent);">${runningLines[1]}</div>
                            </div>
                        </div>
                    `;
                } else {
                    let prompterHTML = '<div class="prompter-container">';
                    allLines.forEach((line, idx) => {
                        const distFromEnd = len - 1 - idx;
                        let lineClass = 'prompter-line';
                        
                        if (distFromEnd === 0) {
                            lineClass += ' active-line';
                            if (hasInterim && idx === len - 1) {
                                lineClass += ' interim-line';
                            }
                        } else if (distFromEnd === 1) {
                            lineClass += ' level-1';
                        } else if (distFromEnd === 2) {
                            lineClass += ' level-2';
                        } else {
                            lineClass += ' level-out';
                        }
                        
                        prompterHTML += `<div class="${lineClass}" style="font-size: 1.05em;">${line}</div>`;
                    });
                    prompterHTML += '</div>';
                    textNode.innerHTML = prompterHTML;
                }
            } else {
                const t = uiTranslations[state.selectedLang] || uiTranslations['vi'];
                textNode.innerHTML = `<span class="grid-item-placeholder">${t.waitingOperator} <span class="placeholder-sub">${t.waitingMessages}</span></span>`;
            }
        });
        
        if (els.gridContainer) {
            els.gridContainer.classList.remove('loading');
        }
    }

    // Auto-scroll display container(s) to bottom smoothly
    setTimeout(() => {
        if (state.viewMode === 'single') {
            if (els.displayContainer) {
                els.displayContainer.scrollTo({
                    top: els.displayContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        } else {
            const langKeys = ['vi', 'id', 'my', 'tl', 'en', 'ja'];
            langKeys.forEach(key => {
                const textNode = document.getElementById(`gridText-${key}`);
                if (textNode) {
                    textNode.scrollTo({
                        top: textNode.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }, 50);

    // Reset opacity & timers whenever new text arrives
    clearTimeout(state.fadeTimer);
    clearTimeout(state.autoResetTimer);
    resetOpacity();
    
    // Schedule soft fade-out and auto-reset to placeholder after 45s of silence
    if (hasActiveText) {
        if (!state.autoTTS) {
            state.fadeTimer = setTimeout(() => {
                applyFadeOut();
            }, 15000); // Stay for 15 seconds if TTS is off (plenty of reading time)
        }
        state.autoResetTimer = setTimeout(() => {
            resetToPlaceholder();
        }, 45000); // Auto-reset screen display to clean placeholder after 45s silence
    }
}

function showPlaceholderSingle() {
    const t = uiTranslations[state.selectedLang] || uiTranslations['vi'];
    els.giantText.innerHTML = `<span class="translation-placeholder">${t.waitingOperator} <span class="placeholder-sub">${t.waitingMessages}</span></span>`;
    els.giantText.classList.remove('loading');
}

// Apply visual fade-out by class addition
function applyFadeOut() {
    if (state.viewMode === 'single') {
        if (els.giantText) {
            els.giantText.classList.add('fade-out');
        }
    } else {
        if (els.gridContainer) {
            els.gridContainer.classList.add('fade-out');
        }
    }
}

// Reset opacity back to 100%
function resetOpacity() {
    if (els.giantText) {
        els.giantText.classList.remove('fade-out');
    }
    if (els.gridContainer) {
        els.gridContainer.classList.remove('fade-out');
    }
}

// Safely reset live screen display back to placeholder after 45s silence without wiping export history
function resetToPlaceholder() {
    state.interimTranslation = null;
    state.lastSourceText = '';
    state.lastTranslations = { vi: '', id: '', my: '', tl: '', en: '', ja: '' };
    resetOpacity();
    if (state.viewMode === 'single') {
        showPlaceholderSingle();
    } else {
        const langKeys = ['vi', 'id', 'my', 'tl', 'en', 'ja'];
        const t = uiTranslations[state.selectedLang] || uiTranslations['vi'];
        langKeys.forEach(key => {
            const textNode = document.getElementById(`gridText-${key}`);
            if (textNode) {
                textNode.innerHTML = `<span class="grid-item-placeholder">${t.waitingOperator} <span class="placeholder-sub">${t.waitingMessages}</span></span>`;
            }
        });
    }
}

// Apply font size adjustments
function applyFontSize() {
    localStorage.setItem('client_font_size', state.fontSize);
    
    if (state.viewMode === 'single') {
        if (els.giantText) {
            els.giantText.style.fontSize = `${state.fontSize}vw`;
        }
    } else {
        const gridTexts = document.querySelectorAll('.grid-item-text');
        gridTexts.forEach(el => {
            el.style.fontSize = `${state.fontSize * 0.46}vw`;
        });
    }
}

// Voice synthesis output (TTS)
function speakText(text, langCode) {
    if (!text || text.includes('Waiting for') || text.includes('Translating')) return;
    
    try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voices = window.speechSynthesis.getVoices();
        const searchLang = langCode.toLowerCase().replace('_', '-');
        const searchPrefix = searchLang.split('-')[0];
        
        // Find all candidates matching the language
        const candidates = voices.filter(v => {
            const vLang = v.lang.toLowerCase().replace('_', '-');
            const vPrefix = vLang.split('-')[0];
            
            // Match exact language or prefix
            if (vLang === searchLang || vPrefix === searchPrefix) return true;
            
            // Tagalog/Filipino alias match
            if ((searchPrefix === 'fil' || searchPrefix === 'tl') && (vPrefix === 'fil' || vPrefix === 'tl')) {
                return true;
            }
            return false;
        });
        
        let matchedVoice = null;
        if (candidates.length > 0) {
            // Score candidates to prioritize premium, siri, natural online neural voices
            candidates.forEach(v => {
                let score = 0;
                const name = v.name.toLowerCase();
                
                if (name.includes('neural')) score += 120;
                if (name.includes('online')) score += 110;
                if (name.includes('natural')) score += 100;
                if (name.includes('multilingual')) score += 95;
                if (name.includes('siri')) score += 90;
                if (name.includes('google')) score += 80;
                if (name.includes('premium')) score += 70;
                if (name.includes('enhanced')) score += 60;
                if (v.localService === false) score += 50; // Cloud neural voice preference
                
                // Prioritize exact lang code match over prefix-only match
                const vLang = v.lang.toLowerCase().replace('_', '-');
                if (vLang === searchLang) score += 20;
                
                v._score = score;
            });
            
            // Sort highest score first
            candidates.sort((a, b) => b._score - a._score);
            matchedVoice = candidates[0];
        }
        
        if (matchedVoice) {
            utterance.voice = matchedVoice;
            utterance.lang = matchedVoice.lang;
            console.log(`[TTS] Selected voice: ${matchedVoice.name} (Score: ${matchedVoice._score})`);
        } else {
            console.warn(`[TTS] No matching voice found for ${langCode}. Falling back to default.`);
            utterance.lang = 'en-US'; // safe default so it doesn't fail silently
        }
        
        // Optimize cadence/speech pattern for human feel
        utterance.rate = 0.95; // Slightly slower than 1.0 (robotic rush) for a natural human pace
        utterance.pitch = 1.0; // Clear human pitch
        
        // Reset any existing fade-out timer while TTS is reading
        clearTimeout(state.fadeTimer);
        resetOpacity();

        // Store in state to prevent garbage collection
        state.activeUtterance = utterance;
        
        const scheduleFadeAfterSpeech = () => {
            if (state.activeUtterance === utterance) {
                state.activeUtterance = null;
            }
            // Start the fade-out timer ONLY after the speech has finished reading
            clearTimeout(state.fadeTimer);
            clearTimeout(state.autoResetTimer);
            state.fadeTimer = setTimeout(() => {
                applyFadeOut();
            }, 5000);
            state.autoResetTimer = setTimeout(() => {
                resetToPlaceholder();
            }, 45000);
        };

        utterance.onend = scheduleFadeAfterSpeech;
        utterance.onerror = scheduleFadeAfterSpeech;
        
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("Error in speakText:", e);
        // Fallback: fade out after 10s if SpeechSynthesis fails to start
        clearTimeout(state.fadeTimer);
        state.fadeTimer = setTimeout(() => {
            applyFadeOut();
        }, 10000);
    }
}

// Synthesize a high-quality notification chime using Web Audio API (No files required)
function playNotificationChime() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        
        // Tone 1 (C6 note, clear high pitch)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, now);
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);
        
        // Tone 2 (E6 note, slightly delayed harmonic)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, now + 0.08);
        gain2.gain.setValueAtTime(0.06, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn('Audio context chime playback blocked or failed:', e);
    }
}

// Unlock speech synthesis on mobile/desktop browsers via user gesture
function unlockTTS() {
    if (!state.autoTTS || state.ttsUnlocked) return;
    try {
        window.speechSynthesis.cancel();
        const unlockUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(unlockUtterance);
        state.ttsUnlocked = true;
        console.log("SpeechSynthesis unlocked successfully via user gesture");
        
        // Remove gesture listeners once successfully unlocked
        document.removeEventListener('click', unlockTTS);
        document.removeEventListener('touchstart', unlockTTS);
    } catch (e) {
        console.error("Failed to unlock SpeechSynthesis:", e);
    }
    updateAudioBanner();
}

// ─── Admin Audio Streaming Playback Engine ──────────────────────────────────

// Get or create AudioContext (lazy init to avoid autoplay policy issues)
function getAudioContext() {
    if (!state.audioCtx || state.audioCtx.state === 'closed') {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume().catch(() => {});
    }
    return state.audioCtx;
}

// Add an ArrayBuffer chunk to the playback queue and start playing if idle
function enqueueAudioChunk(arrayBuffer) {
    state.audioQueue.push(arrayBuffer);
    if (!state.isPlayingAudio) {
        playNextChunk();
    }
}

// Decode and play the next chunk in the queue sequentially
function playNextChunk() {
    if (state.audioQueue.length === 0) {
        state.isPlayingAudio = false;
        return;
    }
    
    state.isPlayingAudio = true;
    const buffer = state.audioQueue.shift();
    
    try {
        const ctx = getAudioContext();
        ctx.decodeAudioData(buffer, (decoded) => {
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(ctx.destination);
            source.onended = () => { playNextChunk(); };
            source.start(0);
        }, (err) => {
            console.warn('[AUDIO CLIENT] Decode error, skipping chunk:', err);
            playNextChunk(); // skip corrupt chunk and continue
        });
    } catch (e) {
        console.warn('[AUDIO CLIENT] Error playing chunk:', e);
        state.isPlayingAudio = false;
    }
}

// Show/hide audio streaming UI indicators
function showAudioStreamingUI(show) {
    if (els.audioStreamBanner) {
        els.audioStreamBanner.style.display = show ? 'flex' : 'none';
    }
    if (els.audioStreamIndicator) {
        els.audioStreamIndicator.style.display = show ? 'flex' : 'none';
    }
}

// Initialize audio streaming socket listeners (called once)
function setupAudioStreamListeners() {
    // Admin started streaming
    socket.on('audio-stream-start', () => {
        console.log('[AUDIO CLIENT] Admin started audio streaming');
        // Initialize AudioContext on first stream event (needs user gesture first,
        // but we'll try lazy init here; gesture unlock happens on first click)
        getAudioContext();
        state.audioQueue = []; // Clear any stale queue
        state.isPlayingAudio = false;
        showAudioStreamingUI(true);
    });

    // Admin stopped streaming
    socket.on('audio-stream-stop', () => {
        console.log('[AUDIO CLIENT] Admin stopped audio streaming');
        showAudioStreamingUI(false);
        // Let current queue finish playing, don't forcefully stop
    });

    // Receive audio chunk from admin (via server broadcast)
    socket.on('audio-stream', (data) => {
        if (!data || !data.chunk) return;
        
        // data.chunk is received as an object (Buffer/ArrayBuffer from socket.io binary)
        let arrayBuffer;
        if (data.chunk instanceof ArrayBuffer) {
            arrayBuffer = data.chunk;
        } else if (data.chunk && data.chunk.buffer) {
            // Node.js Buffer comes as { type: 'Buffer', data: [...] } or Uint8Array
            arrayBuffer = data.chunk.buffer.slice(
                data.chunk.byteOffset,
                data.chunk.byteOffset + data.chunk.byteLength
            );
        } else if (Array.isArray(data.chunk)) {
            arrayBuffer = new Uint8Array(data.chunk).buffer;
        } else {
            console.warn('[AUDIO CLIENT] Unknown chunk format:', typeof data.chunk);
            return;
        }
        
        enqueueAudioChunk(arrayBuffer);
    });
}

// Unlock AudioContext on first user gesture (required by browser autoplay policy)
function unlockAudioContext() {
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
        state.audioCtx.resume().then(() => {
            console.log('[AUDIO CLIENT] AudioContext unlocked by user gesture');
        }).catch(() => {});
    }
}


function setupEventListeners() {
    // Socket events
    socket.on('connect', () => {
        updateConnectionStatus('connected');
        if (els.networkWarningBanner) els.networkWarningBanner.style.display = 'none';
        // Ask for active rooms list on connection
        socket.emit('get-active-rooms');
    });

    socket.on('disconnect', () => {
        updateConnectionStatus('disconnected');
        if (els.networkWarningBanner) els.networkWarningBanner.style.display = 'flex';
    });

    // Populate active rooms dropdown select & support Direct Link auto-fill
    socket.on('active-rooms-list', (activeRooms) => {
        const select = document.getElementById('joinRoomSelect');
        if (!select) return;
        
        // Preserve default option
        select.innerHTML = '<option value="" disabled selected>-- Pilih Lini --</option>';
        activeRooms.forEach(room => {
            select.innerHTML += `<option value="${room.name}">${room.name} (${room.hasSpeaker ? 'Aktif' : 'Menunggu Admin'})</option>`;
        });

        // 🔗 Check if accessed via Direct Link (?room=NAME&pin=PIN)
        const urlParams = new URLSearchParams(window.location.search);
        const urlRoom = urlParams.get('room');
        const urlPin = urlParams.get('pin');
        if (urlRoom && urlPin) {
            select.value = urlRoom;
            const pinInput = document.getElementById('joinRoomPin');
            if (pinInput) pinInput.value = urlPin;
            
            // Auto join room directly if not already joined
            if (!state.roomName && !state._autoJoined) {
                state._autoJoined = true;
                socket.emit('worker-room-join', { roomName: urlRoom, pin: urlPin });
            }
        }
    });

    // Worker successful room join handler
    socket.on('worker-join-success', (data) => {
        state.roomName = data.roomName;
        
        // Load settings room-specifically
        state.selectedLang = localStorage.getItem(`client_selected_lang_${state.roomName}`) || localStorage.getItem('client_selected_lang') || 'vi';
        state.fontSize = parseFloat(localStorage.getItem(`client_font_size_${state.roomName}`)) || parseFloat(localStorage.getItem('client_font_size')) || 6.0;
        state.viewMode = localStorage.getItem(`client_view_mode_${state.roomName}`) || localStorage.getItem('client_view_mode') || 'single';
        state.autoTTS = localStorage.getItem(`client_auto_tts_${state.roomName}`) === 'true';

        // Map and sync history from server
        state.translationHistory = data.history.map(item => ({
            msgId: item.msgId,
            source: item.source,
            sourceLang: item.sourceLang,
            translations: item.translations
        }));

        // Set inputs to match loaded settings
        els.langSelect.value = state.selectedLang;
        els.chkAutoTTS.checked = state.autoTTS;
        updateFlagIcon(state.selectedLang);
        applyUILocalization(state.selectedLang);
        applyFontSize();

        // Hide overlay modal
        document.getElementById('workerJoinModal').style.display = 'none';

        // Trigger UI rendering
        rebuildDisplayDOM();
        updateAudioBanner();
    });

    socket.on('worker-join-failed', (data) => {
        const errEl = document.getElementById('workerJoinError');
        errEl.innerText = data.message;
        errEl.style.display = 'block';
    });

    socket.on('history-cleared', () => {
        state.translationHistory = [];
        renderTranslation();
    });

    // Receive translation from Admin
    socket.on('translation-receive', (data) => {
        if (data.source === '' && Object.values(data.translations).every(t => t === '')) {
            return;
        }

        const isNewMsg = data.msgId && data.msgId !== state.lastProcessedMsgId;
        
        if (data.isFinal) {
            state.interimTranslation = null;
            
            if (isNewMsg) {
                state.lastProcessedMsgId = data.msgId;
                
                state.translationHistory.push({
                    msgId: data.msgId,
                    source: data.source,
                    sourceLang: data.sourceLang,
                    translations: data.translations
                });
                
                if (state.translationHistory.length > 5) {
                    state.translationHistory.shift();
                }
            }
        } else {
            state.interimTranslation = {
                msgId: data.msgId,
                source: data.source,
                sourceLang: data.sourceLang,
                translations: data.translations
            };
        }
        
        state.lastTranslations = data.translations;
        state.lastSourceText = data.source || '';
        state.lastSourceLang = data.sourceLang || '';
        state.isFinal = data.isFinal;
        
        const isSourceLang = (state.selectedLang === state.lastSourceLang);
        const hasTranslation = !!state.lastTranslations[state.selectedLang];
        if (!isSourceLang && !hasTranslation) {
            const firstKey = Object.keys(state.lastTranslations).find(k => state.languages[k] && k !== state.lastSourceLang);
            if (firstKey) {
                state.selectedLang = firstKey;
                if (state.roomName) {
                    localStorage.setItem(`client_selected_lang_${state.roomName}`, state.selectedLang);
                } else {
                    localStorage.setItem('client_selected_lang', state.selectedLang);
                }
                els.langSelect.value = state.selectedLang;
                updateFlagIcon(state.selectedLang);
            }
        }
        
        renderTranslation();

        if (state.isFinal && isNewMsg) {
            if (els.displayContainer) {
                els.displayContainer.classList.remove('flash-active');
                void els.displayContainer.offsetWidth;
                els.displayContainer.classList.add('flash-active');
            }
            if (state.soundAlert) {
                playNotificationChime();
            }
        }
        
        if (state.isFinal && state.autoTTS && isNewMsg) {
            const isSrc = (state.selectedLang === state.lastSourceLang);
            const activeText = isSrc ? state.lastSourceText : state.lastTranslations[state.selectedLang];
            const langCode = isSrc
                ? (state.languages[state.lastSourceLang]?.code || 'en-US')
                : (state.languages[state.selectedLang]?.code || 'vi-VN');
            speakText(activeText, langCode);
        }
    });

    // Worker join event handlers
    const joinSubmitBtn = document.getElementById('btnWorkerJoinSubmit');
    const pinInput = document.getElementById('joinRoomPin');
    const selectRoom = document.getElementById('joinRoomSelect');

    if (joinSubmitBtn) {
        joinSubmitBtn.addEventListener('click', () => {
            const roomName = selectRoom.value;
            const pin = pinInput.value.trim();
            const errEl = document.getElementById('workerJoinError');

            if (!roomName) {
                errEl.innerText = 'Pilih Lini Produksi terlebih dahulu.';
                errEl.style.display = 'block';
                return;
            }
            if (!pin || pin.length !== 4) {
                errEl.innerText = 'Masukkan 4 digit PIN keamanan.';
                errEl.style.display = 'block';
                return;
            }

            errEl.style.display = 'none';
            socket.emit('worker-room-join', { roomName, pin });
        });
    }

    if (pinInput) {
        pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') joinSubmitBtn.click();
        });
    }

    // 🚪 Intercept Worker Sign Out button with custom Yes/No modal
    const btnSignOut = document.getElementById('btnSignOut');
    const clientExitModal = document.getElementById('clientExitConfirmModal');
    const btnWorkerExitCancel = document.getElementById('btnWorkerExitCancel');
    const btnWorkerExitConfirm = document.getElementById('btnWorkerExitConfirm');

    if (btnSignOut && clientExitModal) {
        btnSignOut.addEventListener('click', (e) => {
            e.preventDefault();
            showModal(clientExitModal);
        });
    }
    if (btnWorkerExitCancel && clientExitModal) {
        btnWorkerExitCancel.addEventListener('click', () => {
            hideModal(clientExitModal);
        });
    }
    if (btnWorkerExitConfirm) {
        btnWorkerExitConfirm.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // ⚠️ Admin Left Notification Handler
    socket.on('admin-left-room', (data) => {
        const adminLeftModal = document.getElementById('adminLeftModal');
        if (adminLeftModal) {
            showModal(adminLeftModal);
        }
    });

    const btnAdminLeftDismiss = document.getElementById('btnAdminLeftDismiss');
    if (btnAdminLeftDismiss) {
        btnAdminLeftDismiss.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // ⏳ Worker Waiting for Admin Session Start Handler
    socket.on('worker-waiting-for-admin', (data) => {
        const waitingModal = document.getElementById('waitingForAdminModal');
        const waitingRoomText = document.getElementById('waitingRoomNameText');
        const workerJoinModal = document.getElementById('workerJoinModal');

        if (waitingRoomText) waitingRoomText.innerText = data.roomName;
        if (workerJoinModal) hideModal(workerJoinModal);
        if (waitingModal) showModal(waitingModal);
    });

    socket.on('session-started', (data) => {
        const waitingModal = document.getElementById('waitingForAdminModal');
        const workerJoinModal = document.getElementById('workerJoinModal');
        if (waitingModal) hideModal(waitingModal);
        if (workerJoinModal) hideModal(workerJoinModal);

        state.roomName = data.roomName;
        if (data.history) {
            state.translationHistory = data.history.map(item => ({
                id: item.msgId,
                timestamp: item.timestamp,
                source: item.source,
                translations: item.translations
            }));
            rebuildDisplayDOM();
        }
    });

    const btnCancelWaiting = document.getElementById('btnCancelWaiting');
    if (btnCancelWaiting) {
        btnCancelWaiting.addEventListener('click', () => {
            const waitingModal = document.getElementById('waitingForAdminModal');
            const workerJoinModal = document.getElementById('workerJoinModal');
            if (waitingModal) hideModal(waitingModal);
            if (workerJoinModal) showModal(workerJoinModal);
        });
    }

    // 📥 Export History Button
    const clientExportBtn = document.getElementById('btnClientExportHistory');
    if (clientExportBtn) {
        clientExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportHistory();
        });
    }

    // Toggle Single vs Split Screen View Mode
    els.btnToggleMode.addEventListener('click', () => {
        state.viewMode = state.viewMode === 'single' ? 'grid' : 'single';
        if (state.roomName) {
            localStorage.setItem(`client_view_mode_${state.roomName}`, state.viewMode);
        } else {
            localStorage.setItem('client_view_mode', state.viewMode);
        }
        rebuildDisplayDOM();
    });

    // Language Dropdown change
    els.langSelect.addEventListener('change', (e) => {
        state.selectedLang = e.target.value;
        if (state.roomName) {
            localStorage.setItem(`client_selected_lang_${state.roomName}`, state.selectedLang);
        } else {
            localStorage.setItem('client_selected_lang', state.selectedLang);
        }
        updateFlagIcon(state.selectedLang);
        applyUILocalization(state.selectedLang);
        rebuildDisplayDOM();
    });

    // Font size controls
    els.btnSizeInc.addEventListener('click', () => {
        if (state.fontSize < 12.0) {
            state.fontSize += 0.5;
            applyFontSize();
        }
    });

    els.btnSizeDec.addEventListener('click', () => {
        if (state.fontSize > 2.0) {
            state.fontSize -= 0.5;
            applyFontSize();
        }
    });

    // Toggle Collapsible Settings Panel
    if (els.btnToggleSettings && els.clientSettingsPanel) {
        els.btnToggleSettings.addEventListener('click', () => {
            const isCollapsed = els.clientSettingsPanel.classList.toggle('collapsed');
            const t = uiTranslations[state.selectedLang] || uiTranslations['vi'];
            els.btnToggleSettings.innerText = isCollapsed ? t.showSettings : t.hideSettings;
            els.btnToggleSettings.classList.toggle('active', !isCollapsed);
        });
    }

    // Sound Test playback
    if (els.btnTestSound) {
        els.btnTestSound.addEventListener('click', () => {
            const testPhrases = {
                vi: "Kiểm tra âm thanh thành công",
                id: "Tes suara berhasil",
                my: "အသံစမ်းသပ်မှု အောင်မြင်သည်",
                tl: "Matagumpay ang pagsubok ng tunog",
                en: "Audio test successful",
                ja: "音声テストに成功しました"
            };
            const phrase = testPhrases[state.selectedLang] || "Audio test successful";
            const langCode = state.languages[state.selectedLang]?.code || 'en-US';
            speakText(phrase, langCode);
        });
    }

    // Change Country Trigger (Redirects back to index.html to pick a country)
    if (els.btnChangeCountry) {
        els.btnChangeCountry.addEventListener('click', () => {
            window.location.href = 'index.html?change=true';
        });
    }

    // Grid manual voice speak click delegation
    els.displayContainer.addEventListener('click', (e) => {
        const speakBtn = e.target.closest('.btnSpeakGrid');
        if (speakBtn) {
            e.stopPropagation();
            const lang = speakBtn.getAttribute('data-lang');
            const activeText = state.lastTranslations[lang];
            const langCode = state.languages[lang] ? state.languages[lang].code : 'vi-VN';
            if (activeText && activeText.trim()) {
                speakText(activeText, langCode);
            } else {
                const noMsgPhrases = {
                    vi: "Chưa có tin nhắn",
                    id: "Belum ada pesan",
                    my: "မက်ဆေ့ခ်ျမရှိသေးပါ",
                    tl: "Wala pang mensahe"
                };
                speakText(noMsgPhrases[lang] || "No message", langCode);
            }
        }
    });

    // Auto-TTS Switch
    els.chkAutoTTS.addEventListener('change', (e) => {
        state.autoTTS = e.target.checked;
        if (state.roomName) {
            localStorage.setItem(`client_auto_tts_${state.roomName}`, state.autoTTS);
        } else {
            localStorage.setItem('client_auto_tts', state.autoTTS);
        }
        if (!state.autoTTS) {
            window.speechSynthesis.cancel();
            state.ttsUnlocked = false;
        } else {
            state.ttsUnlocked = false;
            document.addEventListener('click', unlockTTS);
            document.addEventListener('touchstart', unlockTTS);
            unlockTTS();
        }
        updateAudioBanner();
    });

    // Listen for first user gesture to unlock TTS
    document.addEventListener('click', unlockTTS);
    document.addEventListener('touchstart', unlockTTS);
}

// Export History to plain text
function exportHistory() {
    if (state.translationHistory.length === 0) {
        alert('Belum ada riwayat untuk diunduh.');
        return;
    }
    
    let textContent = `=== LIVE TRANSLATOR TRANSCRIPTION HISTORY ===\n`;
    textContent += `Lini Produksi: ${state.roomName || 'Umum'}\n`;
    textContent += `Waktu Unduh: ${new Date().toLocaleString()}\n\n`;
    
    state.translationHistory.forEach((item, index) => {
        textContent += `[No. ${index + 1}] Time: ${item.timestamp || new Date().toLocaleTimeString()}\n`;
        textContent += `Source Text: ${item.source}\n`;
        textContent += `Vietnam: ${item.translations.vi || ''}\n`;
        textContent += `Indonesia: ${item.translations.id || ''}\n`;
        textContent += `Myanmar: ${item.translations.my || ''}\n`;
        textContent += `Philippines: ${item.translations.tl || ''}\n`;
        textContent += `English: ${item.translations.en || ''}\n`;
        textContent += `Japanese: ${item.translations.ja || ''}\n`;
        textContent += `-----------------------------------------------\n\n`;
    });
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riwayat_terjemahan_${state.roomName || 'lini'}_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
}

// Apply font size adjustments
function applyFontSize() {
    if (state.roomName) {
        localStorage.setItem(`client_font_size_${state.roomName}`, state.fontSize);
    } else {
        localStorage.setItem('client_font_size', state.fontSize);
    }
    
    if (state.viewMode === 'single') {
        if (els.giantText) {
            els.giantText.style.fontSize = `${state.fontSize}vw`;
        }
    } else {
        const gridTexts = document.querySelectorAll('.grid-item-text');
        gridTexts.forEach(el => {
            el.style.fontSize = `${state.fontSize * 0.46}vw`;
        });
    }
}

// Check and show/hide the browser audio block warning banner
function updateAudioBanner() {
    const banner = document.getElementById('audioWarningBanner');
    if (!banner) return;
    if (state.autoTTS && !state.ttsUnlocked) {
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

// High-Precision 60 FPS VSYNC Prompter Auto-Scroller Engine (Ultra-Smooth Slow Sliding Downward)
let prompterAnimationFrameId = null;
let lastPrompterTimestamp = 0;
let prompterSubpixelAccumulator = 0;

function stepContinuousPrompterScroll(timestamp) {
    if (!lastPrompterTimestamp) lastPrompterTimestamp = timestamp;
    const deltaSeconds = Math.min((timestamp - lastPrompterTimestamp) / 1000, 0.1);
    lastPrompterTimestamp = timestamp;

    if (state.viewMode === 'single' && els.displayContainer) {
        const el = els.displayContainer;
        const maxScroll = el.scrollHeight - el.clientHeight;

        if (maxScroll > 2) {
            // Ultra-smooth, gentle sliding speed (approx 35 pixels per second)
            const pxPerSecond = 35;
            prompterSubpixelAccumulator += pxPerSecond * deltaSeconds;

            if (prompterSubpixelAccumulator >= 1) {
                const movePx = Math.floor(prompterSubpixelAccumulator);
                prompterSubpixelAccumulator -= movePx;

                if (el.scrollTop < maxScroll) {
                    el.scrollTop += movePx;
                }
            }
        } else {
            prompterSubpixelAccumulator = 0;
        }
    }

    prompterAnimationFrameId = requestAnimationFrame(stepContinuousPrompterScroll);
}

function startContinuousPrompterScroll() {
    if (prompterAnimationFrameId) cancelAnimationFrame(prompterAnimationFrameId);
    lastPrompterTimestamp = 0;
    prompterSubpixelAccumulator = 0;
    prompterAnimationFrameId = requestAnimationFrame(stepContinuousPrompterScroll);
}

// Initialization
function init() {
    // Show overlay room join modal initially, fetch active lines list
    socket.emit('get-active-rooms');

    setupEventListeners();
    setupAudioStreamListeners(); // Start listening for admin audio stream
    startContinuousPrompterScroll(); // Start 60 FPS VSYNC smooth sliding engine
    
    // Unlock both TTS and AudioContext on first user gesture
    const unlockAll = () => { unlockTTS(); unlockAudioContext(); };
    document.addEventListener('click', unlockAll, { once: false });
    document.addEventListener('touchstart', unlockAll, { once: false });
}

window.addEventListener('DOMContentLoaded', init);
