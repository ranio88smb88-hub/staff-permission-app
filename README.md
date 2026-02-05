# 🚀 Staff Permission System - Galactic Control

Aplikasi web untuk mengelola izin staff dengan tema luar angkasa yang futuristik.

## 🌌 Fitur Utama

### 🔐 Sistem Login
- Login dengan username/password
- Hanya dapat login dalam rentang 2 jam dari shift
- Auto logout setelah 8 jam

### ⏱️ Sistem Izin
- **4x Izin Regular** (15 menit per hari)
- **3x Izin Makan** (7 menit per hari)
- Timer tetap berjalan meski internet hilang
- Hanya 1 jobdesk yang dapat izin dalam waktu bersamaan

### 🎨 Tema & UI
- Background luar angkasa dengan animasi bintang dan meteor
- Planet animasi bergerak
- Jam digital futuristik
- Dark theme dengan warna neon
- Responsive design

## 🛠️ Teknologi
- HTML5, CSS3, JavaScript (Vanilla)
- Local Storage untuk penyimpanan data
- Moment.js untuk manipulasi waktu
- Font Awesome untuk ikon
- Google Fonts (Orbitron, Space Grotesk)

## 🚀 Deployment ke Netlify

### 1. Upload ke GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/staff-permission.git
git push -u origin main