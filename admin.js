// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.db = database;
        this.checkAdminAccess();
        this.initializeEventListeners();
        this.loadSettings();
        this.loadStaffData();
        this.loadHistoryData();
        this.loadDisplaySettings();
    }

    checkAdminAccess() {
        const savedUser = localStorage.getItem('currentStaffUser');
        if (!savedUser) {
            window.location.href = 'index.html';
            return;
        }
        
        const user = JSON.parse(savedUser);
        if (!user.isAdmin) {
            window.location.href = 'index.html';
        } else {
            document.getElementById('adminName').textContent = user.name;
        }
    }

    initializeEventListeners() {
        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Logout
        document.getElementById('adminLogoutBtn').addEventListener('click', () => {
            localStorage.removeItem('currentStaffUser');
            window.location.href = 'index.html';
        });

        // Back to dashboard
        document.getElementById('backToDashboardBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Save settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Staff management
        document.getElementById('saveStaffBtn').addEventListener('click', () => this.saveStaff());
        document.getElementById('clearStaffFormBtn').addEventListener('click', () => this.clearStaffForm());
        document.getElementById('deleteStaffBtn').addEventListener('click', () => this.deleteStaff());

        // Staff password toggle
        document.getElementById('staffPasswordToggle')?.addEventListener('click', () => {
            const passwordInput = document.getElementById('staffPassword');
            const toggleIcon = document.getElementById('staffPasswordToggle').querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        });

        // History filter
        document.getElementById('filterHistoryBtn').addEventListener('click', () => this.loadHistoryData());
        document.getElementById('exportHistoryBtn').addEventListener('click', () => this.exportHistory());

        // Display settings
        document.getElementById('saveDisplaySettingsBtn').addEventListener('click', () => this.saveDisplaySettings());
        document.getElementById('systemLogo').addEventListener('input', (e) => this.updateLogoPreview(e.target.value));
        document.getElementById('backgroundImage').addEventListener('input', (e) => this.updateBackgroundPreview(e.target.value));

        // Notification close
        document.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification();
        });
    }

    switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(`${sectionId}Section`).classList.add('active');
        
        // Add active class to selected menu item
        document.querySelector(`.menu-item[data-section="${sectionId}"]`).classList.add('active');
    }

    loadSettings() {
        const settings = this.db.getSettings();
        
        document.getElementById('max15Min').value = settings.max15MinPermissions;
        document.getElementById('max7Min').value = settings.max7MinPermissions;
        document.getElementById('loginWindow').value = settings.loginWindowHours;
        document.getElementById('adminCode').value = settings.adminCode;
    }

    saveSettings() {
        const newSettings = {
            max15MinPermissions: parseInt(document.getElementById('max15Min').value) || 4,
            max7MinPermissions: parseInt(document.getElementById('max7Min').value) || 3,
            loginWindowHours: parseInt(document.getElementById('loginWindow').value) || 2,
            adminCode: document.getElementById('adminCode').value || 'ADMIN123'
        };

        const result = this.db.updateSettings(newSettings);
        this.showNotification(result.message, result.success ? 'success' : 'warning');
    }

    loadStaffData() {
        const staff = this.db.getAllStaff();
        const staffTableBody = document.getElementById('staffTableBody');
        const filterStaffSelect = document.getElementById('filterStaff');
        
        // Clear existing data
        staffTableBody.innerHTML = '';
        filterStaffSelect.innerHTML = '<option value="">Semua Staff</option>';
        
        if (staff.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <div style="color: #666; font-style: italic;">
                            <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                            Tidak ada data staff
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate staff table
        staff.forEach(staffMember => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${staffMember.name}</strong></td>
                <td>${staffMember.username}</td>
                <td><span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${staffMember.jobdesk}</span></td>
                <td><span style="background: #f3e5f5; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${staffMember.shiftStart} - ${staffMember.shiftEnd}</span></td>
                <td>
                    <button class="btn-edit" data-id="${staffMember.id}" title="Edit staff">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            staffTableBody.appendChild(row);
            
            // Add to filter select
            const option = document.createElement('option');
            option.value = staffMember.id;
            option.textContent = `${staffMember.name} (${staffMember.jobdesk})`;
            filterStaffSelect.appendChild(option);
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const staffId = parseInt(e.currentTarget.dataset.id);
                this.editStaff(staffId);
            });
        });
    }

    editStaff(staffId) {
        const staff = this.db.getAllStaff().find(s => s.id === staffId);
        
        if (!staff) {
            this.showNotification('Staff tidak ditemukan', 'warning');
            return;
        }
        
        // Fill form with staff data
        document.getElementById('editStaffId').value = staff.id;
        document.getElementById('staffName').value = staff.name;
        document.getElementById('staffUsername').value = staff.username;
        document.getElementById('staffPassword').value = '';
        document.getElementById('staffJobdesk').value = staff.jobdesk;
        document.getElementById('staffShiftStart').value = staff.shiftStart;
        document.getElementById('staffShiftEnd').value = staff.shiftEnd;
        
        // Show delete button
        document.getElementById('deleteStaffBtn').style.display = 'inline-flex';
        
        // Scroll to form
        document.getElementById('staffSection').scrollIntoView({ behavior: 'smooth' });
        
        // Show notification
        this.showNotification(`Sedang mengedit staff: ${staff.name}`, 'info');
    }

    saveStaff() {
        const staffId = document.getElementById('editStaffId').value;
        const staffData = {
            name: document.getElementById('staffName').value.trim(),
            username: document.getElementById('staffUsername').value.trim(),
            jobdesk: document.getElementById('staffJobdesk').value.trim(),
            shiftStart: document.getElementById('staffShiftStart').value,
            shiftEnd: document.getElementById('staffShiftEnd').value
        };
        
        // Add password if provided
        const password = document.getElementById('staffPassword').value;
        if (password) {
            staffData.password = password;
        }
        
        // Validation
        if (!staffData.name || !staffData.username || !staffData.jobdesk) {
            this.showNotification('Nama, username, dan jobdesk harus diisi', 'warning');
            return;
        }
        
        let result;
        if (staffId) {
            // Update existing staff
            result = this.db.updateStaff(parseInt(staffId), staffData);
        } else {
            // Add new staff
            if (!password) {
                this.showNotification('Password wajib diisi untuk staff baru', 'warning');
                return;
            }
            result = this.db.addStaff(staffData);
        }
        
        if (result.success) {
            this.showNotification(result.message, 'success');
            this.loadStaffData();
            this.clearStaffForm();
        } else {
            this.showNotification(result.message, 'warning');
        }
    }

    clearStaffForm() {
        document.getElementById('editStaffId').value = '';
        document.getElementById('staffName').value = '';
        document.getElementById('staffUsername').value = '';
        document.getElementById('staffPassword').value = '';
        document.getElementById('staffJobdesk').value = '';
        document.getElementById('staffShiftStart').value = '08:00';
        document.getElementById('staffShiftEnd').value = '16:00';
        document.getElementById('deleteStaffBtn').style.display = 'none';
        
        // Reset password toggle icon
        const toggleIcon = document.getElementById('staffPasswordToggle')?.querySelector('i');
        if (toggleIcon) {
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
        
        this.showNotification('Form telah dibersihkan', 'info');
    }

    deleteStaff() {
        const staffId = document.getElementById('editStaffId').value;
        
        if (!staffId) {
            this.showNotification('Tidak ada staff yang dipilih', 'warning');
            return;
        }
        
        const staffName = document.getElementById('staffName').value;
        if (confirm(`Apakah Anda yakin ingin menghapus staff "${staffName}"? Tindakan ini tidak dapat dibatalkan.`)) {
            const result = this.db.deleteStaff(parseInt(staffId));
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadStaffData();
                this.clearStaffForm();
            } else {
                this.showNotification(result.message, 'warning');
            }
        }
    }

    loadHistoryData() {
        const db = this.db.getDatabase();
        let filteredHistory = [...db.permissionsHistory].sort((a, b) => 
            new Date(b.startTime) - new Date(a.startTime)
        );
        
        // Apply filters
        const filterDate = document.getElementById('filterDate').value;
        const filterStaff = document.getElementById('filterStaff').value;
        
        if (filterDate) {
            filteredHistory = filteredHistory.filter(record => {
                const recordDate = new Date(record.startTime).toISOString().split('T')[0];
                return recordDate === filterDate;
            });
        }
        
        if (filterStaff) {
            filteredHistory = filteredHistory.filter(record => 
                record.staffId === parseInt(filterStaff)
            );
        }
        
        // Display history
        const historyTableBody = document.getElementById('historyTableBody');
        historyTableBody.innerHTML = '';
        
        if (filteredHistory.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div style="color: #666; font-style: italic;">
                            <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                            Tidak ada data riwayat izin
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredHistory.forEach(record => {
            const startTime = new Date(record.startTime);
            const endTime = record.endTime ? new Date(record.endTime) : null;
            const duration = record.duration;
            const staff = db.staff.find(s => s.id === record.staffId);
            const typeText = record.type === '15min' ? '15 menit' : 'Makan 7 menit';
            const statusClass = record.status === 'completed' ? 'status-completed' : 'status-active';
            const statusText = record.status === 'completed' ? 'Selesai' : 'Aktif';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${startTime.toLocaleDateString('id-ID')}</div>
                    <small style="color: #666;">${startTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small>
                </td>
                <td>
                    <div style="font-weight: 500;">${staff ? staff.name : 'Unknown'}</div>
                    <small style="color: #666;">${staff ? staff.username : ''}</small>
                </td>
                <td><span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${record.staffJobdesk}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas ${record.type === '15min' ? 'fa-coffee' : 'fa-utensils'}" style="color: #4dabf7;"></i>
                        ${typeText}
                    </div>
                </td>
                <td>${record.reason}</td>
                <td><span style="background: #f3e5f5; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${duration} menit</span></td>
                <td>
                    <span class="permission-status ${statusClass}" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas ${statusText === 'Selesai' ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${statusText}
                    </span>
                </td>
            `;
            historyTableBody.appendChild(row);
        });
        
        // Show count
        this.showNotification(`Menampilkan ${filteredHistory.length} data riwayat izin`, 'info');
    }

    exportHistory() {
        const db = this.db.getDatabase();
        const history = db.permissionsHistory;
        
        if (history.length === 0) {
            this.showNotification('Tidak ada data untuk diexport', 'warning');
            return;
        }
        
        // Convert to CSV
        let csv = 'Tanggal,Waktu,Staff,Username,Jobdesk,Jenis Izin,Alasan,Durasi,Status,Waktu Mulai,Waktu Selesai\n';
        
        history.forEach(record => {
            const startTime = new Date(record.startTime);
            const endTime = record.endTime ? new Date(record.endTime) : null;
            const staff = db.staff.find(s => s.id === record.staffId);
            const typeText = record.type === '15min' ? '15 menit' : 'Makan 7 menit';
            
            csv += `"${startTime.toLocaleDateString('id-ID')}","${startTime.toLocaleTimeString()}","${staff ? staff.name : 'Unknown'}","${staff ? staff.username : ''}","${record.staffJobdesk}","${typeText}","${record.reason}","${record.duration} menit","${record.status}","${startTime.toLocaleTimeString()}","${endTime ? endTime.toLocaleTimeString() : '-'}"\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `riwayat-izin-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Data berhasil diexport ke CSV', 'success');
    }

    loadDisplaySettings() {
        const settings = this.db.getSettings();
        
        document.getElementById('systemLogo').value = settings.systemLogo || '';
        document.getElementById('backgroundImage').value = settings.backgroundImage || '';
        
        this.updateLogoPreview(settings.systemLogo);
        this.updateBackgroundPreview(settings.backgroundImage);
    }

    updateLogoPreview(logoUrl) {
        const logoPreview = document.getElementById('logoPreview');
        if (logoUrl && logoUrl.trim() !== '') {
            logoPreview.src = logoUrl;
            logoPreview.style.display = 'block';
            logoPreview.onerror = () => {
                logoPreview.style.display = 'none';
                this.showNotification('Gagal memuat logo. Pastikan URL benar.', 'warning');
            };
        } else {
            logoPreview.style.display = 'none';
        }
    }

    updateBackgroundPreview(bgUrl) {
        const bgPreview = document.getElementById('backgroundPreview');
        if (bgUrl && bgUrl.trim() !== '') {
            bgPreview.style.backgroundImage = `url('${bgUrl}')`;
            bgPreview.innerHTML = '';
            bgPreview.onerror = () => {
                bgPreview.innerHTML = 'Gagal memuat gambar';
                bgPreview.style.backgroundImage = '';
                this.showNotification('Gagal memuat background. Pastikan URL benar.', 'warning');
            };
        } else {
            bgPreview.style.backgroundImage = '';
            bgPreview.innerHTML = 'Pratinjau akan muncul di sini';
        }
    }

    saveDisplaySettings() {
        const newSettings = {
            systemLogo: document.getElementById('systemLogo').value.trim(),
            backgroundImage: document.getElementById('backgroundImage').value.trim()
        };

        const result = this.db.updateSettings(newSettings);
        this.showNotification(result.message, result.success ? 'success' : 'warning');
        
        // Update preview
        this.updateLogoPreview(newSettings.systemLogo);
        this.updateBackgroundPreview(newSettings.backgroundImage);
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

// Initialize the admin panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
