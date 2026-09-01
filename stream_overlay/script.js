// ==========================================================================
// SOCIAL MEDIA ROTATOR LOGIC
// ==========================================================================
function initSocialRotator() {
    const items = document.querySelectorAll('.social-item');
    if (items.length === 0) return;

    let currentIndex = 0;
    const rotateInterval = 5000; // Rotasi setiap 5 detik

    setInterval(() => {
        // Hapus class active dari item saat ini
        items[currentIndex].classList.remove('active');
        
        // Pindah ke item berikutnya, melingkar ke 0 jika mencapai akhir
        currentIndex = (currentIndex + 1) % items.length;
        
        // Tambahkan class active ke item baru
        items[currentIndex].classList.add('active');
    }, rotateInterval);
}


// ==========================================================================
// CANVAS COSMIC CLASH & PARTICLE SYSTEM
// ==========================================================================
class CosmicClashEffect {
    constructor() {
        this.canvas = document.getElementById('clash-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        
        this.particles = [];
        this.beams = [];
        this.ambientEmbers = [];
        this.lightnings = [];
        
        // Warna tema
        this.colors = {
            purple: ['#8a2be2', '#b026ff', '#da70d6', '#dda0dd'],
            cyan: ['#00f0ff', '#e0ffff', '#afeeee'],
            dark: ['#000000', '#1a0033'],
            white: ['#ffffff', '#f8f8ff']
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Mulai loops
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }
    
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }
    
    // 1. Partikel Aliran Sihir dari Kiri & Kanan Ke Tengah (Beams)
    createBeamParticle(side) {
        // side: 'left' atau 'right'
        const isLeft = side === 'left';
        
        return {
            x: isLeft ? 10 : this.canvas.width - 10,
            y: this.centerY + (Math.random() * 60 - 30),
            targetX: this.centerX,
            targetY: this.centerY,
            size: Math.random() * 4 + 2,
            speed: Math.random() * 0.03 + 0.015, // Porsi perjalanan per frame (LERP)
            progress: 0,
            color: this.colors.purple[Math.floor(Math.random() * this.colors.purple.length)],
            waveAmp: Math.random() * 20 + 10,
            waveFreq: Math.random() * 0.05 + 0.02,
            seed: Math.random() * 100
        };
    }
    
    // 2. Partikel Ledakan Plasma di Tengah (Clash Particles)
    createClashParticle() {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 4 + 2;
        
        return {
            x: this.centerX,
            y: this.centerY,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity - (Math.random() * 1), // Sedikit dorongan ke atas
            size: Math.random() * 5 + 1.5,
            color: Math.random() > 0.3 
                ? this.colors.purple[Math.floor(Math.random() * this.colors.purple.length)] 
                : this.colors.cyan[Math.floor(Math.random() * this.colors.cyan.length)],
            alpha: 1,
            decay: Math.random() * 0.02 + 0.01,
            gravity: 0.05
        };
    }
    
    // 3. Partikel Debu Kosmik Melayang di Latar Belakang (Ambient Embers)
    createAmbientEmber() {
        return {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + 20,
            vx: Math.random() * 1 - 0.5,
            vy: -(Math.random() * 0.8 + 0.3),
            size: Math.random() * 3 + 1,
            color: this.colors.purple[Math.floor(Math.random() * this.colors.purple.length)],
            alpha: Math.random() * 0.5 + 0.3,
            wobble: Math.random() * 100,
            wobbleSpeed: Math.random() * 0.02 + 0.005
        };
    }
    
    // 4. Petir Kosmik Hitam & Ungu di Titik Benturan (Lightning)
    createLightning() {
        const segments = [];
        let currX = this.centerX;
        let currY = this.centerY;
        const steps = 5;
        const maxOffset = 25;
        
        for (let i = 0; i < steps; i++) {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 20 + 10;
            const nextX = currX + Math.cos(angle) * length;
            const nextY = currY + Math.sin(angle) * length;
            
            segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY });
            currX = nextX;
            currY = nextY;
        }
        
        return {
            segments: segments,
            // 70% Petir Hitam Gelap, 30% Putih/Ungu Terang
            color: Math.random() > 0.3 ? '#000000' : '#ffffff',
            glowColor: '#b026ff',
            width: Math.random() * 3 + 1.5,
            life: 8 // frame durasi
        };
    }
    
    update() {
        // Spawn aliran sihir (Beams) secara berkala
        if (Math.random() < 0.4) this.beams.push(this.createBeamParticle('left'));
        if (Math.random() < 0.4) this.beams.push(this.createBeamParticle('right'));
        
        // Spawn partikel ambient secara berkala
        if (this.ambientEmbers.length < 60 && Math.random() < 0.2) {
            this.ambientEmbers.push(this.createAmbientEmber());
        }
        
        // Spawn ledakan tengah secara konstan (sumber benturan)
        for (let i = 0; i < 3; i++) {
            this.particles.push(this.createClashParticle());
        }
        
        // Spawn petir secara acak di tengah
        if (Math.random() < 0.15) {
            this.lightnings.push(this.createLightning());
        }
        
        // --- UPDATE BEAMS ---
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const b = this.beams[i];
            b.progress += b.speed;
            
            // Lerp posisi
            const targetX = b.targetX;
            const targetY = b.targetY;
            const startX = b.x; // simpan awal
            
            // Gerakan bergelombang (wave)
            const dx = b.targetX - (b.x === 10 ? 10 : this.canvas.width - 10);
            const currentX = (b.x === 10 ? 10 : this.canvas.width - 10) + dx * b.progress;
            
            const currentY = b.centerY + Math.sin(b.seed + currentX * b.waveFreq) * b.waveAmp * (1 - b.progress);
            
            b.currentX = currentX;
            b.currentY = currentY;
            
            if (b.progress >= 0.95) {
                // Saat menyentuh tengah, memicu ledakan partikel tambahan
                for (let j = 0; j < 2; j++) {
                    this.particles.push(this.createClashParticle());
                }
                this.beams.splice(i, 1);
            }
        }
        
        // --- UPDATE CLASH PARTICLES ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            
            if (p.alpha <= 0 || p.x < 0 || p.x > this.canvas.width || p.y > this.canvas.height) {
                this.particles.splice(i, 1);
            }
        }
        
        // --- UPDATE AMBIENT EMBERS ---
        for (let i = this.ambientEmbers.length - 1; i >= 0; i--) {
            const ember = this.ambientEmbers[i];
            ember.y += ember.vy;
            ember.wobble += ember.wobbleSpeed;
            ember.x += ember.vx + Math.sin(ember.wobble) * 0.3;
            
            if (ember.y < -10) {
                // Reset posisi ke bawah layar
                this.ambientEmbers[i] = this.createAmbientEmber();
            }
        }
        
        // --- UPDATE LIGHTNINGS ---
        for (let i = this.lightnings.length - 1; i >= 0; i--) {
            this.lightnings[i].life--;
            if (this.lightnings[i].life <= 0) {
                this.lightnings.splice(i, 1);
            }
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Efek gabungan screen untuk warna neon bercahaya
        this.ctx.mixBlendMode = 'screen';
        
        // 1. Gambar Ambient Embers (Latar belakang melayang)
        this.ambientEmbers.forEach(ember => {
            this.ctx.save();
            this.ctx.globalAlpha = ember.alpha;
            this.ctx.shadowBlur = ember.size * 2;
            this.ctx.shadowColor = ember.color;
            this.ctx.fillStyle = ember.color;
            this.ctx.beginPath();
            this.ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // 2. Gambar Sihir Mengalir (Beams)
        this.beams.forEach(b => {
            if (!b.currentX) return;
            this.ctx.save();
            this.ctx.shadowBlur = b.size * 3;
            this.ctx.shadowColor = b.color;
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath();
            this.ctx.arc(b.currentX, b.currentY, b.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ekor plasma kecil
            this.ctx.globalAlpha = 0.4;
            this.ctx.beginPath();
            const tailX = b.currentX - (b.x === 10 ? 15 : -15) * b.progress;
            this.ctx.arc(tailX, b.currentY, b.size * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // 3. Gambar Partikel Ledakan Tengah (Clash Particles)
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.shadowBlur = p.size * 3;
            this.ctx.shadowColor = p.color;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // 4. Gambar Petir Hitam & Ungu di Tengah
        this.lightnings.forEach(lightning => {
            this.ctx.save();
            this.ctx.strokeStyle = lightning.color;
            this.ctx.lineWidth = lightning.width;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            // Glow ungu untuk petir putih, bayangan pekat untuk petir hitam
            if (lightning.color === '#ffffff') {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = lightning.glowColor;
            } else {
                this.ctx.shadowBlur = 4;
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
            }
            
            this.ctx.beginPath();
            lightning.segments.forEach((seg, index) => {
                if (index === 0) this.ctx.moveTo(seg.x1, seg.y1);
                this.ctx.lineTo(seg.x2, seg.y2);
            });
            this.ctx.stroke();
            this.ctx.restore();
        });
        
        // 5. Tambahkan kilatan cahaya sentral (Core Glow)
        this.ctx.save();
        const grad = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 2, 
            this.centerX, this.centerY, 35
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, 'rgba(176, 38, 255, 0.8)');
        grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 40, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(this.animate);
    }
}


// ==========================================================================
// INISIALISASI SAAT PAGE LOADED
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan rotasi media sosial
    initSocialRotator();
    
    // Jalankan sistem animasi partikel kosmik
    new CosmicClashEffect();
    
    console.log("Cosmic Overlay System successfully initialized!");
});
