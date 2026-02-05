// Aplikasi Izin Staff - Main JavaScript
class StaffPermissionApp {
    constructor() {
        this.db = database;
        this.currentUser = null;
        this.currentPermissionType = null;
        this.currentTimeInterval = null;
        this.activePermissionCheckInterval = null;
        
        this.initializeEventListeners();
        this.updateTimeDisplay();
        this.checkLoginStatus();
    }

    initializeEventListeners() {
        // Login
        document.getElementById('loginBtn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());

        // Permission type selection
        document.querySelectorAll('.permission-type').forEach(el => {
            el.addEventListener('click', () => this.selectPermissionType(el));
        });

        // Request permission
        document.getElementById('requestPermissionBtn')?.addEventListener('click', () => this.requestPermission());

        // Notification close
        document.querySelector('.notification-close')?.addEventListener('click', () => {
            this.hideNotification();
        });
    }

    checkLoginStatus() {
        const savedUser = localStorage.getItem('currentStaffUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.currentUser = user;
            
            // Cek apakah masih dalam waktu login yang diizinkan
            if (!user.isAdmin) {
                const db = this.db.getDatabase();
                const staff = db.staff.find(s => s.id === user.id);
                if (staff) {
                    const canLogin = this.checkLoginWindow(staff.shiftStart);
                    if (!canLogin) {
                        localStorage.removeItem('currentStaffUser');
                        this.showNotification('Waktu login sudah habis. Silakan login pada waktu shift Anda.', 'warning');
                        return;
                    }
                }
            }
            
            this.showDashboard();
        }
    }

    checkLoginWindow(shiftStart) {
        const now = new Date();
        const [hours, minutes] = shiftStart.split(':').map(Number);
        const shiftStartTime = new Date();
        shiftStartTime.setHours(hours, minutes, 0, 0);
        
        const loginEndTime = new Date(shiftStartTime.getTime() + 2 * 60 * 60 * 1000);
        
        return now >= shiftStartTime && now <= loginEndTime;
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showNotification('Username dan password harus diisi', 'warning');
            return;
        }
        
        const result = this.db.validateLogin(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            
            // Simpan session
            localStorage.setItem('currentStaffUser', JSON.stringify(result.user));
            
            if (result.isAdmin) {
                // Redirect ke halaman admin
                window.location.href = 'admin.html';
            } else {
                // Cek apakah dalam waktu login yang diizinkan
                const db = this.db.getDatabase();
                const staff = db.staff.find(s => s.id === result.user.id);
                
                if (staff && this.checkLoginWindow(staff.shiftStart)) {
                    this.showDashboard();
                    this.showNotification('Login berhasil! Selamat bekerja.', 'success');
                } else {
                    localStorage.removeItem('currentStaffUser');
                    this.showNotification('Waktu login belum dimulai atau sudah habis. Silakan login 2 jam setelah shift dimulai.', 'warning');
                }
            }
        } else {
            this.showNotification(result.message || 'Login gagal', 'warning');
        }
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentStaffUser');
        
        if (this.currentTimeInterval) {
            clearInterval(this.currentTimeInterval);
        }
        
        if (this.activePermissionCheckInterval) {
            clearInterval(this.activePermissionCheckInterval);
        }
        
        this.showLoginScreen();
        this.showNotification('Anda telah logout', 'info');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('dashboardScreen').classList.remove('active');
        
        // Update shift info display
        this.updateShiftInfoDisplay();
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        this.loadDashboardData();
        this.startDashboardTimers();
        
        // Set initial permission type
        this.selectPermissionType(document.querySelector('.permission-type'));
    }

    updateShiftInfoDisplay() {
        const shiftDisplay = document.getElementById('shiftTimeDisplay');
        const db = this.db.getDatabase();
        
        // Menampilkan contoh shift untuk informasi
        if (db.staff.length > 0) {
            const sampleShift = db.staff[0];
            shiftDisplay.textContent = `Contoh: Shift ${sampleShift.shiftStart} - ${sampleShift.shiftEnd}, Login: ${sampleShift.shiftStart} - ${this.addHours(sampleShift.shiftStart, 2)}`;
        }
    }

    addHours(timeString, hours) {
        const [h, m] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(h + hours, m);
        return date.toTimeString().substring(0, 5);
    }

    loadDashboardData() {
        if (!this.currentUser || this.currentUser.isAdmin) return;
        
        const db = this.db.getDatabase();
        const staff = db.staff.find(s => s.id === this.currentUser.id);
        
        if (!staff) return;
        
        // Update user info
        document.getElementById('staffName').textContent = staff.name;
        document.getElementById('staffJobDesk').textContent = `Jobdesk: ${staff.jobdesk}`;
        document.getElementById('staffShift').textContent = `Shift: ${staff.shiftStart} - ${staff.shiftEnd}`;
        document.getElementById('loggedInUser').textContent = staff.name;
        
        // Update quota
        const settings = db.settings;
        document.getElementById('quota15Min').textContent = 
            `${settings.max15MinPermissions - staff.permissionsToday['15min']}`;
        document.getElementById('quota7Min').textContent = 
            `${settings.max7MinPermissions - staff.permissionsToday['7min']}`;
        
        document.getElementById('remaining15').textContent = 
            settings.max15MinPermissions - staff.permissionsToday['15min'];
        document.getElementById('remaining7').textContent = 
            settings.max7MinPermissions - staff.permissionsToday['7min'];
        
        // Load active permissions
        this.loadActivePermissions();
        
        // Load history
        this.loadPermissionHistory();
    }

    selectPermissionType(element) {
        // Remove active class from all
        document.querySelectorAll('.permission-type').forEach(el => {
            el.classList.remove('active');
        });
        
        // Add active class to selected
        element.classList.add('active');
        this.currentPermissionType = element.dataset.type;
    }

    requestPermission() {
        if (!this.currentUser || this.currentUser.isAdmin) return;
        
        if (!this.currentPermissionType) {
            this.showNotification('Pilih jenis izin terlebih dahulu', 'warning');
            return;
        }
        
        const reason = document.getElementById('permissionReason').value.trim();
        if (!reason) {
            this.showNotification('Harap isi keterangan izin', 'warning');
            return;
        }
        
        // Cek apakah staff sudah memiliki izin aktif
        const db = this.db.getDatabase();
        const hasActivePermission = db.activePermissions.some(ap => ap.staffId === this.currentUser.id);
        
        if (hasActivePermission) {
            this.showNotification('Anda sudah memiliki izin aktif', 'warning');
            return;
        }
        
        const result = this.db.requestPermission(
            this.currentUser.id,
            this.currentPermissionType,
            reason
        );
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            document.getElementById('permissionReason').value = '';
            this.loadDashboardData();
            this.showActivePermissionInfo(result.permission);
            this.startSleepingAnimation();
        } else {
            this.showNotification(result.message, 'warning');
        }
    }

    showActivePermissionInfo(permission) {
        const activePermissionInfo = document.getElementById('activePermissionInfo');
        const startTime = new Date(permission.startTime);
        const endTime = new Date(startTime.getTime() + permission.duration * 60000);
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        activePermissionInfo.innerHTML = `
            <h4><i class="fas fa-running"></i> Izin Aktif</h4>
            <p><strong>Jenis:</strong> ${permission.type === '15min' ? '15 menit' : 'Makan 7 menit'}</p>
            <p><strong>Alasan:</strong> ${permission.reason}</p>
            <p><strong>Sisa waktu:</strong> <span class="time-left">${minutes}:${seconds.toString().padStart(2, '0')}</span></p>
            <button id="endPermissionBtn" class="btn-secondary" style="margin-top: 10px;">
                <i class="fas fa-stop-circle"></i> Akhiri Izin
            </button>
        `;
        
        activePermissionInfo.style.display = 'block';
        
        // Add event listener to end permission button
        document.getElementById('endPermissionBtn')?.addEventListener('click', () => {
            this.endActivePermission(permission.id);
        });
        
        // Start countdown timer
        this.startPermissionCountdown(permission.id, endTime);
    }

    startPermissionCountdown(permissionId, endTime) {
        const countdownInterval = setInterval(() => {
            const now = new Date();
            const timeLeft = endTime - now;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                this.endActivePermission(permissionId, true);
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            const timeLeftElement = document.querySelector('.time-left');
            if (timeLeftElement) {
                timeLeftElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    endActivePermission(permissionId, expired = false) {
        const result = this.db.endPermission(permissionId);
        
        if (result.success) {
            this.showNotification(expired ? 'Izin telah berakhir' : 'Izin diakhiri', 'info');
            document.getElementById('activePermissionInfo').style.display = 'none';
            this.loadDashboardData();
            this.stopSleepingAnimation();
        }
    }

    loadActivePermissions() {
        const activePermissions = this.db.getActivePermissions();
        const onPermissionList = document.getElementById('onPermissionList');
        
        if (activePermissions.length === 0) {
            onPermissionList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <p>Tidak ada staff yang sedang izin</p>
                </div>
            `;
            return;
        }
        
        onPermissionList.innerHTML = '';
        
        activePermissions.forEach(permission => {
            const startTime = new Date(permission.startTime);
            const endTime = new Date(startTime.getTime() + permission.duration * 60000);
            const now = new Date();
            const timeLeft = Math.max(0, Math.floor((endTime - now) / 60000));
            
            const permissionElement = document.createElement('div');
            permissionElement.className = 'staff-item';
            permissionElement.innerHTML = `
                <div class="staff-info">
                    <div class="staff-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="staff-details">
                        <h4>${permission.staffName}</h4>
                        <p>${permission.staffJobdesk}</p>
                        <p><small>${permission.reason}</small></p>
                    </div>
                </div>
                <div class="permission-status status-active">
                    <i class="fas fa-clock"></i> ${timeLeft} menit
                </div>
            `;
            
            onPermissionList.appendChild(permissionElement);
        });
    }

    loadPermissionHistory() {
        if (!this.currentUser || this.currentUser.isAdmin) return;
        
        const history = this.db.getStaffHistory(this.currentUser.id);
        const historyList = document.getElementById('permissionHistory');
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Belum ada riwayat izin</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = '';
        
        history.forEach(record => {
            const startTime = new Date(record.startTime);
            const endTime = record.endTime ? new Date(record.endTime) : null;
            const duration = record.duration;
            
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            historyElement.innerHTML = `
                <div class="history-info">
                    <div class="history-avatar">
                        <i class="fas ${record.type === '15min' ? 'fa-coffee' : 'fa-utensils'}"></i>
                    </div>
                    <div class="history-details">
                        <h4>${record.type === '15min' ? 'Izin 15 menit' : 'Izin makan 7 menit'}</h4>
                        <p>${record.reason}</p>
                        <p><small>${startTime.toLocaleDateString('id-ID')} ${startTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small></p>
                    </div>
                </div>
                <div class="permission-status ${record.status === 'completed' ? 'status-completed' : 'status-active'}">
                    ${record.status === 'completed' ? 'Selesai' : 'Aktif'}
                </div>
            `;
            
            historyList.appendChild(historyElement);
        });
    }

    startSleepingAnimation() {
        const sleepingAnimation = document.getElementById('sleepingAnimation');
        sleepingAnimation.innerHTML = `
            <div class="sleeping-staff">
                <i class="fas fa-moon"></i>
            </div>
            <div class="z-z-z">Z z z . . .</div>
        `;
        sleepingAnimation.style.display = 'block';
    }

    stopSleepingAnimation() {
        const sleepingAnimation = document.getElementById('sleepingAnimation');
        sleepingAnimation.style.display = 'none';
        sleepingAnimation.innerHTML = '';
    }

    updateTimeDisplay() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const dateString = now.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const timeElement = document.getElementById('currentTime');
            const dashboardTimeElement = document.getElementById('dashboardTime');
            
            if (timeElement) {
                timeElement.innerHTML = `<i class="fas fa-clock"></i> ${dateString} ${timeString}`;
            }
            
            if (dashboardTimeElement) {
                dashboardTimeElement.innerHTML = `<i class="fas fa-clock"></i> ${dateString} ${timeString}`;
            }
        };
        
        updateTime();
        this.currentTimeInterval = setInterval(updateTime, 1000);
    }

    startDashboardTimers() {
        // Cek izin yang expired setiap 30 detik
        this.activePermissionCheckInterval = setInterval(() => {
            this.db.checkExpiredPermissions();
            this.loadDashboardData();
            
            // Cek apakah user masih memiliki izin aktif
            const db = this.db.getDatabase();
            const hasActivePermission = db.activePermissions.some(ap => 
                ap.staffId === this.currentUser?.id
            );
            
            if (!hasActivePermission) {
                document.getElementById('activePermissionInfo').style.display = 'none';
                this.stopSleepingAnimation();
            }
        }, 30000);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        
        // Set color based on type
        notification.style.borderLeftColor = 
            type === 'success' ? '#2ecc71' : 
            type === 'warning' ? '#f39c12' : 
            type === 'error' ? '#e74c3c' : '#1a73e8';
        
        notification.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.style.display = 'none';
    }
}

// Tambahkan di dalam class StaffPermissionApp atau di awal file

// Toggle password visibility
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

// Auto-focus username field
function autoFocusUsername() {
    const usernameInput = document.getElementById('username');
    if (usernameInput && document.getElementById('loginScreen').classList.contains('active')) {
        setTimeout(() => {
            usernameInput.focus();
        }, 300);
    }
}

// Demo login functionality
function setupDemoLogin() {
    const demoBtn = document.getElementById('demoLoginBtn');
    
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            // Fill with demo credentials
            document.getElementById('username').value = 'staff1';
            document.getElementById('password').value = 'staff123';
            
            // Show notification
            const notification = document.getElementById('notification');
            const notificationText = document.getElementById('notificationText');
            
            notificationText.textContent = 'Kredensial demo telah diisi. Klik "Masuk" untuk melanjutkan.';
            notification.style.borderLeftColor = '#4ECDC4';
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
            
            // Focus on password field
            document.getElementById('password').focus();
        });
    }
}

// Input validation
function setupInputValidation() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', function() {
            validateUsername(this.value);
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            validatePassword(this.value);
        });
    }
}

function validateUsername(username) {
    const inputElement = document.getElementById('username');
    const parent = inputElement.closest('.input-with-icon');
    
    if (!parent) return;
    
    if (username.length > 0 && username.length < 3) {
        parent.classList.add('invalid');
        parent.classList.remove('valid');
    } else if (username.length >= 3) {
        parent.classList.add('valid');
        parent.classList.remove('invalid');
    } else {
        parent.classList.remove('invalid', 'valid');
    }
}

function validatePassword(password) {
    const inputElement = document.getElementById('password');
    const parent = inputElement.closest('.input-with-icon');
    
    if (!parent) return;
    
    if (password.length > 0 && password.length < 6) {
        parent.classList.add('invalid');
        parent.classList.remove('valid');
    } else if (password.length >= 6) {
        parent.classList.add('valid');
        parent.classList.remove('invalid');
    } else {
        parent.classList.remove('invalid', 'valid');
    }
}

// Tambahkan CSS untuk validasi
const validationStyles = `
.input-with-icon.invalid input {
    border-color: #e74c3c;
    background: rgba(231, 76, 60, 0.05);
}

.input-with-icon.valid input {
    border-color: #2ecc71;
    background: rgba(46, 204, 113, 0.05);
}

.input-with-icon.invalid::after {
    content: '⚠';
    position: absolute;
    right: 45px;
    color: #e74c3c;
}

.input-with-icon.valid::after {
    content: '✓';
    position: absolute;
    right: 45px;
    color: #2ecc71;
}
`;

// Tambahkan stylesheet untuk validasi
const styleSheet = document.createElement('style');
styleSheet.textContent = validationStyles;
document.head.appendChild(styleSheet);

// Initialize semua fungsi input ketika aplikasi dimulai
function initializeInputFeatures() {
    setupPasswordToggle();
    setupDemoLogin();
    setupInputValidation();
    
    // Auto focus pada username ketika halaman login ditampilkan
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && loginScreen.classList.contains('active')) {
        autoFocusUsername();
    }
    
    // Enter key untuk login
    document.getElementById('password')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // Clear validation on blur
    document.getElementById('username')?.addEventListener('blur', function() {
        if (this.value === '') {
            this.closest('.input-with-icon')?.classList.remove('invalid', 'valid');
        }
    });
    
    document.getElementById('password')?.addEventListener('blur', function() {
        if (this.value === '') {
            this.closest('.input-with-icon')?.classList.remove('invalid', 'valid');
        }
    });
}

// Panggil di DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    initializeInputFeatures();
});
