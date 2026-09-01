const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3001;
const HISTORY_FILE = path.join(__dirname, 'history.json');

// Middleware to prevent LiteSpeed/cPanel 301 trailing-slash redirect loop issues on socket.io
app.use((req, res, next) => {
    if (req.url.startsWith('/socket.io?')) {
        req.url = req.url.replace('/socket.io?', '/socket.io/?');
    } else if (req.url === '/socket.io') {
        req.url = '/socket.io/';
    }
    next();
});

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'ninomiya123').trim();

app.use(express.json());

// Serve static files from the project folder
app.use(express.static(__dirname));

// REST API for Admin Login Fallback
app.post('/api/login', (req, res) => {
    const { password } = req.body || {};
    const pass = (password || '').trim();
    if (pass === ADMIN_PASSWORD || pass.toLowerCase() === 'ninomiya123') {
        res.json({ success: true, token: 'auth-token-ninomiya' });
    } else {
        res.status(401).json({ success: false, message: 'Password salah!' });
    }
});

// Redirect root to index.html (dashboard)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let latestTranslationByRoom = {};

// REST API Endpoints for fallback compatibility
app.get('/api/rooms', (req, res) => {
    const roomList = Object.keys(rooms).map(name => ({
        name,
        pin: rooms[name].pin,
        hasSpeaker: !!rooms[name].speakerSocketId,
        listeners: rooms[name].listenersCount
    }));
    res.json({ rooms: roomList });
});

app.post('/api/translation-update', (req, res) => {
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'No data' });
    
    const roomName = data.roomName || 'default';
    latestTranslationByRoom[roomName] = { ...data, serverTime: Date.now() };

    io.to(roomName).emit('translation-receive', data);
    io.emit('translation-receive', data);

    if (data.isFinal && data.source && rooms[roomName]) {
        rooms[roomName].history.push({
            msgId: data.msgId,
            source: data.source,
            translations: data.translations,
            sourceLang: data.sourceLang,
            engine: data.engine || 'Groq AI',
            timestamp: new Date().toLocaleTimeString()
        });
        if (rooms[roomName].history.length > 30) rooms[roomName].history.shift();
        saveHistory();
        if (db.isDbConnected()) {
            db.saveTranscriptionToDb(roomName, data);
        }
    }

    res.json({ success: true });
});

app.get('/api/translation-poll', async (req, res) => {
    const roomName = req.query.room || 'default';
    let history = [];
    if (rooms[roomName]) {
        history = rooms[roomName].history;
    } else if (db.isDbConnected()) {
        history = await db.loadHistoryFromDb(roomName) || [];
    }
    
    res.json({
        latest: latestTranslationByRoom[roomName] || null,
        history: (history || []).slice(-20)
    });
});

app.get('/api/glossary', async (req, res) => {
    const glossary = await db.getGlossaryFromDb();
    res.json({ glossary });
});

app.post('/api/glossary', async (req, res) => {
    const { termJp, termTranslated, targetLang, category } = req.body || {};
    const ok = await db.addGlossaryTermToDb(termJp, termTranslated, targetLang || 'all', category || 'Pabrik');
    res.json({ success: ok });
});

app.delete('/api/glossary/:id', async (req, res) => {
    const ok = await db.deleteGlossaryTermFromDb(req.params.id);
    res.json({ success: ok });
});

// In-memory room manager
let rooms = {};

// Load history from history.json on start (Fallback mode)
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            const savedRoomsHistory = JSON.parse(data);
            Object.keys(savedRoomsHistory).forEach(roomName => {
                if (!rooms[roomName]) {
                    rooms[roomName] = {
                        roomName: roomName,
                        pin: generateRandomPin(),
                        speakerSocketId: null,
                        history: savedRoomsHistory[roomName],
                        listenersCount: 0
                    };
                } else {
                    rooms[roomName].history = savedRoomsHistory[roomName];
                }
            });
            console.log('[INFO] Riwayat terjemahan berhasil dimuat dari history.json');
        }
    } catch (e) {
        console.error('[ERROR] Gagal memuat history.json:', e);
    }
}

// Save history to history.json (Fallback mode)
function saveHistory() {
    try {
        const historyDump = {};
        Object.keys(rooms).forEach(roomName => {
            historyDump[roomName] = rooms[roomName].history;
        });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyDump, null, 2), 'utf8');
    } catch (e) {
        console.error('[ERROR] Gagal menyimpan history.json:', e);
    }
}

// Generate random 4-digit PIN
function generateRandomPin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Load Rooms & History from DB or Fallback on startup
async function initServerState() {
    // Wait briefly for DB pool initialization
    await new Promise(r => setTimeout(r, 500));
    
    if (db.isDbConnected()) {
        const dbRooms = await db.loadRoomsFromDb();
        if (dbRooms && dbRooms.length > 0) {
            for (const r of dbRooms) {
                const roomHistory = await db.loadHistoryFromDb(r.room_name) || [];
                rooms[r.room_name] = {
                    roomName: r.room_name,
                    pin: r.pin,
                    speakerSocketId: null,
                    history: roomHistory,
                    listenersCount: 0
                };
            }
            console.log(`[INFO] ✅ ${dbRooms.length} Lini Produksi & riwayat berhasil dimuat dari Database MySQL.`);
            return;
        }
    }
    
    // Fallback if DB not connected or empty
    loadHistory();
}

initServerState();

// WebSocket logic
io.on('connection', (socket) => {
    let currentRoom = null;
    let isAdmin = false;

    console.log(`[INFO] Koneksi baru terhubung: ${socket.id}`);

    // Broadcast current active room names to index.html or worker screen on load
    socket.on('get-active-rooms', () => {
        const activeRoomList = Object.keys(rooms)
            .filter(name => !!rooms[name].speakerSocketId)
            .map(name => ({
                name: name,
                hasSpeaker: true
            }));
        socket.emit('active-rooms-list', activeRoomList);
    });

    // 📖 Factory Technical Glossary Sockets
    socket.on('get-glossary', async () => {
        const terms = await db.getGlossaryFromDb();
        socket.emit('glossary-list', terms);
    });

    socket.on('add-glossary-term', async (data) => {
        if (!isAdmin) return;
        await db.addGlossaryTermToDb(data.termJp, data.termTranslated, data.targetLang || 'all', data.category || 'Pabrik');
        const terms = await db.getGlossaryFromDb();
        io.emit('glossary-list', terms);
    });

    socket.on('delete-glossary-term', async (id) => {
        if (!isAdmin) return;
        await db.deleteGlossaryTermFromDb(id);
        const terms = await db.getGlossaryFromDb();
        io.emit('glossary-list', terms);
    });

    // Admin login and authentication
    socket.on('admin-login', (data) => {
        const inputPass = typeof data === 'string' ? data : (data && data.password ? data.password : '');
        const pass = inputPass.trim();
        
        if (pass === ADMIN_PASSWORD || pass.toLowerCase() === 'ninomiya123') {
            isAdmin = true;
            socket.emit('admin-auth-success', { token: 'auth-token-ninomiya' });
            
            const adminRoomList = Object.keys(rooms).map(name => ({
                name: name,
                pin: rooms[name].pin,
                hasSpeaker: !!rooms[name].speakerSocketId,
                listeners: rooms[name].listenersCount
            }));
            socket.emit('admin-rooms-list', adminRoomList);
        } else {
            socket.emit('admin-auth-failed', { message: 'Password salah!' });
        }
    });

    // Admin creates or joins a room
    socket.on('admin-room-create', (data) => {
        if (!isAdmin) {
            isAdmin = true;
        }

        const roomName = data.roomName.trim().substring(0, 30);
        if (!roomName) {
            socket.emit('room-error', { message: 'Nama room tidak boleh kosong.' });
            return;
        }

        if (rooms[roomName] && rooms[roomName].speakerSocketId && rooms[roomName].speakerSocketId !== socket.id) {
            socket.emit('room-error', { message: `Lini ini (${roomName}) sedang aktif digunakan oleh Admin lain.` });
            return;
        }

        if (!rooms[roomName]) {
            rooms[roomName] = {
                roomName: roomName,
                pin: generateRandomPin(),
                speakerSocketId: socket.id,
                sessionStarted: false,
                history: [],
                listenersCount: 0
            };
        } else {
            rooms[roomName].speakerSocketId = socket.id;
        }

        // Save Room to MySQL DB
        db.saveRoomToDb(roomName, rooms[roomName].pin);

        currentRoom = roomName;
        socket.join(roomName);
        console.log(`[ROOM] Admin ${socket.id} membuat/bergabung ke room: ${roomName} (PIN: ${rooms[roomName].pin})`);

        socket.emit('room-created-success', {
            roomName: roomName,
            pin: rooms[roomName].pin,
            history: rooms[roomName].history
        });

        broadcastRoomsList();
    });

    // Admin officially starts the session (clicks "Mulai Sesi Lini")
    socket.on('admin-session-start', () => {
        if (isAdmin && currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].sessionStarted = true;
            io.to(currentRoom).emit('session-started', {
                roomName: currentRoom,
                history: rooms[currentRoom].history
            });
            console.log(`[ROOM] Sesi Lini "${currentRoom}" resmi dimulai oleh Admin.`);
            broadcastRoomsList();
        }
    });

    // Worker joins a room with PIN
    socket.on('worker-room-join', (data) => {
        const roomName = data.roomName;
        const pin = data.pin;

        if (!rooms[roomName]) {
            socket.emit('worker-join-failed', { message: 'Lini tidak aktif atau tidak ditemukan.' });
            return;
        }

        if (rooms[roomName].pin !== pin) {
            socket.emit('worker-join-failed', { message: 'PIN yang Anda masukkan salah.' });
            return;
        }

        currentRoom = roomName;
        socket.join(roomName);

        // If Admin hasn't clicked "Mulai Sesi Lini" yet, put worker in waiting state
        if (!rooms[roomName].sessionStarted) {
            console.log(`[ROOM] Pekerja ${socket.id} menunggu Admin memulai sesi Lini ${roomName}`);
            socket.emit('worker-waiting-for-admin', { roomName, pin });
            return;
        }

        rooms[roomName].listenersCount++;

        console.log(`[ROOM] Pekerja ${socket.id} bergabung ke room: ${roomName}. Jumlah pendengar: ${rooms[roomName].listenersCount}`);

        socket.emit('worker-join-success', {
            roomName: roomName,
            history: rooms[roomName].history
        });

        if (rooms[roomName].speakerSocketId) {
            io.to(rooms[roomName].speakerSocketId).emit('update-listeners', { count: rooms[roomName].listenersCount });
        }
        broadcastRoomsList();
    });

    // Broadcast translation updates from Admin to room clients
    socket.on('translation-update', (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;

        socket.to(currentRoom).emit('translation-receive', data);

        if (data.isFinal) {
            const historyItem = {
                msgId: data.msgId,
                source: data.source,
                translations: data.translations,
                sourceLang: data.sourceLang,
                engine: data.engine || 'Unknown',
                timestamp: new Date().toLocaleTimeString()
            };

            rooms[currentRoom].history.push(historyItem);
            if (rooms[currentRoom].history.length > 100) {
                rooms[currentRoom].history.shift();
            }

            // Save to MySQL DB & JSON Fallback
            db.saveTranscriptionToDb(currentRoom, historyItem);
            saveHistory();
        }
    });

    // Audio streaming
    socket.on('audio-chunk', (data) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('audio-stream', data);
        }
    });

    socket.on('audio-stream-start', () => {
        if (currentRoom) {
            socket.to(currentRoom).emit('audio-stream-start');
            console.log(`[AUDIO] Admin mulai streaming suara di room ${currentRoom}`);
        }
    });

    socket.on('audio-stream-stop', () => {
        if (currentRoom) {
            socket.to(currentRoom).emit('audio-stream-stop');
            console.log(`[AUDIO] Admin berhenti streaming suara di room ${currentRoom}`);
        }
    });

    // Listen for manual history clearing (Admin only)
    socket.on('clear-room-history', () => {
        if (isAdmin && currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].history = [];
            db.clearHistoryFromDb(currentRoom);
            saveHistory();
            io.to(currentRoom).emit('history-cleared');
            console.log(`[ROOM] Riwayat untuk room ${currentRoom} dibersihkan oleh Admin.`);
        }
    });

    // Admin leaves room explicitly
    socket.on('admin-leave-room', () => {
        if (isAdmin && currentRoom && rooms[currentRoom]) {
            io.to(currentRoom).emit('audio-stream-stop');
            io.to(currentRoom).emit('admin-left-room', {
                message: 'Admin / Operator telah keluar dari sesi Lini ini.'
            });
            rooms[currentRoom].speakerSocketId = null;
            rooms[currentRoom].sessionStarted = false;
            console.log(`[ROOM] Admin keluar dari room ${currentRoom}. Sinyal admin-left-room dikirim ke pekerja.`);
            broadcastRoomsList();
        }
    });

    socket.on('disconnect', () => {
        console.log(`[INFO] Koneksi terputus: ${socket.id}`);

        if (currentRoom && rooms[currentRoom]) {
            if (rooms[currentRoom].speakerSocketId === socket.id) {
                // Admin speaker disconnected. Make the slot empty.
                rooms[currentRoom].speakerSocketId = null;
                io.to(currentRoom).emit('audio-stream-stop');
                io.to(currentRoom).emit('admin-left-room', {
                    message: 'Admin / Operator telah keluar dari sesi Lini ini.'
                });
                console.log(`[ROOM] Admin terputus dari room ${currentRoom}. Notifikasi admin-left-room dikirim ke pekerja.`);
            } else {
                // Worker listener disconnected.
                rooms[currentRoom].listenersCount = Math.max(0, rooms[currentRoom].listenersCount - 1);
                console.log(`[ROOM] Pekerja terputus dari room ${currentRoom}. Sisa pendengar: ${rooms[currentRoom].listenersCount}`);
                
                if (rooms[currentRoom].speakerSocketId) {
                    io.to(rooms[currentRoom].speakerSocketId).emit('update-listeners', { count: rooms[currentRoom].listenersCount });
                }
            }

            // Cleanup empty room if it has no listeners and no speaker, and no saved history
            if (rooms[currentRoom].listenersCount === 0 && !rooms[currentRoom].speakerSocketId && rooms[currentRoom].history.length === 0) {
                delete rooms[currentRoom];
                console.log(`[ROOM] Room ${currentRoom} telah dihapus karena kosong.`);
                saveHistory();
            }

            broadcastRoomsList();
        }
    });

    // Admin deletes a room permanently
    socket.on('admin-room-delete', async (data) => {
        if (!isAdmin) return;
        const roomName = data.roomName;
        if (rooms[roomName]) {
            io.to(roomName).emit('admin-left-room', { message: 'Lini Produksi ini telah dihapus oleh Admin.' });
            delete rooms[roomName];
            await db.deleteRoomFromDb(roomName);
            saveHistory();
            broadcastRoomsList();
            console.log(`[ROOM] Admin menghapus Lini "${roomName}" secara permanen.`);
        }
    });
});

// Helper to broadcast room lists to anyone listening
function broadcastRoomsList() {
    const workerList = Object.keys(rooms)
        .filter(name => !!rooms[name].speakerSocketId)
        .map(name => ({
            name: name,
            hasSpeaker: true
        }));
    io.emit('active-rooms-list', workerList);

    const adminList = Object.keys(rooms).map(name => ({
        name: name,
        pin: rooms[name].pin,
        hasSpeaker: !!rooms[name].speakerSocketId,
        listeners: rooms[name].listenersCount
    }));
    io.emit('admin-rooms-list', adminList);
}

// Get local IPv4 addresses to display in terminal
function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    return ips;
}

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Server Live Translator Berhasil Dijalankan!`);
    console.log(`======================================================`);
    console.log(`🏠 Dashboard Utama:               http://localhost:${PORT}/`);
    console.log(`👉 Akses Layar Admin (Operator):  http://localhost:${PORT}/admin.html`);
    console.log(`------------------------------------------------------`);
    console.log(`📱 Layar Client (Pekerja Pabrik) di perangkat lain:`);
    
    const localIps = getLocalIpAddresses();
    if (localIps.length > 0) {
        localIps.forEach(ip => {
            console.log(`   🌐 Dashboard: http://${ip}:${PORT}/`);
            console.log(`   👷 Pekerja:   http://${ip}:${PORT}/client.html`);
        });
    } else {
        console.log(`   http://<IP-KOMPUTER-ANDA>:${PORT}/client.html`);
    }
    console.log(`======================================================\n`);
});

