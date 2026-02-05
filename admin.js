// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.db = database;
        this.initializeEventListeners();
        this.loadSettings();
        this.loadStaffData();
        this.loadHistoryData();
        this.loadDisplaySettings();
        
        // Check if user is admin
        this.checkAdminAccess();
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

        // History filter
        document.getElementById('filterHistoryBtn').addEventListener('click', () => this.loadHistoryData());

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
            max15MinPermissions: parseInt(document.getElementById('max15Min').value),
            max7MinPermissions: parseInt(document.getElementById('max7Min').value),
            loginWindowHours: parseInt(document.getElementById('loginWindow').value),
            adminCode: document.getElementById('adminCode').value
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
                        Tidak ada data staff
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate staff table
        staff.forEach(staffMember => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staffMember.name}</td>
                <td>${staffMember.username}</td>
                <td>${staffMember.jobdesk}</td>
                <td>${staffMember.shiftStart} - ${staffMember.shiftEnd}</td>
                <td>
                    <button class="btn-edit" data-id="${staffMember.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            staffTableBody.appendChild(row);
            
            // Add to filter select
            const option = document.createElement('option');
            option.value = staffMember.id;
            option.textContent = staffMember.name;
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
        document.getElementById('deleteStaffBtn').style.display = 'inline-block';
        
        // Scroll to form
        document.getElementById('staffSection').scrollIntoView({ behavior: 'smooth' });
    }

    saveStaff() {
        const staffId = document.getElementById('editStaffId').value;
        const staffData = {
            name: document.getElementById('staffName').value,
            username: document.getElementById('staffUsername').value,
            jobdesk: document.getElementById('staffJobdesk').value,
            shiftStart: document.getElementById('staffShiftStart').value,
            shiftEnd: document.getElementById('staffShiftEnd').value
        };
        
        // Add password if provided
        const password = document.getElementById('staffPassword').value;
        if (password) {
            staffData.password = password;
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
    }

    deleteStaff() {
        const staffId = document.getElementById('editStaffId').value;
        
        if (!staffId) {
            this.showNotification('Tidak ada staff yang dipilih', 'warning');
            return;
        }
        
        if (confirm('Apakah Anda yakin ingin menghapus staff ini?')) {
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
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        Tidak ada data riwayat izin
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
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startTime.toLocaleDateString('id-ID')}</td>
                <td>${staff ? staff.name : 'Unknown'}</td>
                <td>${record.staffJobdesk}</td>
                <td>${record.type === '15min' ? '15 menit' : 'Makan 7 menit'}</td>
                <td>${record.reason}</td>
                <td>${duration} menit</td>
                <td>
                    <span class="permission-status ${record.status === 'completed' ? 'status-completed' : 'status-active'}">
                        ${record.status === 'completed' ? 'Selesai' : 'Aktif'}
                    </span>
                </td>
            `;
            historyTableBody.appendChild(row);
        });
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
        if (logoUrl) {
            logoPreview.src = logoUrl;
            logoPreview.style.display = 'block';
        } else {
            logoPreview.style.display = 'none';
        }
    }

    updateBackgroundPreview(bgUrl) {
        const bgPreview = document.getElementById('backgroundPreview');
        if (bgUrl) {
            bgPreview.style.backgroundImage = `url('${bgUrl}')`;
            bgPreview.style.display = 'block';
        } else {
            bgPreview.style.display = 'none';
        }
    }

    saveDisplaySettings() {
        const newSettings = {
            systemLogo: document.getElementById('systemLogo').value,
            backgroundImage: document.getElementById('backgroundImage').value
        };

        const result = this.db.updateSettings(newSettings);
        this.showNotification(result.message, result.success ? 'success' : 'warning');
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
