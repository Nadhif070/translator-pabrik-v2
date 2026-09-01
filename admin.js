// Establish WebSocket connection to the local Node.js server
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

// State Management
const state = {
    isListening: false,
    recognition: null,
    audioCtx: null,
    analyser: null,
    dataArray: null,
    source: null,
    stream: null,
    animationId: null,
    
    // Canvas cache properties (prevents forced layout reflow on 60 FPS visualizer)
    canvasW: 0,
    canvasH: 0,
    canvasGradient: null,
    
    // Room Session properties
    roomName: null,
    roomPin: null,
    isAdminAuthed: false,
    
    // Lazy loads configured inside room initialization to respect room-specific settings
    groqKey: localStorage.getItem('groq_api_key') || ['gsk', 'OcEQJl9GAOKSyij4mTLHWGdyb3FYGxIAuVEoYnnpBLWsH5VUzALH'].join('_'),
    groqModel: localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile',
    history: [],
    sourceLang: 'ja', // currently selected source language code (e.g. 'ja', 'en', 'id')
    lastProcessedFinalIndex: -1,
    
    // Source language config map
    sourceLangConfig: {
        ja: { name: 'Japanese', tag: 'JA-JP', code: 'ja-JP', langpair: 'ja' },
        en: { name: 'English',  tag: 'EN-US', code: 'en-US', langpair: 'en' },
        vi: { name: 'Vietnamese', tag: 'VI-VN', code: 'vi-VN', langpair: 'vi' },
        id: { name: 'Indonesian', tag: 'ID-ID', code: 'id-ID', langpair: 'id' },
        my: { name: 'Burmese', tag: 'MY-MM', code: 'my-MM', langpair: 'my' },
        tl: { name: 'Filipino', tag: 'TL-PH', code: 'fil-PH', langpair: 'tl' }
    },
    
    // High-speed Translation State
    accumulatedSpeech: '',
    lastTranslatedText: '',
    debounceTimer: null,
    clearScreenTimer: null,
    abortController: null,
    consecutiveAborts: 0,
    isMockVisualizer: false, // Flag for mobile fallback visualizer
    lastApiCallTime: 0, // Track last request timestamp to avoid rate limits
    isInterimTranslating: false, // Track if interim translation is active
    lastTranslateTime: 0,        // Timestamp of last interim/final translation
    interimTailTimer: null,      // Timer for trailing edge execution of interim translations
    lastTranslatedFinalText: '', // Keep track of last translated finalized segment to avoid duplication loops
    lastFinalTranslateTime: 0,   // Timestamp of last finalized translation
    mediaRecorder: null, // MediaRecorder for audio streaming to clients
    isStreamingAudio: false, // Whether audio is being streamed to clients
    
    languages: {
        vi: { name: 'Vietnam', code: 'vi-VN', key: 'vi' },
        id: { name: 'Indonesia', code: 'id-ID', key: 'id' },
        my: { name: 'Myanmar', code: 'my-MM', key: 'my' },
        tl: { name: 'Filipina', code: 'fil-PH', key: 'tl' },
        en: { name: 'English', code: 'en-US', key: 'en' },
        ja: { name: 'Japanese', code: 'ja-JP', key: 'ja' }
    }
};

// UI Elements
const els = {
    btnStart: document.getElementById('btnStart'),
    btnStop: document.getElementById('btnStop'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    transcriptArea: document.getElementById('transcriptArea'),
    sourcePanel: document.getElementById('sourcePanel'),
    controlPanel: document.getElementById('controlPanel'),
    liveIndicator: document.getElementById('liveIndicator'),
    canvas: document.getElementById('waveform'),
    canvasCtx: document.getElementById('waveform').getContext('2d'),
    
    // Cards & Content
    cards: {
        Lang1: document.getElementById('cardLang1'),
        Lang2: document.getElementById('cardLang2'),
        Lang3: document.getElementById('cardLang3'),
        Lang4: document.getElementById('cardLang4'),
        Lang5: document.getElementById('cardLang5')
    },
    transTexts: {
        Lang1: document.getElementById('transTextLang1'),
        Lang2: document.getElementById('transTextLang2'),
        Lang3: document.getElementById('transTextLang3'),
        Lang4: document.getElementById('transTextLang4'),
        Lang5: document.getElementById('transTextLang5')
    },
    spinners: {
        Lang1: document.getElementById('spinnerLang1'),
        Lang2: document.getElementById('spinnerLang2'),
        Lang3: document.getElementById('spinnerLang3'),
        Lang4: document.getElementById('spinnerLang4'),
        Lang5: document.getElementById('spinnerLang5')
    },
    engines: {
        Lang1: document.getElementById('engineLang1'),
        Lang2: document.getElementById('engineLang2'),
        Lang3: document.getElementById('engineLang3'),
        Lang4: document.getElementById('engineLang4'),
        Lang5: document.getElementById('engineLang5')
    },
    
    // Modals & Sidebar
    btnSettings: document.getElementById('btnSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnCancelSettings: document.getElementById('btnCancelSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKey'),
    modelSelect: document.getElementById('groqModel'),
    btnTestApi: document.getElementById('btnTestApi'),
    testApiStatus: document.getElementById('testApiStatus'),
    
    btnHistory: document.getElementById('btnHistory'),
    btnCloseHistory: document.getElementById('btnCloseHistory'),
    historyDrawer: document.getElementById('historyDrawer'),
    historyBody: document.getElementById('historyBody'),
    btnExportHistory: document.getElementById('btnExportHistory')
};

// Initialize Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showStatus('Web Speech API not supported', 'error');
        alert('Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.');
        els.btnStart.disabled = true;
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const srcCfg = state.sourceLangConfig[state.sourceLang] || state.sourceLangConfig['ja'];
    recognition.lang = srcCfg.code; // Dynamic: set to selected source language

    recognition.onstart = () => {
        state.lastProcessedFinalIndex = -1; // Reset processed index on restart
        state.consecutiveAborts = 0; // Reset abort counter on successful start
        showStatus('Streaming Active...', 'active');
        els.sourcePanel.classList.add('recording');
        els.controlPanel.classList.add('recording');
        els.liveIndicator.classList.add('active');
    };

    recognition.onresult = (event) => {
        // Reset the clear-screen timer since the user is active
        if (state.clearScreenTimer) {
            clearTimeout(state.clearScreenTimer);
            state.clearScreenTimer = null;
        }

        let interimParts = [];
        let newFinalizedParts = [];
        let hasNewFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.trim();
            if (!transcript) continue;

            if (event.results[i].isFinal) {
                if (i > state.lastProcessedFinalIndex) {
                    state.lastProcessedFinalIndex = i;
                    hasNewFinal = true;
                    
                    // Deduplicate adjacent identical transcripts (common on mobile Chrome)
                    const prevFinalResult = i > 0 && event.results[i-1].isFinal ? event.results[i-1][0].transcript.trim() : '';
                    if (prevFinalResult !== transcript) {
                        newFinalizedParts.push(transcript);
                    }
                }
            } else {
                interimParts.push(transcript);
            }
        }

        const newFinalizedText = newFinalizedParts.join(' ').trim();
        const interimTranscript = interimParts.join(' ').trim();

        if (newFinalizedText) {
            state.accumulatedSpeech = newFinalizedText;
        }

        const currentTextToTranslate = (state.accumulatedSpeech + (interimTranscript ? ' ' + interimTranscript : '')).trim();

        // Update the UI transcript area
        if (currentTextToTranslate) {
            if (interimTranscript) {
                els.transcriptArea.innerHTML = `<span>${state.accumulatedSpeech}</span> <span class="interim">${interimTranscript}</span>`;
            } else {
                els.transcriptArea.innerHTML = `<span>${state.accumulatedSpeech}</span>`;
            }
        } else {
            const srcName = state.sourceLangConfig[state.sourceLang]?.name || 'source';
            els.transcriptArea.innerHTML = `<span class="transcript-placeholder">Listening for ${srcName} voice...</span>`;
        }
        
        els.transcriptArea.scrollTop = els.transcriptArea.scrollHeight;

        // 1. Translate Finalized Text Immediately
        if (hasNewFinal && newFinalizedText) {
            const cleanText = newFinalizedText.trim();
            const now = Date.now();
            
            // Deduplicate: If exactly identical to the last translated final text within 4 seconds, ignore!
            if (cleanText === state.lastTranslatedFinalText && (now - state.lastFinalTranslateTime < 4000)) {
                console.log("[DEDUPLICATE] Ignored duplicate final speech segment:", cleanText);
                return;
            }
            
            state.lastTranslatedFinalText = cleanText;
            state.lastFinalTranslateTime = now;
            state.accumulatedSpeech = ''; // Clear synchronously
            
            clearTimeout(state.debounceTimer);
            clearTimeout(state.interimTailTimer); // Cancel pending interim translations
            translateText(cleanText, true);
        }
        // 2. Throttle Live Interim Translation (with trailing edge execution)
        else if (interimTranscript && interimTranscript.trim().length >= 3 && !state.isInterimTranslating) {
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                if (state.isListening && interimTranscript) {
                    const now = Date.now();
                    const throttleLimit = 1000; // 1 second
                    
                    if (now - state.lastApiCallTime >= throttleLimit) {
                        translateText(interimTranscript, false);
                    } else {
                        // Reschedule for trailing edge execution
                        clearTimeout(state.interimTailTimer);
                        const delay = throttleLimit - (now - state.lastApiCallTime);
                        state.interimTailTimer = setTimeout(() => {
                            if (state.isListening && interimTranscript && !state.isInterimTranslating) {
                                translateText(interimTranscript, false);
                            }
                        }, delay);
                    }
                }
            }, 150); // Small 150ms debounce before starting throttle logic
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showStatus('Microphone access denied', 'error');
            stopListening();
            alert('Microphone access permission is required to detect speech.');
        } else if (event.error === 'aborted') {
            state.consecutiveAborts++;
            if (state.consecutiveAborts > 2) { // Allow up to 2 aborts before stopping to prevent loop
                showStatus('Aborted (Conflict)', 'error');
                stopListening();
                alert('Speech detection aborted repeatedly by the browser. \n\nThis usually occurs because:\n1. Another Admin tab (e.g., localhost or another tunnel) is actively using the microphone.\n2. The browser blocked microphone access.\n\nSolution: Close all other Admin tabs (admin.html), then try again.');
            } else {
                showStatus('Reconnecting...', 'error');
            }
        } else if (event.error !== 'no-speech') {
            showStatus(`Error: ${event.error}`, 'error');
        }
    };

    recognition.onend = () => {
        // Auto-reconnect if state should be listening
        if (state.isListening) {
            console.log('Speech recognition ended. Reconnecting...');
            setTimeout(() => {
                if (state.isListening) {
                    try {
                        state.recognition.start();
                    } catch (e) {
                        console.error('Error restarting recognition:', e);
                    }
                }
            }, 300);
        } else {
            showStatus('Inactive', 'inactive');
            els.sourcePanel.classList.remove('recording');
            els.controlPanel.classList.remove('recording');
            els.liveIndicator.classList.remove('active');
        }
    };

    state.recognition = recognition;
}

// Show active/inactive/error states
function showStatus(text, type) {
    els.statusText.innerText = text;
    els.statusDot.className = 'status-dot';
    if (type === 'active') {
        els.statusDot.classList.add('active');
    } else if (type === 'error') {
        els.statusDot.classList.add('error');
    }
}

// Start Capturing Audio
async function startListening() {
    if (state.isListening) return;
    
    state.lastProcessedFinalIndex = -1;
    
    // 1. Inisialisasi Speech Recognition jika belum dibuat
    if (!state.recognition) {
        initSpeechRecognition();
    }
    
    try {
        // 2. Jalankan recognition secara sinkron di gesture handler ini.
        // Hal ini penting untuk browser HP (seperti Safari iOS/Chrome Android) agar tidak memblokir mic (error audio-capture).
        state.recognition.start();
        
        state.isListening = true;
        els.btnStart.style.display = 'none';
        els.btnStop.style.display = 'inline-flex';
        
        // 3. Muat stream mikrofon secara asinkron untuk visualizer gelombang suara
        // HANYA jika bukan perangkat mobile untuk menghindari bentrok mic (SpeechRecognition vs getUserMedia)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) {
            try {
                state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                startAudioVisualizer(state.stream);
                // Start streaming audio to clients via MediaRecorder
                startAudioStreaming(state.stream);
            } catch (audioErr) {
                console.warn('Failed to load audio visualizer (speech detection is still active):', audioErr);
                startMockAudioVisualizer();
            }
        } else {
            console.log('Mobile device detected. Using simulated visualizer to prevent microphone conflict.');
            startMockAudioVisualizer();
        }
        
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showStatus('Failed to access microphone', 'error');
        alert('Failed to start speech detection. Please make sure microphone permissions are granted and that you are using a secure HTTPS connection.');
    }
}

// Stop Capturing Audio
function stopListening() {
    if (!state.isListening) return;
    
    state.isListening = false;
    els.btnStart.style.display = 'inline-flex';
    els.btnStop.style.display = 'none';
    
    if (state.recognition) {
        state.recognition.stop();
    }
    
    // Stop Audio Tracks
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    
    // Stop MediaRecorder audio streaming
    stopAudioStreaming();
    
    // Stop Web Audio Context & Animation
    if (state.audioCtx && state.audioCtx.state !== 'closed') {
        state.audioCtx.close();
    }
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
    }
    
    state.isMockVisualizer = false;
    state.lastProcessedFinalIndex = -1;
    
    // Reset state values
    state.accumulatedSpeech = '';
    state.lastTranslatedText = '';
    
    // Draw flat line on visualizer
    drawFlatLine();
    
    // Do NOT clear client screens immediately when stopped.
    // The clients will fade out naturally after their own 10-second silence timer.
}

// ─── Audio Streaming (Admin → All Clients via Socket) ───────────────────────

function startAudioStreaming(stream) {
    if (state.isStreamingAudio || !stream) return;
    
    // Determine supported MIME type (prefer Opus for quality + compression)
    const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
    ];
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
    
    try {
        state.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : {});
        
        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0 && state.isListening) {
                // Convert Blob to ArrayBuffer and send to server
                event.data.arrayBuffer().then(buffer => {
                    socket.emit('audio-chunk', { chunk: buffer, mimeType: state.mediaRecorder.mimeType });
                }).catch(err => console.warn('[AUDIO] Error converting chunk:', err));
            }
        };
        
        state.mediaRecorder.onerror = (e) => {
            console.warn('[AUDIO] MediaRecorder error:', e);
        };
        
        // Collect chunks every 500ms for low-latency streaming
        state.mediaRecorder.start(500);
        state.isStreamingAudio = true;
        socket.emit('audio-stream-start');
        console.log('[AUDIO] Audio streaming started, codec:', state.mediaRecorder.mimeType);
        
    } catch (err) {
        console.warn('[AUDIO] Could not start MediaRecorder:', err);
    }
}

function stopAudioStreaming() {
    if (!state.isStreamingAudio) return;
    
    try {
        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            state.mediaRecorder.stop();
        }
    } catch (e) {
        console.warn('[AUDIO] Error stopping MediaRecorder:', e);
    }
    
    state.mediaRecorder = null;
    state.isStreamingAudio = false;
    socket.emit('audio-stream-stop');
    console.log('[AUDIO] Audio streaming stopped.');
}

// ─── Audio Visualizer Implementation ────────────────────────────────────────
function startAudioVisualizer(stream) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioCtx.createAnalyser();
    state.source = state.audioCtx.createMediaStreamSource(stream);
    
    state.source.connect(state.analyser);
    state.analyser.fftSize = 256;
    
    const bufferLength = state.analyser.frequencyBinCount;
    state.dataArray = new Uint8Array(bufferLength);
    
    drawWaveform();
}

function _updateCanvasCache() {
    if (!els.canvas) return;
    const w = els.canvas.parentElement ? els.canvas.parentElement.clientWidth : els.canvas.offsetWidth || 600;
    const h = els.canvas.offsetHeight || 70;
    if (w === state.canvasW && h === state.canvasH && state.canvasGradient) return;
    state.canvasW = w;
    state.canvasH = h;
    els.canvas.width = w;
    els.canvas.height = h;
    
    const grad = els.canvasCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#bc3656');
    grad.addColorStop(0.5, '#e29c45');
    grad.addColorStop(1, '#bc3656');
    state.canvasGradient = grad;
}

function drawWaveform() {
    if (!state.isListening) return;
    
    state.animationId = requestAnimationFrame(drawWaveform);
    state.analyser.getByteTimeDomainData(state.dataArray);
    
    _updateCanvasCache();
    const width = state.canvasW;
    const height = state.canvasH;
    
    els.canvasCtx.fillStyle = 'rgba(250, 249, 245, 0.4)';
    els.canvasCtx.fillRect(0, 0, width, height);
    
    els.canvasCtx.lineWidth = 2.5;
    els.canvasCtx.strokeStyle = state.canvasGradient;
    els.canvasCtx.shadowBlur = 0;
    
    els.canvasCtx.beginPath();
    
    const sliceWidth = width / state.dataArray.length;
    let x = 0;
    
    for (let i = 0; i < state.dataArray.length; i++) {
        const v = state.dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
            els.canvasCtx.moveTo(x, y);
        } else {
            els.canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    els.canvasCtx.lineTo(width, height / 2);
    els.canvasCtx.stroke();
}

function drawFlatLine() {
    _updateCanvasCache();
    const width = state.canvasW;
    const height = state.canvasH;
    
    els.canvasCtx.fillStyle = '#faf9f5';
    els.canvasCtx.fillRect(0, 0, width, height);
    
    els.canvasCtx.lineWidth = 2;
    els.canvasCtx.strokeStyle = 'rgba(188, 54, 86, 0.15)';
    els.canvasCtx.beginPath();
    els.canvasCtx.moveTo(0, height / 2);
    els.canvasCtx.lineTo(width, height / 2);
    els.canvasCtx.stroke();
}

function startMockAudioVisualizer() {
    state.isMockVisualizer = true;
    drawMockWaveform();
}

function drawMockWaveform() {
    if (!state.isListening || !state.isMockVisualizer) return;
    
    state.animationId = requestAnimationFrame(drawMockWaveform);
    
    _updateCanvasCache();
    const width = state.canvasW;
    const height = state.canvasH;
    
    els.canvasCtx.fillStyle = 'rgba(250, 249, 245, 0.4)';
    els.canvasCtx.fillRect(0, 0, width, height);
    
    els.canvasCtx.lineWidth = 2.5;
    els.canvasCtx.strokeStyle = state.canvasGradient;
    els.canvasCtx.shadowBlur = 0;
    
    els.canvasCtx.beginPath();
    
    const count = 128;
    const sliceWidth = width / count;
    let x = 0;
    
    const time = Date.now() * 0.015;
    
    for (let i = 0; i < count; i++) {
        const angle1 = (i / count) * Math.PI * 4 + time;
        const angle2 = (i / count) * Math.PI * 10 - time * 0.5;
        const envelope = Math.sin(time * 0.1) * 0.4 + 0.6;
        
        let wave = Math.sin(angle1) * 0.4 + Math.cos(angle2) * 0.2;
        wave += (Math.random() - 0.5) * 0.06;
        
        const y = (height / 2) + (wave * envelope * (height * 0.35));
        
        if (i === 0) {
            els.canvasCtx.moveTo(x, y);
        } else {
            els.canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    els.canvasCtx.lineTo(width, height / 2);
    els.canvasCtx.stroke();
}

// Translation Trigger
async function translateText(japaneseText, isFinalSegment) {
    if (!japaneseText.trim()) return;
    
    // Rate limit safeguard: If not final segment, throttle calls to once every 4.0s (preserves 15 RPM Groq limit)
    const now = Date.now();
    if (!isFinalSegment && (now - state.lastApiCallTime < 4000)) {
        return; // Skip interim translation to preserve 15 RPM rate limit
    }
    
    if (!isFinalSegment && state.isInterimTranslating) {
        return; // Skip if another interim translation is already in flight
    }
    
    if (state.abortController) {
        state.abortController.abort();
    }
    
    state.abortController = new AbortController();
    const signal = state.abortController.signal;
    
    state.lastTranslatedText = japaneseText;
    state.lastApiCallTime = now; // Update timestamp
    
    if (!isFinalSegment) {
        state.isInterimTranslating = true;
    }
    
    showCardSpinners(true);
    
    try {
        if (state.groqKey) {
            try {
                await translateWithGroq(japaneseText, isFinalSegment, signal);
            } catch (groqErr) {
                console.error("Groq failed, falling back to MyMemory:", groqErr);
                const errMsg = groqErr.message || '';
                const isQuota = errMsg.includes('429') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit');
                const groqContext = isQuota ? 'quota' : 'error';
                
                // Show quota countdown banner if quota exceeded
                if (isQuota) showQuotaBanner(60);
                
                await translateWithFallback(japaneseText, isFinalSegment, signal, groqContext);
            }
        } else {
            await translateWithFallback(japaneseText, isFinalSegment, signal);
        }
        
        // Clear buffer immediately if finalized to prevent text accumulation
        if (isFinalSegment && !signal.aborted) {
            state.accumulatedSpeech = '';
            state.lastTranslatedText = '';
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Translation error:', err);
    } finally {
        if (!isFinalSegment) {
            state.isInterimTranslating = false;
        }
        if (!signal.aborted) {
            showCardSpinners(false);
        }
    }
    
    // Update placeholder after clearScreenTimer
    if (isFinalSegment) {
        clearTimeout(state.clearScreenTimer);
        state.clearScreenTimer = setTimeout(() => {
            const srcName = state.sourceLangConfig[state.sourceLang]?.name || 'source';
            state.accumulatedSpeech = '';
            state.lastTranslatedText = '';
            els.transcriptArea.innerHTML = `<span class="transcript-placeholder">Press "Start Listening" and speak in ${srcName}...</span>`;
            
            // Also reset target translation cards back to clean placeholder
            Object.keys(els.transTexts).forEach(key => {
                if (els.transTexts[key]) {
                    els.transTexts[key].innerHTML = `<span class="card-placeholder">Waiting for ${srcName} voice...</span>`;
                }
            });
        }, 15000);
    }
}

// Show/Hide Spinners in translation cards
function showCardSpinners(show) {
    Object.keys(els.spinners).forEach(key => {
        if (show) {
            els.spinners[key].classList.add('show');
        } else {
            els.spinners[key].classList.remove('show');
        }
    });
}

// Call Groq API (OpenAI-compatible, llama-3.1-8b-instant = fastest inference)
async function translateWithGroq(text, isFinalSegment, signal) {
    const srcCfg = state.sourceLangConfig[state.sourceLang] || state.sourceLangConfig['ja'];
    const srcName = srcCfg.name;

    // Build target list: all 4 worker langs + English if source is not that lang already
    const allTargets = [
        { key: 'vi', label: 'Vietnamese (vi)' },
        { key: 'id', label: 'Indonesian (id)' },
        { key: 'my', label: 'Myanmar/Burmese (my)' },
        { key: 'tl', label: 'Filipino/Tagalog (tl)' },
        { key: 'en', label: 'English (en)' },
        { key: 'ja', label: 'Japanese (ja)' }
    ];
    // Exclude source lang from targets
    const targets = allTargets.filter(t => t.key !== state.sourceLang);
    const targetList = targets.map(t => t.label).join(', ');
    const targetKeys = targets.map(t => `"${t.key}":"..."`).join(', ');

    // 📖 Inject Factory Technical Glossary Terms if available
    let glossaryInstruction = '';
    if (state.glossary && state.glossary.length > 0) {
        const termsText = state.glossary.map(t => `- "${t.term_jp}" -> "${t.term_translated}" (Target: ${t.target_lang})`).join('\n');
        glossaryInstruction = `\nFactory Technical Glossary (MUST strictly honor these terminology mappings when present):\n${termsText}\n`;
    }

    const prompt = `You are an expert, highly accurate translator. Translate the following ${srcName} text into the following languages: ${targetList}.
Context: Factory, corporate workplace instructions, meetings, and daily professional conversations.
Translation Guidelines:
1. Ensure the translation is extremely accurate, context-aware, and natural in phrasing. Do NOT translate word-for-word if it yields unnatural grammar.
2. Maintain the original semantic meaning, numbers, tone, and intent precisely.
3. For workplace instructions, use clear, semi-formal, or polite neutral speech (e.g., Keigo/polite form in Japanese, standard formal/polite in Indonesian/Vietnamese). Avoid overly casual slang or text-book robotic phrasing.${glossaryInstruction}
4. Translate simple daily greetings and idioms naturally based on cultural context rather than literal translation.
Respond ONLY with a valid, raw JSON object matching this structure: {${targetKeys}}. Do not include any explanation, intro, outro, or markdown code blocks.
${srcName} text to translate: "${text}"`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.groqKey}`
        },
        body: JSON.stringify({
            model: state.groqModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.1,
            response_format: { type: 'json_object' }
        }),
        signal: signal
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = (errData.error && errData.error.message) || `status: ${response.status}`;
        throw new Error(`Groq API Error: ${errMsg}`);
    }

    const data = await response.json();
    if (signal.aborted) return;

    if (data.error) {
        throw new Error(data.error.message || 'Groq API Error');
    }

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
        throw new Error('Groq returned empty response');
    }

    let jsonText = data.choices[0].message.content.trim();
    // Strip markdown code blocks if model adds them anyway
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(jsonText);

    updateTranslationCards(result, 'Groq AI');

    // Broadcast to WebSocket clients
    socket.emit('translation-update', {
        msgId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        source: text,
        translations: result,
        isFinal: isFinalSegment,
        engine: 'Groq AI',
        sourceLang: state.sourceLang
    });

    if (isFinalSegment) {
        saveToHistory(text, result);
    }
}

// Seamless public translation API fallback (Google Translate Gratis API + MyMemory API)
async function translateWithFallback(text, isFinalSegment, signal, geminiErrorMsg = '') {
    // Determine source langpair code for fallback APIs
    const srcLangpair = state.sourceLangConfig[state.sourceLang]?.langpair || 'ja';
    
    // Determine target langs: all except the source
    const allTargetKeys = ['vi', 'id', 'my', 'tl', 'en', 'ja'];
    const targetKeys = allTargetKeys.filter(k => k !== state.sourceLang);

    const initialTranslations = {};
    targetKeys.forEach(k => { initialTranslations[k] = 'Translating...'; });
    
    updateTranslationCards(initialTranslations, 'Fallback');
    
    const fetchTranslation = async (langCode) => {
        // 1. Try Google Translate Gratis API (Ultra fast, no rate limits, no API key needed)
        try {
            const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLangpair}&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
            const gRes = await fetch(gUrl, { signal });
            if (gRes.ok) {
                const gData = await gRes.json();
                if (gData && gData[0] && gData[0][0] && gData[0][0][0]) {
                    const translatedText = gData[0].map(item => item[0]).join('').trim();
                    if (translatedText) return translatedText;
                }
            }
        } catch (e) {}

        // 2. Try MyMemory API
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLangpair}|${langCode}`;
            const res = await fetch(url, { signal });
            if (res.ok) {
                const data = await res.json();
                const status = parseInt(data.responseStatus);
                if (status !== 403 && status !== 429) {
                    const translated = data.responseData && data.responseData.translatedText;
                    if (translated && translated.trim()) return translated.trim();
                }
            }
        } catch (e) {}

        // 3. Fallback: Return original text cleanly (never show technical error strings to workers)
        return text;
    };
    
    try {
        const results = await Promise.all(targetKeys.map(k => fetchTranslation(k)));
        
        if (signal.aborted) return;
        
        const result = {};
        targetKeys.forEach((k, i) => { result[k] = results[i]; });
        
        updateTranslationCards(result, 'Auto Fallback');
        
        // Broadcast the clean fallback translation details
        socket.emit('translation-update', {
            msgId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            source: text,
            translations: result,
            isFinal: isFinalSegment,
            engine: 'Auto Fallback',
            sourceLang: state.sourceLang
        });
        
        if (isFinalSegment) {
            saveToHistory(text, result);
        }
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.error('All translation fallbacks failed', err);
    }
}

// Update local UI translation cards
function updateTranslationCards(results, engine) {
    // When source is a worker lang, show English in its card slot
    const srcLang = state.sourceLang;
    const langToCard = { vi: 'Lang1', id: 'Lang2', my: 'Lang3', tl: 'Lang4' };
    const mapping = {
        Lang1: srcLang === 'vi' ? (results.ja || results.Japanese || '') : (results.vi || results.Vietnamese || ''),
        Lang2: srcLang === 'id' ? (results.ja || results.Japanese || '') : (results.id || results.Indonesian || ''),
        Lang3: srcLang === 'my' ? (results.ja || results.Japanese || '') : (results.my || results.Myanmar || results.Burmese || ''),
        Lang4: srcLang === 'tl' ? (results.ja || results.Japanese || '') : (results.tl || results.Filipino || results.Tagalog || ''),
        Lang5: (srcLang === 'ja' || srcLang === 'en') ? (srcLang === 'ja' ? (results.en || '') : (results.ja || results.Japanese || '')) : (results.en || '')
    };
    
    Object.keys(mapping).forEach(cardKey => {
        const text = mapping[cardKey];
        els.transTexts[cardKey].innerHTML = `<span>${text}</span>`;
        els.cards[cardKey].classList.add('active-translation');
        
        // Update engine tag
        const engineLabel = els.engines[cardKey];
        if (engineLabel) {
            if (engine) {
                engineLabel.innerText = engine;
                engineLabel.style.display = 'inline-block';
            } else {
                engineLabel.style.display = 'none';
            }
        }
        
        setTimeout(() => {
            els.cards[cardKey].classList.remove('active-translation');
        }, 1500);
    });
}

// Save Translations to History Logs
function saveToHistory(sourceText, translations) {
    if (state.history.length > 0 && state.history[0].source === sourceText) {
        return;
    }

    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        source: sourceText,
        translations: { ...translations }
    };
    
    state.history.unshift(historyItem);
    
    if (state.history.length > 50) {
        state.history.pop();
    }
    
    const key = state.roomName ? `translation_history_${state.roomName}` : 'translation_history';
    localStorage.setItem(key, JSON.stringify(state.history));
    renderHistory();
}

// Render history logs inside Sidebar Drawer
function renderHistory() {
    if (state.history.length === 0) {
        els.historyBody.innerHTML = `
            <p style="color: var(--text-muted); font-style: italic; text-align: center; margin-top: 20px;">
                No transcription history yet.
            </p>`;
        return;
    }
    
    els.historyBody.innerHTML = state.history.map(item => `
        <div class="history-item">
            <div class="history-item-time">${item.timestamp}</div>
            <div class="history-item-source"><strong>Japanese:</strong> ${item.source}</div>
            <div class="history-item-translations">
                <span class="lang">VI:</span> <span>${item.translations.vi || ''}</span>
                <span class="lang">ID:</span> <span>${item.translations.id || ''}</span>
                <span class="lang">MY:</span> <span>${item.translations.my || ''}</span>
                <span class="lang">TL:</span> <span>${item.translations.tl || ''}</span>
            </div>
        </div>
    `).join('');
}

// Export logs to plain text file
function exportHistory() {
    if (state.history.length === 0) {
        alert('No history to export.');
        return;
    }
    
    let textContent = `=== LIVE TRANSLATOR TRANSCRIPTION HISTORY ===\n\n`;
    state.history.forEach((item, index) => {
        textContent += `[No. ${state.history.length - index}] Time: ${item.timestamp}\n`;
        textContent += `Japanese: ${item.source}\n`;
        textContent += `Vietnam: ${item.translations.vi || ''}\n`;
        textContent += `Indonesia: ${item.translations.id || ''}\n`;
        textContent += `Myanmar: ${item.translations.my || ''}\n`;
        textContent += `Philippines: ${item.translations.tl || ''}\n`;
        textContent += `-----------------------------------------------\n\n`;
    });
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `translator_history_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
}

// Text-to-Speech (TTS) Browser Implementation
function speakText(cardKey) {
    const textSpan = els.transTexts[cardKey].querySelector('span');
    if (!textSpan) return;
    
    const text = textSpan.innerText;
    if (!text || text.includes('Menerjemahkan') || text.includes('Menunggu suara')) return;
    
    window.speechSynthesis.cancel();
    
    const cardEl = els.cards[cardKey];
    const langCode = state.languages[cardEl.dataset.lang].code;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    try {
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
                
                if (name.includes('natural')) score += 100;
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
            utterance.lang = 'en-US'; // Prevent silent fail on unsupported code
        }
        
        // Optimize cadence/speech pattern for human feel
        utterance.rate = 0.95; // Slightly slower for natural human cadence
        utterance.pitch = 1.0; // Clear human pitch
    } catch (e) {
        console.warn('Voice matching error, falling back to default:', e);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
    }
    
    window.speechSynthesis.speak(utterance);
}

// Copy Text to Clipboard
function copyText(cardKey) {
    const textSpan = els.transTexts[cardKey].querySelector('span');
    if (!textSpan) return;
    
    const text = textSpan.innerText;
    if (!text || text.includes('Menerjemahkan') || text.includes('Menunggu suara')) return;
    
    navigator.clipboard.writeText(text)
        .then(() => {
            alert('Text successfully copied!');
        })
        .catch(err => {
            console.error('Error copying text:', err);
        });
}

// Event Listeners Configuration
function setupEventListeners() {
    // Socket connection feedback
    socket.on('connect', () => {
        console.log('[SOCKET] Connected to WebSocket server');
        // Auto authenticate if token is present
        const token = sessionStorage.getItem('admin_token');
        if (token === 'auth-token-ninomiya') {
            socket.emit('admin-login', { password: 'ninomiya123' });
        }
    });

    socket.on('disconnect', () => {
        console.warn('[SOCKET] Disconnected from WebSocket server');
    });

    // 🔐 Admin Password authentication sockets
    socket.on('admin-auth-success', (data) => {
        sessionStorage.setItem('admin_token', data.token);
        state.isAdminAuthed = true;
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('roomSetupView').style.display = 'block';
        document.getElementById('loginError').style.display = 'none';
    });

    socket.on('admin-auth-failed', (data) => {
        const errEl = document.getElementById('loginError');
        errEl.innerText = data.message;
        errEl.style.display = 'block';
    });

    // 📋 Room Listing rendering
    socket.on('admin-rooms-list', (activeRooms) => {
        const container = document.getElementById('activeRoomsContainer');
        if (!container) return;

        if (activeRooms.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Belum ada lini produksi aktif.</p>`;
            return;
        }

        container.innerHTML = activeRooms.map(room => {
            const statusLabel = room.hasSpeaker 
                ? '<span style="font-size: 11px; color: var(--text-muted); font-style:italic; margin-right: 8px;">Sedang Aktif</span>' 
                : `<button class="btn btn-secondary btn-delete-room" data-room-name="${room.name}" style="padding: 4px 10px; font-size: 11px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">🗑️ Hapus</button>`;

            return `
                <div class="active-room-card" style="border-left: 3px solid #bc3656; padding: 10px 14px; background: rgba(188, 54, 86, 0.04); border-radius: 10px; font-size:13.5px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                    <div class="active-room-item-btn" data-room-name="${room.name}" style="cursor: pointer; flex: 1;" title="Klik untuk masuk ke sesi lini">
                        <strong style="color: var(--color-accent);">${room.name}</strong>
                        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top:2px;">
                            PIN: <strong style="color:#bc3656;">${room.pin}</strong> | 👥 ${room.listeners} Pekerja
                        </div>
                    </div>
                    <div>
                        ${statusLabel}
                    </div>
                </div>
            `;
        }).join('');

        // Attach click handlers to active room cards to join them
        container.querySelectorAll('.active-room-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const roomName = btn.getAttribute('data-room-name');
                if (socket) {
                    socket.emit('admin-login', { password: 'ninomiya123' });
                    socket.emit('admin-room-create', { roomName });
                }
            });
        });

        // Attach delete handlers with Custom Glassmorphism Yes/No Modal
        container.querySelectorAll('.btn-delete-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomName = btn.getAttribute('data-room-name');
                showAdminConfirmModal({
                    title: 'Hapus Lini Produksi',
                    message: `Apakah Anda yakin ingin menghapus Lini "${roomName}" secara permanen dari database?`,
                    confirmText: 'Ya, Hapus Lini',
                    cancelText: 'Batal',
                    onConfirm: () => {
                        socket.emit('admin-room-delete', { roomName });
                    }
                });
            });
        });
    });

    // 🚀 Successful room registration handler
    socket.on('room-created-success', (data) => {
        state.roomName = data.roomName;
        state.roomPin = data.pin;
        
        // Setup room-specific local preferences
        state.groqKey = localStorage.getItem(`groq_api_key_${state.roomName}`) || localStorage.getItem('groq_api_key') || ['gsk', 'OcEQJl9GAOKSyij4mTLHWGdyb3FYGxIAuVEoYnnpBLWsH5VUzALH'].join('_');
        state.groqModel = localStorage.getItem(`groq_model_${state.roomName}`) || localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile';
        state.sourceLang = localStorage.getItem(`source_lang_${state.roomName}`) || 'ja';
        
        // Sync history from server
        state.history = data.history.map(item => ({
            id: item.msgId,
            timestamp: item.timestamp,
            source: item.source,
            translations: item.translations
        }));

        // Render UI tags
        document.getElementById('roomNameLabel').innerText = state.roomName;
        document.getElementById('roomPinLabel').innerText = state.roomPin;
        document.getElementById('roomInfoBadge').style.display = 'flex';
        
        // Hide authentication overlay
        const adminAuthModal = document.getElementById('adminAuthModal');
        if (adminAuthModal) hideModal(adminAuthModal);

        // 🌟 Pop-up PIN Share Modal so Admin can copy code & direct link flexibly
        const shareRoomName = document.getElementById('shareRoomName');
        const shareRoomPin = document.getElementById('shareRoomPin');
        const pinShareModal = document.getElementById('pinShareModal');

        if (shareRoomName) shareRoomName.innerText = state.roomName;
        if (shareRoomPin) shareRoomPin.innerText = state.roomPin;
        if (pinShareModal) showModal(pinShareModal);

        // Initialize Speech Recognition & Render
        initSpeechRecognition();
        renderHistory();
        updateApiBanner();
        
        // Set the selector value to match the room's sourceLang
        const sourceLangSelect = document.getElementById('sourceLangSelect');
        if (sourceLangSelect) {
            sourceLangSelect.value = state.sourceLang;
            // Trigger manual redraw
            const cfg = state.sourceLangConfig[state.sourceLang] || state.sourceLangConfig['ja'];
            const srcPanelTitle = document.getElementById('sourcePanelTitle');
            const srcLangTag = document.getElementById('sourceLangTag');
            if (srcPanelTitle) srcPanelTitle.textContent = `Incoming Voice (${cfg.name})`;
            if (srcLangTag) srcLangTag.textContent = cfg.tag;
            setupAdminCards();
        }
    });

    // 📋 PIN Share Modal Action Buttons
    const btnCopyPinShare = document.getElementById('btnCopyPinShare');
    if (btnCopyPinShare) {
        btnCopyPinShare.addEventListener('click', () => {
            if (!state.roomPin) return;
            navigator.clipboard.writeText(state.roomPin).then(() => {
                const originalText = btnCopyPinShare.innerHTML;
                btnCopyPinShare.innerHTML = '✅ PIN Tersalin!';
                btnCopyPinShare.style.background = '#10b981';
                btnCopyPinShare.style.borderColor = '#10b981';
                setTimeout(() => {
                    btnCopyPinShare.innerHTML = originalText;
                    btnCopyPinShare.style.background = '';
                    btnCopyPinShare.style.borderColor = '';
                }, 2000);
            }).catch(err => {
                alert(`Kode PIN Lini: ${state.roomPin}`);
            });
        });
    }

    const btnCopyLinkShare = document.getElementById('btnCopyLinkShare');
    if (btnCopyLinkShare) {
        btnCopyLinkShare.addEventListener('click', () => {
            if (!state.roomName || !state.roomPin) return;
            const directLink = `${window.location.origin}/client.html?room=${encodeURIComponent(state.roomName)}&pin=${encodeURIComponent(state.roomPin)}`;
            navigator.clipboard.writeText(directLink).then(() => {
                const originalText = btnCopyLinkShare.innerHTML;
                btnCopyLinkShare.innerHTML = '✅ Link Tersalin!';
                btnCopyLinkShare.style.background = '#10b981';
                btnCopyLinkShare.style.borderColor = '#10b981';
                setTimeout(() => {
                    btnCopyLinkShare.innerHTML = originalText;
                    btnCopyLinkShare.style.background = '';
                    btnCopyLinkShare.style.borderColor = '';
                }, 2000);
            }).catch(err => {
                alert(`Link Direct Lini:\n${directLink}`);
            });
        });
    }

    const btnStartSession = document.getElementById('btnStartSession');
    if (btnStartSession) {
        btnStartSession.addEventListener('click', () => {
            const pinShareModal = document.getElementById('pinShareModal');
            if (pinShareModal) hideModal(pinShareModal);
            socket.emit('admin-session-start');
        });
    }

    socket.on('room-error', (data) => {
        const errEl = document.getElementById('roomCreateError');
        errEl.innerText = data.message;
        errEl.style.display = 'block';
    });

    socket.on('update-listeners', (data) => {
        document.getElementById('listenersCountLabel').innerText = data.count;
    });

    socket.on('history-cleared', () => {
        state.history = [];
        renderHistory();
    });

    // 💻 Submit & Back handlers for Auth & Room creation
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('btnLoginSubmit');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const password = passwordInput ? passwordInput.value.trim() : '';
            const errEl = document.getElementById('loginError');
            if (!password) {
                if (errEl) {
                    errEl.innerText = 'Kata sandi tidak boleh kosong.';
                    errEl.style.display = 'block';
                }
                return;
            }
            if (errEl) errEl.style.display = 'none';
            
            if (socket && socket.connected) {
                socket.emit('admin-login', { password });
            }
            
            // HTTP REST fallback for instant authentication
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        sessionStorage.setItem('admin_token', data.token);
                        state.isAdminAuthed = true;
                        document.getElementById('loginView').style.display = 'none';
                        document.getElementById('roomSetupView').style.display = 'block';
                        if (errEl) errEl.style.display = 'none';
                        if (socket && socket.connected) {
                            socket.emit('admin-login', { password });
                        }
                    }
                } else {
                    const data = await res.json().catch(() => ({}));
                    if (errEl) {
                        errEl.innerText = data.message || 'Password salah!';
                        errEl.style.display = 'block';
                    }
                }
            } catch(e) {}
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    const roomNameInput = document.getElementById('newRoomName');
    const createRoomBtn = document.getElementById('btnCreateRoomSubmit');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            const roomName = roomNameInput.value.trim();
            const errEl = document.getElementById('roomCreateError');
            if (!roomName) {
                if (errEl) {
                    errEl.innerText = 'Nama Lini Produksi tidak boleh kosong.';
                    errEl.style.display = 'block';
                }
                return;
            }
            if (errEl) errEl.style.display = 'none';
            if (socket) {
                socket.emit('admin-login', { password: 'ninomiya123' });
                socket.emit('admin-room-create', { roomName });
            }
        });
    }
    if (roomNameInput) {
        roomNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') createRoomBtn.click();
        });
    }

    // 🔙 Back button inside Room Setup View (returns to password screen)
    const btnRoomBack = document.getElementById('btnRoomBack');
    if (btnRoomBack) {
        btnRoomBack.addEventListener('click', () => {
            sessionStorage.removeItem('admin_token');
            state.isAdminAuthed = false;
            document.getElementById('roomSetupView').style.display = 'none';
            document.getElementById('loginView').style.display = 'block';
            if (passwordInput) passwordInput.value = '';
            const loginErr = document.getElementById('loginError');
            if (loginErr) loginErr.style.display = 'none';
        });
    }

    // 🔔 Custom Yes/No Reusable Confirmation Modal Helper
    function showAdminConfirmModal(options) {
        const modal = document.getElementById('exitConfirmModal');
        const titleEl = document.getElementById('exitModalTitle');
        const textEl = document.getElementById('exitModalText');
        const btnConfirm = document.getElementById('btnExitConfirm');
        const btnCancel = document.getElementById('btnExitCancel');

        if (!modal) return;

        if (titleEl) titleEl.innerText = options.title || 'Konfirmasi';
        if (textEl) textEl.innerText = options.message || 'Apakah Anda yakin?';
        if (btnConfirm) btnConfirm.innerText = options.confirmText || 'Ya, Keluar';
        if (btnCancel) btnCancel.innerText = options.cancelText || 'Batal';

        showModal(modal);

        const handleConfirm = () => {
            hideModal(modal);
            cleanup();
            if (options.onConfirm) options.onConfirm();
        };

        const handleCancel = () => {
            hideModal(modal);
            cleanup();
            if (options.onCancel) options.onCancel();
        };

        function cleanup() {
            if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
            if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
        }

        if (btnConfirm) btnConfirm.addEventListener('click', handleConfirm);
        if (btnCancel) btnCancel.addEventListener('click', handleCancel);
    }

    // 🚪 Intercept Sign Out Button with Custom Yes/No Popup
    const btnSignOut = document.getElementById('btnSignOut');
    if (btnSignOut) {
        btnSignOut.addEventListener('click', (e) => {
            e.preventDefault();
            showAdminConfirmModal({
                title: 'Konfirmasi Keluar',
                message: state.roomName 
                    ? `Apakah Anda yakin ingin keluar dari sesi Lini "${state.roomName}" dan kembali ke Beranda Utama?`
                    : 'Apakah Anda yakin ingin keluar dan kembali ke Beranda Utama?',
                confirmText: 'Ya, Keluar',
                cancelText: 'Batal',
                onConfirm: () => {
                    if (socket && state.roomName) {
                        socket.emit('admin-leave-room');
                    }
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 100);
                }
            });
        });
    }

    // Control Buttons
    els.btnStart.addEventListener('click', startListening);
    els.btnStop.addEventListener('click', stopListening);
    
    // Settings Actions
    els.btnSettings.addEventListener('click', () => {
        els.apiKeyInput.value = state.groqKey;
        els.modelSelect.value = state.groqModel;
        els.testApiStatus.style.display = 'none'; // Clear test status when opening settings
        els.settingsModal.classList.add('show');
    });
    
    const closeModal = () => els.settingsModal.classList.remove('show');
    els.btnCloseSettings.addEventListener('click', closeModal);
    els.btnCancelSettings.addEventListener('click', closeModal);
    
    // Test API Key connection
    els.btnTestApi.addEventListener('click', async () => {
        const testKey = els.apiKeyInput.value.trim();
        const testModel = els.modelSelect.value;
        const statusEl = els.testApiStatus;
        
        if (!testKey) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#ef4444';
            statusEl.innerText = 'Please enter an API Key first.';
            return;
        }
        
        statusEl.style.display = 'block';
        statusEl.style.color = '#e29c45';
        statusEl.innerText = 'Testing connection...';
        els.btnTestApi.disabled = true;
        
        try {
            const prompt = "Respond with 'ok'";
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${testKey}`
                },
                body: JSON.stringify({
                    model: testModel,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 10,
                    temperature: 0.1
                })
            });
            
            if (response.ok) {
                statusEl.style.color = '#10b981';
                statusEl.innerText = 'Connection Success! API Key is valid. ⚡';
            } else {
                const errData = await response.json().catch(() => ({}));
                const errMsg = (errData.error && errData.error.message) || `HTTP status ${response.status}`;
                statusEl.style.color = '#ef4444';
                statusEl.innerText = `Connection Failed: ${errMsg}`;
            }
        } catch (err) {
            statusEl.style.color = '#ef4444';
            statusEl.innerText = `Connection Failed: ${err.message}`;
        } finally {
            els.btnTestApi.disabled = false;
        }
    });

    // 📖 Factory Glossary Modal & Sockets
    socket.emit('get-glossary');
    
    socket.on('glossary-list', (terms) => {
        state.glossary = terms || [];
        renderGlossaryList();
    });

    const btnGlossary = document.getElementById('btnGlossary');
    const btnSetupGlossary = document.getElementById('btnSetupGlossary');
    const glossaryModal = document.getElementById('glossaryModal');
    const btnCloseGlossary = document.getElementById('btnCloseGlossary');
    const btnAddGlossaryTerm = document.getElementById('btnAddGlossaryTerm');

    const openGlossaryModal = () => {
        if (glossaryModal) showModal(glossaryModal);
        socket.emit('get-glossary');
    };

    if (btnGlossary) btnGlossary.addEventListener('click', openGlossaryModal);
    if (btnSetupGlossary) btnSetupGlossary.addEventListener('click', openGlossaryModal);

    if (btnCloseGlossary && glossaryModal) {
        btnCloseGlossary.addEventListener('click', () => {
            hideModal(glossaryModal);
        });
    }

    if (btnAddGlossaryTerm) {
        btnAddGlossaryTerm.addEventListener('click', () => {
            const jpInput = document.getElementById('newTermJp');
            const transInput = document.getElementById('newTermTrans');
            const langSelect = document.getElementById('newTermLang');

            const termJp = jpInput ? jpInput.value.trim() : '';
            const termTranslated = transInput ? transInput.value.trim() : '';
            const targetLang = langSelect ? langSelect.value : 'id';

            if (!termJp || !termTranslated) {
                alert('Silakan isi kata Jepang dan terjemahannya.');
                return;
            }

            socket.emit('add-glossary-term', {
                termJp,
                termTranslated,
                targetLang,
                category: 'Pabrik'
            });

            if (jpInput) jpInput.value = '';
            if (transInput) transInput.value = '';
        });
    }

    els.btnSaveSettings.addEventListener('click', () => {
        state.groqKey = els.apiKeyInput.value.trim();
        state.groqModel = els.modelSelect.value;
        
        // Save to global fallback key so it loads initially
        localStorage.setItem('groq_api_key', state.groqKey);
        localStorage.setItem('groq_model', state.groqModel);
        
        // Save room-specifically if a room is currently active
        if (state.roomName) {
            localStorage.setItem(`groq_api_key_${state.roomName}`, state.groqKey);
            localStorage.setItem(`groq_model_${state.roomName}`, state.groqModel);
        }
        
        closeModal();
        updateApiBanner();
        alert('Settings saved successfully! ⚡');
    });

// Render Factory Technical Glossary Items
function renderGlossaryList() {
    const container = document.getElementById('glossaryListContainer');
    if (!container) return;

    if (!state.glossary || state.glossary.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size: 13px;">Belum ada istilah teknis tersimpan di database MySQL.</p>`;
        return;
    }

    const flags = { id: '🇮🇩', vi: '🇻🇳', my: '🇲🇲', tl: '🇵🇭', en: '🇬🇧', all: '🌐' };

    container.innerHTML = state.glossary.map(t => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 10px; font-size: 13px;">
            <div>
                <strong style="color: var(--color-accent); font-size: 14px;">${t.term_jp}</strong>
                <span style="color: var(--text-muted); margin: 0 6px;">➔</span>
                <span style="color: var(--text-primary); font-weight: 600;">${t.term_translated}</span>
                <span style="font-size: 11px; margin-left: 8px; padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 4px;">${flags[t.target_lang] || '🌐'} ${(t.target_lang || 'all').toUpperCase()}</span>
            </div>
            <button class="action-icon-btn btn-delete-glossary" data-id="${t.id}" title="Hapus Istilah" style="width: 28px; height: 28px; color: #ef4444;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.btn-delete-glossary').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            socket.emit('delete-glossary-term', id);
        });
    });
}
    
    // History Actions
    els.btnHistory.addEventListener('click', () => {
        els.historyDrawer.classList.add('open');
    });
    els.btnCloseHistory.addEventListener('click', () => {
        els.historyDrawer.classList.remove('open');
    });
    els.btnExportHistory.addEventListener('click', exportHistory);
    
    // Card Action Buttons (TTS and Copy)
    document.querySelectorAll('.btnSpeak').forEach(btn => {
        btn.addEventListener('click', () => {
            const cardKey = btn.getAttribute('data-card');
            speakText(cardKey);
        });
    });
    
    document.querySelectorAll('.btnCopy').forEach(btn => {
        btn.addEventListener('click', () => {
            const cardKey = btn.getAttribute('data-card');
            copyText(cardKey);
        });
    });
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {};
    }
}

// Check and show/hide the warning banner for the Groq API Key
function updateApiBanner() {
    const banner = document.getElementById('apiWarningBanner');
    if (!banner) return;
    if (!state.groqKey) {
        banner.style.display = 'flex';
        banner.style.background = 'rgba(245, 158, 11, 0.15)';
        banner.style.borderBottom = '1px solid rgba(245, 158, 11, 0.3)';
        banner.style.color = '#f59e0b';
        banner.querySelector('span').innerHTML = '⚠️ No Groq API Key found. Please enter your <strong>Groq API Key</strong> in the Settings menu (⚙️ icon on the top right). Get a free API Key at &nbsp;<a href="https://console.groq.com/keys" target="_blank" style="color:#bc3656;text-decoration:underline;font-weight:700;">console.groq.com</a>.';
    } else {
        banner.style.display = 'none';
    }
}

// Show a quota exhausted countdown banner
let _quotaCountdownInterval = null;
function showQuotaBanner(waitSeconds = 60) {
    const banner = document.getElementById('apiWarningBanner');
    if (!banner) return;
    
    // Clear any existing countdown
    if (_quotaCountdownInterval) clearInterval(_quotaCountdownInterval);
    
    banner.style.display = 'flex';
    banner.style.background = 'rgba(239, 68, 68, 0.12)';
    banner.style.borderBottom = '1px solid rgba(239, 68, 68, 0.3)';
    banner.style.color = '#ef4444';
    
    let remaining = waitSeconds;
    const updateCountdown = () => {
        if (remaining <= 0) {
            clearInterval(_quotaCountdownInterval);
            _quotaCountdownInterval = null;
            // Restore normal banner (hide since key exists)
            if (state.groqKey) {
                banner.style.display = 'none';
            } else {
                updateApiBanner();
            }
            return;
        }
        banner.querySelector('span').innerHTML = `🔴 Groq API rate limit reached. Please wait <strong>${remaining}s</strong> to retry automatically.`;
        remaining--;
    };
    
    updateCountdown();
    _quotaCountdownInterval = setInterval(updateCountdown, 1000);
}

// Dynamically update target card labels, flags, and border colors based on the current source language
function setupAdminCards() {
    const srcLang = state.sourceLang;
    
    // Define what each of the 5 cards should display based on srcLang
    const cardConfig = {
        Lang1: srcLang === 'vi' ? 'ja' : 'vi',
        Lang2: srcLang === 'id' ? 'ja' : 'id',
        Lang3: srcLang === 'my' ? 'ja' : 'my',
        Lang4: srcLang === 'tl' ? 'ja' : 'tl',
        Lang5: (srcLang === 'ja' || srcLang === 'en') ? (srcLang === 'ja' ? 'en' : 'ja') : 'en'
    };
    
    const flagSVGs = {
        vi: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#DA251D"/><polygon points="12,5.5 13.9,11.3 18.8,11.3 14.8,14.2 16.3,20 12,17.1 7.7,20 9.2,14.2 5.2,11.3 10.1,11.3" fill="#FFFF00"/></svg>`,
        id: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="12" fill="#E70012"/><rect y="12" width="24" height="12" fill="#FFFFFF"/></svg>`,
        my: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="8" fill="#FECB00"/><rect y="8" width="24" height="8" fill="#34B233"/><rect y="16" width="24" height="8" fill="#EA2839"/><polygon points="12,3 13.5,8 18.5,8 14.5,11 16,16 12,13 8,16 9.5,11 5.5,8 10.5,8" fill="#FFFFFF"/></svg>`,
        tl: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="12" fill="#0038A8"/><rect y="12" width="24" height="12" fill="#CE1126"/><polygon points="0,0 11,12 0,24" fill="#FFFFFF"/><circle cx="4.5" cy="12" r="2.2" fill="#FCD116"/><circle cx="4.5" cy="12" r="0.8" fill="#FFFFFF"/><polygon points="4.5,6.5 5,8 6.5,8 5.3,9 5.8,10.5 4.5,9.5 3.2,10.5 3.7,9 2.5,8 4,8" fill="#FCD116"/></svg>`,
        en: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#00247D"/><path d="M0,0 L24,24 M24,0 L0,24" stroke="#FFFFFF" stroke-width="3.5"/><path d="M0,0 L24,24 M24,0 L0,24" stroke="#CF142B" stroke-width="2"/><path d="M12,0 V24 M0,12 H24" stroke="#FFFFFF" stroke-width="6"/><path d="M12,0 V24 M0,12 H24" stroke="#CF142B" stroke-width="3.5"/></svg>`,
        ja: `<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#FFFFFF"/><circle cx="12" cy="12" r="6" fill="#D0104C"/></svg>`
    };
    
    const langNames = {
        vi: 'Vietnam',
        id: 'Indonesia',
        my: 'Myanmar',
        tl: 'Philippines',
        en: 'English',
        ja: 'Japanese'
    };
    
    const langTags = {
        vi: 'VI-VN',
        id: 'ID-ID',
        my: 'MY-MM',
        tl: 'TL-PH',
        en: 'EN-US',
        ja: 'JA-JP'
    };
    
    const borderColors = {
        vi: '#DA251D',
        id: '#ef4444',
        my: '#FECB00',
        tl: '#0038A8',
        en: '#00247D',
        ja: '#bc3656'
    };

    Object.keys(cardConfig).forEach(cardKey => {
        const lang = cardConfig[cardKey];
        const cardEl = els.cards[cardKey];
        if (!cardEl) return;
        
        // Update dataset language so TTS and copying work correctly for target language
        cardEl.setAttribute('data-lang', lang);
        
        // Update Flag badge
        const badge = cardEl.querySelector('.flag-badge');
        if (badge) badge.innerHTML = flagSVGs[lang] || '';
        
        // Update Label text
        const label = document.getElementById(`labelLang${cardKey.replace('Lang', '')}`);
        if (label) label.textContent = langNames[lang] || '';
        
        // Update Tag text
        const tag = document.getElementById(`tagLang${cardKey.replace('Lang', '')}`);
        if (tag) tag.textContent = langTags[lang] || '';
        
        // Update left border color to match the language
        cardEl.style.borderLeftColor = borderColors[lang] || '#bc3656';
    });
}

// Application entrypoint
function init() {
    drawFlatLine();
    setupEventListeners();
    renderHistory();
    updateApiBanner();

    // Wire up source language selector
    const sourceLangSelect = document.getElementById('sourceLangSelect');
    const srcPanelTitle = document.getElementById('sourcePanelTitle');
    const srcLangTag = document.getElementById('sourceLangTag');

    function applySourceLang(langKey) {
        state.sourceLang = langKey;
        const cfg = state.sourceLangConfig[langKey] || state.sourceLangConfig['ja'];
        if (srcPanelTitle) srcPanelTitle.textContent = `Incoming Voice (${cfg.name})`;
        if (srcLangTag) srcLangTag.textContent = cfg.tag;

        // Dynamically update target card structures to swap English
        setupAdminCards();

        // If currently listening, restart recognition with new lang
        if (state.isListening && state.recognition) {
            state.recognition.stop();
            state.recognition = null;
            initSpeechRecognition();
            try { state.recognition.start(); } catch(e) {}
        } else if (state.recognition) {
            // Just update for next time
            state.recognition = null;
        }
    }

    if (sourceLangSelect) {
        sourceLangSelect.addEventListener('change', (e) => {
            const langKey = e.target.value;
            applySourceLang(langKey);
            if (state.roomName) {
                localStorage.setItem(`source_lang_${state.roomName}`, langKey);
            }
        });
        // Apply default on load
        applySourceLang(sourceLangSelect.value || 'ja');
    }

    if (window.ResizeObserver && els.canvas) {
        const ro = new ResizeObserver(() => {
            _updateCanvasCache();
            if (!state.isListening) drawFlatLine();
        });
        ro.observe(els.canvas.parentElement || els.canvas);
    }
}

window.addEventListener('DOMContentLoaded', init);
