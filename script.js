class StaffPermissionSystem {
    constructor() {
        this.currentUser = null;
        this.activePermission = null;
        this.permissionTimer = null;
        this.timeRemaining = 0;
        this.dailyResetCheckDone = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initClock();
        this.loadSampleData();
        this.checkLoginStatus();
        this.checkDailyReset();
    }

    setupEventListeners() {
        // Login
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Permission
        document.getElementById('submit-permission').addEventListener('click', () => this.submitPermission());
        document.getElementById('end-permission').addEventListener('click', () => this.endPermission());
        
        // Permission type selection
        document.querySelectorAll('.permission-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.permission-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // History
        document.getElementById('refresh-history').addEventListener('click', () => this.loadHistory());
        
        // Enter key for login
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    checkLoginStatus() {
        const user = localStorage.getItem('currentUser');
        const lastLogin = localStorage.getItem('lastLogin');
        
        if (user && lastLogin) {
            const now = new Date();
            const lastLoginDate = new Date(lastLogin);
            const hoursDiff = (now - lastLoginDate) / (1000 * 60 * 60);
            
            // Auto logout setelah 8 jam
            if (hoursDiff < 8) {
                this.currentUser = JSON.parse(user);
                this.showDashboard();
                this.loadUserData();
            } else {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('lastLogin');
            }
        }
    }

    checkDailyReset() {
        const lastReset = localStorage.getItem('lastDailyReset');
        const today = new Date().toDateString();
        
        if (lastReset !== today) {
            // Reset daily quotas for all users
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.forEach(user => {
                user.dailyQuota = {
                    regular: 4,
                    meal: 3,
                    usedRegular: 0,
                    usedMeal: 0,
                    lastReset: today
                };
            });
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('lastDailyReset', today);
        }
    }

    loadSampleData() {
        if (!localStorage.getItem('users')) {
            const sampleUsers = [
                {
                    id: 1,
                    username: 'staff1',
                    password: 'staff123',
                    name: 'Ahmad Rizki',
                    shift: '14:45',
                    quota: {
                        regular: 4,
                        meal: 3,
                        usedRegular: 0,
                        usedMeal: 0
                    },
                    permissions: []
                },
                {
                    id: 2,
                    username: 'staff2',
                    password: 'staff123',
                    name: 'Siti Nurhaliza',
                    shift: '09:00',
                    quota: {
                        regular: 4,
                        meal: 3,
                        usedRegular: 0,
                        usedMeal: 0
                    },
                    permissions: []
                },
                {
                    id: 3,
                    username: 'staff3',
                    password: 'staff123',
                    name: 'Budi Santoso',
                    shift: '22:00',
                    quota: {
                        regular: 4,
                        meal: 3,
                        usedRegular: 0,
                        usedMeal: 0
                    },
                    permissions: []
                }
            ];
            localStorage.setItem('users', JSON.stringify(sampleUsers));
        }

        if (!localStorage.getItem('activePermissions')) {
            localStorage.setItem('activePermissions', JSON.stringify([]));
        }
    }

    login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            this.showNotification('error', 'Login Gagal', 'Username dan password harus diisi');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            this.showNotification('error', 'Login Gagal', 'Username atau password salah');
            return;
        }
        
        // Check shift time (2 jam dari waktu shift)
        const now = new Date();
        const shiftTime = new Date();
        const [shiftHour, shiftMinute] = user.shift.split(':').map(Number);
        
        shiftTime.setHours(shiftHour, shiftMinute, 0, 0);
        const shiftEnd = new Date(shiftTime.getTime() + (2 * 60 * 60 * 1000)); // +2 jam
        
        if (now < shiftTime || now > shiftEnd) {
            this.showNotification('warning', 'Waktu Login', `Hanya bisa login dari ${user.shift} sampai ${this.formatTime(shiftEnd)}`);
            return;
        }
        
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('lastLogin', new Date().toISOString());
        
        this.showDashboard();
        this.loadUserData();
        this.showNotification('success', 'Login Berhasil', `Selamat datang ${user.name}!`);
    }

    logout() {
        if (this.activePermission) {
            this.endPermission();
        }
        
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastLogin');
        this.currentUser = null;
        this.showLogin();
        this.showNotification('info', 'Logout', 'Anda telah logout dari sistem');
    }

    showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        document.getElementById('staff-name').textContent = this.currentUser.name;
    }

    showLogin() {
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    loadUserData() {
        // Update quota display
        const regularLeft = 4 - (this.currentUser.quota?.usedRegular || 0);
        const mealLeft = 3 - (this.currentUser.quota?.usedMeal || 0);
        
        document.getElementById('regular-left').textContent = regularLeft;
        document.getElementById('meal-left').textContent = mealLeft;
        
        // Update progress bars
        document.getElementById('regular-progress').style.width = `${(this.currentUser.quota?.usedRegular || 0) * 25}%`;
        document.getElementById('meal-progress').style.width = `${(this.currentUser.quota?.usedMeal || 0) * 33.33}%`;
        
        document.getElementById('regular-used').textContent = this.currentUser.quota?.usedRegular || 0;
        document.getElementById('meal-used').textContent = this.currentUser.quota?.usedMeal || 0;
        
        // Check if user has active permission
        const activePerms = JSON.parse(localStorage.getItem('activePermissions') || '[]');
        const userActivePerm = activePerms.find(p => p.userId === this.currentUser.id && !p.ended);
        
        if (userActivePerm) {
            this.activePermission = userActivePerm;
            this.startPermissionTimer(userActivePerm);
        }
        
        this.loadActiveStaff();
        this.loadHistory();
    }

    submitPermission() {
        const jobdesk = document.getElementById('jobdesk-select').value;
        const note = document.getElementById('permission-note').value.trim();
        const activeBtn = document.querySelector('.permission-btn.active');
        
        if (!jobdesk) {
            this.showNotification('warning', 'Perhatian', 'Pilih jobdesk terlebih dahulu');
            return;
        }
        
        if (!activeBtn) {
            this.showNotification('warning', 'Perhatian', 'Pilih jenis izin terlebih dahulu');
            return;
        }
        
        const type = activeBtn.dataset.type;
        const duration = parseInt(activeBtn.dataset.duration);
        
        // Check quota
        const regularUsed = this.currentUser.quota?.usedRegular || 0;
        const mealUsed = this.currentUser.quota?.usedMeal || 0;
        
        if (type === 'regular' && regularUsed >= 4) {
            this.showNotification('warning', 'Kuota Habis', 'Kuota izin regular sudah habis untuk hari ini');
            return;
        }
        
        if (type === 'meal' && mealUsed >= 3) {
            this.showNotification('warning', 'Kuota Habis', 'Kuota izin makan sudah habis untuk hari ini');
            return;
        }
        
        // Check if already has active permission
        if (this.activePermission) {
            this.showNotification('warning', 'Izin Aktif', 'Anda masih memiliki izin aktif');
            return;
        }
        
        // Check if same jobdesk has active permission from other user
        const activePerms = JSON.parse(localStorage.getItem('activePermissions') || '[]');
        const sameJobdeskActive = activePerms.find(p => p.jobdesk === jobdesk && !p.ended);
        
        if (sameJobdeskActive) {
            this.showNotification('warning', 'Jobdesk Sibuk', `Jobdesk ${jobdesk} sedang digunakan oleh staff lain`);
            return;
        }
        
        // Create permission
        const permission = {
            id: Date.now(),
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            type: type,
            jobdesk: jobdesk,
            note: note,
            duration: duration,
            startTime: new Date().toISOString(),
            endTime: null,
            ended: false
        };
        
        // Update quota
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            if (type === 'regular') {
                users[userIndex].quota.usedRegular += 1;
            } else if (type === 'meal') {
                users[userIndex].quota.usedMeal += 1;
            }
            
            // Save permission to user history
            if (!users[userIndex].permissions) {
                users[userIndex].permissions = [];
            }
            users[userIndex].permissions.push({
                ...permission,
                startTime: new Date().toLocaleString('id-ID')
            });
            
            localStorage.setItem('users', JSON.stringify(users));
            this.currentUser = users[userIndex];
        }
        
        // Add to active permissions
        activePerms.push(permission);
        localStorage.setItem('activePermissions', JSON.stringify(activePerms));
        
        // Start timer
        this.activePermission = permission;
        this.startPermissionTimer(permission);
        
        // Update UI
        this.loadUserData();
        this.loadActiveStaff();
        
        // Reset form
        document.getElementById('jobdesk-select').value = '';
        document.getElementById('permission-note').value = '';
        document.querySelectorAll('.permission-btn').forEach(b => b.classList.remove('active'));
        
        this.showNotification('success', 'Izin Disetujui', `Izin ${type} dimulai untuk ${duration} menit`);
    }

    startPermissionTimer(permission) {
        const startTime = new Date(permission.startTime).getTime();
        const durationMs = permission.duration * 60 * 1000;
        const endTime = startTime + durationMs;
        
        this.updateTimerDisplay(endTime);
        document.getElementById('timer-jobdesk').textContent = permission.jobdesk;
        document.getElementById('timer-overlay').style.display = 'flex';
        
        // Update timer every second
        this.permissionTimer = setInterval(() => {
            this.updateTimerDisplay(endTime);
        }, 1000);
        
        // Auto-end when time is up
        setTimeout(() => {
            if (this.activePermission?.id === permission.id) {
                this.endPermission();
                this.showNotification('info', 'Waktu Habis', 'Waktu izin telah berakhir');
            }
        }, durationMs);
    }

    updateTimerDisplay(endTime) {
        const now = new Date().getTime();
        const remainingMs = Math.max(0, endTime - now);
        
        const minutes = Math.floor(remainingMs / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        
        // Update text display
        document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
        document.getElementById('time-remaining').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update circular progress
        const totalDuration = this.activePermission?.duration * 60 || 900; // in seconds
        const elapsed = totalDuration - (minutes * 60 + seconds);
        const progress = (elapsed / totalDuration) * 283; // 2πr (r=45)
        
        const circle = document.querySelector('.timer-circle');
        if (circle) {
            circle.style.strokeDashoffset = 283 - progress;
        }
    }

    endPermission() {
        if (!this.activePermission) return;
        
        clearInterval(this.permissionTimer);
        
        // Update permission as ended
        const activePerms = JSON.parse(localStorage.getItem('activePermissions') || '[]');
        const permIndex = activePerms.findIndex(p => p.id === this.activePermission.id);
        
        if (permIndex !== -1) {
            activePerms[permIndex].ended = true;
            activePerms[permIndex].endTime = new Date().toISOString();
            localStorage.setItem('activePermissions', JSON.stringify(activePerms));
        }
        
        // Update user permission in history
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1 && users[userIndex].permissions) {
            const userPermIndex = users[userIndex].permissions.findIndex(
                p => p.id === this.activePermission.id
            );
            
            if (userPermIndex !== -1) {
                users[userIndex].permissions[userPermIndex].endTime = new Date().toLocaleString('id-ID');
                users[userIndex].permissions[userPermIndex].ended = true;
                localStorage.setItem('users', JSON.stringify(users));
            }
        }
        
        // Reset
        this.activePermission = null;
        document.getElementById('timer-overlay').style.display = 'none';
        
        // Update displays
        this.loadActiveStaff();
        this.loadHistory();
        
        this.showNotification('success', 'Izin Selesai', 'Izin telah diakhiri');
    }

    loadActiveStaff() {
        const activePerms = JSON.parse(localStorage.getItem('activePermissions') || '[]');
        const activeNow = activePerms.filter(p => !p.ended);
        
        const container = document.getElementById('active-staff-list');
        container.innerHTML = '';
        
        if (activeNow.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>Tidak ada staff yang sedang izin</p>
                </div>
            `;
            return;
        }
        
        activeNow.forEach(perm => {
            const startTime = new Date(perm.startTime);
            const now = new Date();
            const elapsedMs = now - startTime;
            const elapsedMin = Math.floor(elapsedMs / (1000 * 60));
            const elapsedSec = Math.floor((elapsedMs % (1000 * 60)) / 1000);
            
            const item = document.createElement('div');
            item.className = 'active-staff-item';
            item.innerHTML = `
                <div class="staff-avatar">
                    ${perm.userName.charAt(0)}
                </div>
                <div class="staff-details">
                    <h4>${perm.userName}</h4>
                    <p>${perm.jobdesk} • ${perm.type === 'regular' ? 'Izin' : 'Makan'}</p>
                </div>
                <div class="permission-time">
                    ${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}
                </div>
            `;
            container.appendChild(item);
        });
    }

    loadHistory() {
        const date = document.getElementById('history-date').value;
        const userHistory = this.currentUser?.permissions || [];
        
        // Filter by date if selected
        const filteredHistory = userHistory.filter(perm => {
            if (!date) return true;
            const permDate = new Date(perm.startTime).toISOString().split('T')[0];
            return permDate === date;
        }).reverse(); // Show latest first
        
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (filteredHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Tidak ada riwayat izin</p>
                </div>
            `;
            return;
        }
        
        filteredHistory.forEach(perm => {
            const typeClass = perm.type === 'regular' ? 'regular' : 'meal';
            const typeText = perm.type === 'regular' ? 'Izin 15m' : 'Makan 7m';
            
            const item = document.createElement('div');
            item.className = `history-item ${typeClass}`;
            item.innerHTML = `
                <div class="history-header">
                    <span class="history-type ${typeClass}">${typeText}</span>
                    <span class="history-time">${perm.startTime}</span>
                </div>
                <div class="history-details">
                    <p><strong>Jobdesk:</strong> ${perm.jobdesk}</p>
                    ${perm.note ? `<p><strong>Keterangan:</strong> ${perm.note}</p>` : ''}
                    <small>${perm.ended ? 'Selesai' : 'Aktif'} • ${perm.duration} menit</small>
                </div>
            `;
            container.appendChild(item);
        });
    }

    initClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const clockElement = document.getElementById('live-clock');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    showNotification(type, title, message) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        if (type === 'warning') icon = 'fas fa-exclamation-triangle';
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    formatTime(date) {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.staffSystem = new StaffPermissionSystem();
});