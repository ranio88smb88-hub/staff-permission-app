// Aplikasi Izin Staff - Main JavaScript (VERSION 2.0)
class StaffPermissionApp {
    constructor() {
        this.db = database;
        this.currentUser = null;
        this.currentPermissionType = '15min';
        this.currentTimeInterval = null;
        this.activePermissionCheckInterval = null;
        this.activePermissionTimer = null;
        this.dashboardRefreshInterval = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeEventListeners();
        this.updateTimeDisplay();
        this.checkLoginStatus();
        this.initializeInputFeatures();
        this.initializeRealTimeUpdates();
    }

    initializeEventListeners() {
        // Login
        document.getElementById('loginBtn')?.addEventListener('click', () => this.handleLogin());
        
        // Enter key untuk login
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
        
        // Quick action buttons
        this.initializeQuickActions();
    }

    initializeInputFeatures() {
        // Password toggle
        const toggleBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = toggleBtn.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
        
        // Demo login
        const demoBtn = document.getElementById('demoLoginBtn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                document.getElementById('username').value = 'staff1';
                document.getElementById('password').value = 'staff123';
                this.showNotification('Kredensial demo telah diisi. Klik "Masuk" untuk melanjutkan.', 'info');
                document.getElementById('password').focus();
            });
        }
        
        // Auto focus pada username
        if (document.getElementById('loginScreen')?.classList.contains('active')) {
            setTimeout(() => {
                document.getElementById('username')?.focus();
            }, 300);
        }
    }

    initializeQuickActions() {
        // Quick permission buttons
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.addEventListener('click', (e) => {
                const target = e.target.closest('.quick-action');
                if (target) {
                    const type = target.dataset.type;
                    if (type) {
                        this.selectQuickPermission(type);
                    }
                }
            });
        }
    }

    selectQuickPermission(type) {
        this.currentPermissionType = type;
        document.getElementById('permissionReason').focus();
        this.showNotification(`Jenis izin "${type === '15min' ? '15 menit' : 'Makan 7 menit'}" dipilih`, 'info');
    }

    initializeRealTimeUpdates() {
        // Real-time update untuk dashboard
        if (this.dashboardRefreshInterval) {
            clearInterval(this.dashboardRefreshInterval);
        }
        
        this.dashboardRefreshInterval = setInterval(() => {
            if (this.currentUser && !this.currentUser.isAdmin) {
                this.loadDashboardData();
            }
        }, 5000); // Update setiap 5 detik
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
        const username = document.getElementById('username').value.trim();
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
        
        // Clear semua interval
        [this.currentTimeInterval, this.activePermissionCheckInterval, 
         this.activePermissionTimer, this.dashboardRefreshInterval].forEach(interval => {
            if (interval) clearInterval(interval);
        });
        
        this.showLoginScreen();
        this.showNotification('Anda telah logout', 'info');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('dashboardScreen').classList.remove('active');
        
        // Clear input fields
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        
        // Update shift info display
        this.updateShiftInfoDisplay();
        
        // Auto focus username
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 300);
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        this.loadDashboardData();
        this.startDashboardTimers();
        
        // Set initial permission type
        const firstPermissionType = document.querySelector('.permission-type');
        if (firstPermissionType) {
            this.selectPermissionType(firstPermissionType);
        }
        
        // Start real-time updates
        this.initializeRealTimeUpdates();
    }

    updateShiftInfoDisplay() {
        const shiftDisplay = document.getElementById('shiftTimeDisplay');
        const db = this.db.getDatabase();
        
        if (db.staff.length > 0) {
            const sampleShift = db.staff[0];
            const loginEnd = this.addHours(sampleShift.shiftStart, 2);
            shiftDisplay.textContent = `Contoh: Shift ${sampleShift.shiftStart} - ${sampleShift.shiftEnd}, Login: ${sampleShift.shiftStart} - ${loginEnd}`;
        }
    }

    addHours(timeString, hours) {
        const [h, m] = timeString.split(':').map(Number);
        const totalMinutes = h * 60 + m + hours * 60;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
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
        
        // Update quota dengan progress bar
        this.updateQuotaDisplay(staff, db.settings);
        
        // Load active permissions dengan monitoring real-time
        this.loadActivePermissions();
        
        // Load history
        this.loadPermissionHistory();
        
        // Load statistics
        this.loadDashboardStatistics();
        
        // Check if user has active permission
        const activePermission = db.activePermissions.find(ap => ap.staffId === this.currentUser.id);
        if (activePermission) {
            this.showActivePermissionInfo(activePermission);
            this.startSleepingAnimation();
        }
    }

    updateQuotaDisplay(staff, settings) {
        const remaining15 = settings.max15MinPermissions - (staff.permissionsToday['15min'] || 0);
        const remaining7 = settings.max7MinPermissions - (staff.permissionsToday['7min'] || 0);
        
        // Update quota numbers
        document.getElementById('quota15Min').textContent = 
            `${remaining15}/${settings.max15MinPermissions}`;
        document.getElementById('quota7Min').textContent = 
            `${remaining7}/${settings.max7MinPermissions}`;
        
        document.getElementById('remaining15').textContent = remaining15;
        document.getElementById('remaining7').textContent = remaining7;
        
        // Update progress bars
        const progress15 = document.getElementById('progress15min');
        const progress7 = document.getElementById('progress7min');
        
        if (progress15) {
            const percentage15 = ((staff.permissionsToday['15min'] || 0) / settings.max15MinPermissions) * 100;
            progress15.style.width = `${percentage15}%`;
            progress15.style.background = percentage15 >= 80 ? 'var(--danger)' : 
                                        percentage15 >= 50 ? 'var(--warning)' : 'var(--success)';
        }
        
        if (progress7) {
            const percentage7 = ((staff.permissionsToday['7min'] || 0) / settings.max7MinPermissions) * 100;
            progress7.style.width = `${percentage7}%`;
            progress7.style.background = percentage7 >= 80 ? 'var(--danger)' : 
                                       percentage7 >= 50 ? 'var(--warning)' : 'var(--success)';
        }
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
        
        const updateTimer = () => {
            const now = new Date();
            const timeLeft = endTime - now;
            
            if (timeLeft <= 0) {
                this.endActivePermission(permission.id, true);
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            activePermissionInfo.innerHTML = `
                <div class="active-permission-header">
                    <h4><i class="fas fa-running"></i> Izin Aktif</h4>
                    <span class="permission-type-badge ${permission.type}">
                        ${permission.type === '15min' ? '15 menit' : 'Makan 7 menit'}
                    </span>
                </div>
                <div class="active-permission-details">
                    <p><strong><i class="fas fa-comment"></i> Alasan:</strong> ${permission.reason}</p>
                    <p><strong><i class="fas fa-clock"></i> Dimulai:</strong> ${startTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</p>
                    <div class="countdown-timer">
                        <span class="timer-label">Sisa waktu:</span>
                        <span class="time-left">${minutes}:${seconds.toString().padStart(2, '0')}</span>
                    </div>
                </div>
                <button id="endPermissionBtn" class="btn-secondary">
                    <i class="fas fa-stop-circle"></i> Akhiri Izin
                </button>
            `;
            
            // Add event listener to end permission button
            const endBtn = document.getElementById('endPermissionBtn');
            if (endBtn) {
                endBtn.addEventListener('click', () => {
                    this.endActivePermission(permission.id);
                });
            }
        };
        
        updateTimer();
        activePermissionInfo.style.display = 'block';
        
        // Update timer every second
        if (this.activePermissionTimer) {
            clearInterval(this.activePermissionTimer);
        }
        this.activePermissionTimer = setInterval(updateTimer, 1000);
    }

    endActivePermission(permissionId, expired = false) {
        const result = this.db.endPermission(permissionId);
        
        if (result.success) {
            this.showNotification(expired ? 'Izin telah berakhir' : 'Izin diakhiri', 'info');
            document.getElementById('activePermissionInfo').style.display = 'none';
            this.loadDashboardData();
            this.stopSleepingAnimation();
            
            if (this.activePermissionTimer) {
                clearInterval(this.activePermissionTimer);
                this.activePermissionTimer = null;
            }
        }
    }

    loadActivePermissions() {
        const activePermissions = this.db.getActivePermissions();
        const onPermissionList = document.getElementById('onPermissionList');
        
        if (activePermissions.length === 0) {
            onPermissionList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <h3>Semua Staff Aktif</h3>
                    <p>Tidak ada staff yang sedang izin saat ini</p>
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
            const secondsLeft = Math.max(0, Math.floor(((endTime - now) % 60000) / 1000));
            
            // Hitung progress persentase
            const totalDuration = permission.duration * 60; // dalam detik
            const elapsed = Math.floor((now - startTime) / 1000);
            const progressPercentage = Math.min(100, (elapsed / totalDuration) * 100);
            
            const permissionElement = document.createElement('div');
            permissionElement.className = 'staff-item';
            permissionElement.innerHTML = `
                <div class="staff-info">
                    <div class="staff-avatar ${permission.type}">
                        <i class="fas ${permission.type === '15min' ? 'fa-coffee' : 'fa-utensils'}"></i>
                    </div>
                    <div class="staff-details">
                        <div class="staff-name-row">
                            <h4>${permission.staffName}</h4>
                            <span class="staff-status active">Sedang Izin</span>
                        </div>
                        <p class="staff-jobdesk">${permission.staffJobdesk}</p>
                        <p class="staff-reason">"${permission.reason}"</p>
                        <div class="time-info">
                            <small><i class="fas fa-clock"></i> Mulai: ${startTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small>
                        </div>
                    </div>
                </div>
                <div class="permission-timer">
                    <div class="timer-display">
                        <span class="time-left">${timeLeft}:${secondsLeft.toString().padStart(2, '0')}</span>
                        <small>Sisa waktu</small>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
            `;
            
            onPermissionList.appendChild(permissionElement);
        });
        
        // Update count badge
        const badge = document.querySelector('.on-permission-badge');
        if (badge) {
            badge.textContent = activePermissions.length;
        }
    }

    loadPermissionHistory() {
        if (!this.currentUser || this.currentUser.isAdmin) return;
        
        const history = this.db.getStaffHistory(this.currentUser.id);
        const historyList = document.getElementById('permissionHistory');
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3>Belum Ada Riwayat</h3>
                    <p>Anda belum pernah mengajukan izin</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = '';
        
        history.forEach(record => {
            const startTime = new Date(record.startTime);
            const endTime = record.endTime ? new Date(record.endTime) : null;
            const typeText = record.type === '15min' ? '15 menit' : 'Makan 7 menit';
            const statusClass = record.status === 'completed' ? 'completed' : 'active';
            const statusText = record.status === 'completed' ? 'Selesai' : 'Aktif';
            
            const duration = endTime ? 
                Math.round((endTime - startTime) / 60000) : record.duration;
            
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            historyElement.innerHTML = `
                <div class="history-info">
                    <div class="history-icon ${record.type}">
                        <i class="fas ${record.type === '15min' ? 'fa-coffee' : 'fa-utensils'}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-header">
                            <h4>${typeText}</h4>
                            <span class="history-status ${statusClass}">${statusText}</span>
                        </div>
                        <p class="history-reason">${record.reason}</p>
                        <div class="history-time">
                            <small><i class="fas fa-calendar"></i> ${startTime.toLocaleDateString('id-ID')}</small>
                            <small><i class="fas fa-clock"></i> ${startTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small>
                            <small><i class="fas fa-hourglass"></i> ${duration} menit</small>
                        </div>
                    </div>
                </div>
            `;
            
            historyList.appendChild(historyElement);
        });
    }

    loadDashboardStatistics() {
        const db = this.db.getDatabase();
        const staff = db.staff.find(s => s.id === this.currentUser.id);
        
        if (!staff) return;
        
        const today = new Date().toISOString().split('T')[0];
        const myHistory = db.permissionsHistory.filter(h => 
            h.staffId === this.currentUser.id && 
            h.startTime.includes(today)
        );
        
        // Update statistics
        const statsElement = document.getElementById('todayStats');
        if (statsElement) {
            const used15 = staff.permissionsToday['15min'] || 0;
            const used7 = staff.permissionsToday['7min'] || 0;
            
            statsElement.innerHTML = `
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <div class="stat-info">
                        <span class="stat-value">${used15}</span>
                        <span class="stat-label">Izin 15 menit</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-utensils"></i>
                    <div class="stat-info">
                        <span class="stat-value">${used7}</span>
                        <span class="stat-label">Izin makan</span>
                    </div>
                </div>
                <div class="stat-item">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-info">
                        <span class="stat-value">${myHistory.length}</span>
                        <span class="stat-label">Total hari ini</span>
                    </div>
                </div>
            `;
        }
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
        }, 30000);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        
        // Set icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'times-circle';
        
        notification.style.borderLeftColor = 
            type === 'success' ? '#2ecc71' : 
            type === 'warning' ? '#f39c12' : 
            type === 'error' ? '#e74c3c' : '#1a73e8';
        
        notification.style.display = 'block';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <span id="notificationText">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Re-add close event listener
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification();
        });
        
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.staffApp = new StaffPermissionApp();
});
