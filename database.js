// Database simulasi menggunakan localStorage
class StaffPermissionDatabase {
    constructor() {
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Inisialisasi data jika belum ada
        if (!localStorage.getItem('staffPermissionSystem')) {
            const initialData = {
                // User admin default
                adminUser: {
                    username: 'csline',
                    password: 'aa1234',
                    isAdmin: true
                },
                
                // Daftar staff default
                staff: [
                    {
                        id: 1,
                        username: 'staff1',
                        password: 'staff123',
                        name: 'Andi Wijaya',
                        jobdesk: 'Customer Service',
                        shiftStart: '02:00',
                        shiftEnd: '12:00',
                        permissionsToday: {
                            '15min': 0,
                            '7min': 0
                        },
                        lastResetDate: this.getTodayDate()
                    },
                    {
                        id: 2,
                        username: 'staff2',
                        password: 'staff123',
                        name: 'Siti Rahayu',
                        jobdesk: 'Admin',
                        shiftStart: '02:00',
                        shiftEnd: '12:00',
                        permissionsToday: {
                            '15min': 0,
                            '7min': 0
                        },
                        lastResetDate: this.getTodayDate()
                    },
                    {
                        id: 3,
                        username: 'staff3',
                        password: 'staff123',
                        name: 'Budi Santoso',
                        jobdesk: 'Marketing',
                        shiftStart: '10:00',
                        shiftEnd: '18:00',
                        permissionsToday: {
                            '15min': 0,
                            '7min': 0
                        },
                        lastResetDate: this.getTodayDate()
                    }
                ],
                
                // Pengaturan sistem
                settings: {
                    max15MinPermissions: 4,
                    max7MinPermissions: 3,
                    loginWindowHours: 2,
                    systemLogo: 'https://cdn-icons-png.flaticon.com/512/869/869869.png',
                    backgroundImage: '',
                    adminCode: 'ADMIN123'
                },
                
                // Riwayat izin
                permissionsHistory: [],
                
                // Izin aktif
                activePermissions: []
            };
            
            localStorage.setItem('staffPermissionSystem', JSON.stringify(initialData));
        }
    }

    getDatabase() {
        return JSON.parse(localStorage.getItem('staffPermissionSystem'));
    }

    updateDatabase(data) {
        localStorage.setItem('staffPermissionSystem', JSON.stringify(data));
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    // User operations
    validateLogin(username, password) {
        const db = this.getDatabase();
        
        // Cek admin user
        if (username === db.adminUser.username && password === db.adminUser.password) {
            return {
                success: true,
                user: { 
                    ...db.adminUser, 
                    name: 'Administrator',
                    id: 0,
                    isAdmin: true
                },
                isAdmin: true
            };
        }
        
        // Cek staff user
        const staff = db.staff.find(s => 
            s.username === username && s.password === password
        );
        
        if (staff) {
            // Reset quota jika hari berbeda
            const today = this.getTodayDate();
            if (staff.lastResetDate !== today) {
                staff.permissionsToday = { '15min': 0, '7min': 0 };
                staff.lastResetDate = today;
                this.updateDatabase(db);
            }
            
            return {
                success: true,
                user: staff,
                isAdmin: false
            };
        }
        
        return { success: false, message: 'Username atau password salah' };
    }

    // Permission operations
    requestPermission(staffId, permissionType, reason) {
        const db = this.getDatabase();
        const staff = db.staff.find(s => s.id === staffId);
        
        if (!staff) {
            return { success: false, message: 'Staff tidak ditemukan' };
        }
        
        // Cek apakah staff sudah memiliki izin aktif
        const hasActivePermission = db.activePermissions.some(ap => ap.staffId === staffId);
        if (hasActivePermission) {
            return { 
                success: false, 
                message: 'Anda sudah memiliki izin aktif' 
            };
        }
        
        // Cek apakah staff sudah memiliki izin aktif dengan jobdesk yang sama
        const activeWithSameJobdesk = db.activePermissions.find(ap => {
            const staffMember = db.staff.find(s => s.id === ap.staffId);
            return staffMember && staffMember.jobdesk === staff.jobdesk;
        });
        
        if (activeWithSameJobdesk) {
            return { 
                success: false, 
                message: `Tidak dapat izin karena ada staff dengan jobdesk ${staff.jobdesk} yang sedang izin` 
            };
        }
        
        // Cek kuota
        const maxPermission = permissionType === '15min' ? 
            db.settings.max15MinPermissions : db.settings.max7MinPermissions;
        
        const usedPermissions = staff.permissionsToday[permissionType] || 0;
        if (usedPermissions >= maxPermission) {
            return { 
                success: false, 
                message: `Kuota izin ${permissionType === '15min' ? '15 menit' : '7 menit'} sudah habis` 
            };
        }
        
        // Tambah izin aktif
        const permission = {
            id: Date.now(),
            staffId: staffId,
            staffName: staff.name,
            staffJobdesk: staff.jobdesk,
            type: permissionType,
            reason: reason,
            startTime: new Date().toISOString(),
            duration: permissionType === '15min' ? 15 : 7,
            status: 'active'
        };
        
        db.activePermissions.push(permission);
        
        // Update kuota staff
        staff.permissionsToday[permissionType] = (staff.permissionsToday[permissionType] || 0) + 1;
        
        // Tambah ke riwayat
        db.permissionsHistory.push({
            ...permission,
            endTime: null
        });
        
        this.updateDatabase(db);
        
        return { 
            success: true, 
            permission: permission,
            message: 'Izin berhasil diajukan'
        };
    }

    endPermission(permissionId) {
        const db = this.getDatabase();
        const permissionIndex = db.activePermissions.findIndex(p => p.id === permissionId);
        
        if (permissionIndex === -1) {
            return { success: false, message: 'Izin tidak ditemukan' };
        }
        
        const permission = db.activePermissions[permissionIndex];
        permission.status = 'completed';
        permission.endTime = new Date().toISOString();
        
        // Update di riwayat
        const historyIndex = db.permissionsHistory.findIndex(h => h.id === permissionId);
        if (historyIndex !== -1) {
            db.permissionsHistory[historyIndex] = { ...permission };
        }
        
        // Hapus dari izin aktif
        db.activePermissions.splice(permissionIndex, 1);
        
        this.updateDatabase(db);
        
        return { 
            success: true, 
            message: 'Izin telah selesai'
        };
    }

    // Check for expired permissions
    checkExpiredPermissions() {
        const db = this.getDatabase();
        const now = new Date();
        let expiredFound = false;
        
        db.activePermissions.forEach(permission => {
            const startTime = new Date(permission.startTime);
            const endTime = new Date(startTime.getTime() + permission.duration * 60000);
            
            if (now > endTime) {
                permission.status = 'expired';
                permission.endTime = endTime.toISOString();
                expiredFound = true;
            }
        });
        
        // Hapus izin yang sudah expired dari active
        db.activePermissions = db.activePermissions.filter(p => p.status === 'active');
        
        if (expiredFound) {
            this.updateDatabase(db);
        }
    }

    // Get data methods
    getActivePermissions() {
        const db = this.getDatabase();
        return db.activePermissions;
    }

    getStaffHistory(staffId) {
        const db = this.getDatabase();
        return db.permissionsHistory
            .filter(h => h.staffId === staffId)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 10);
    }

    getAllStaff() {
        const db = this.getDatabase();
        return db.staff;
    }

    getSettings() {
        const db = this.getDatabase();
        return db.settings;
    }

    // Update settings (admin only)
    updateSettings(newSettings) {
        const db = this.getDatabase();
        db.settings = { ...db.settings, ...newSettings };
        this.updateDatabase(db);
        return { success: true, message: 'Pengaturan berhasil diperbarui' };
    }

    // Staff management (admin only)
    addStaff(staffData) {
        const db = this.getDatabase();
        const newId = Math.max(...db.staff.map(s => s.id), 0) + 1;
        
        const newStaff = {
            id: newId,
            username: staffData.username || `staff${newId}`,
            password: staffData.password || 'staff123',
            name: staffData.name || `Staff ${newId}`,
            jobdesk: staffData.jobdesk || 'Staff',
            shiftStart: staffData.shiftStart || '08:00',
            shiftEnd: staffData.shiftEnd || '16:00',
            permissionsToday: { '15min': 0, '7min': 0 },
            lastResetDate: this.getTodayDate()
        };
        
        db.staff.push(newStaff);
        this.updateDatabase(db);
        
        return { success: true, message: 'Staff berhasil ditambahkan', staff: newStaff };
    }

    updateStaff(staffId, staffData) {
        const db = this.getDatabase();
        const staffIndex = db.staff.findIndex(s => s.id === staffId);
        
        if (staffIndex === -1) {
            return { success: false, message: 'Staff tidak ditemukan' };
        }
        
        // Update hanya field yang diberikan
        const updatedStaff = { ...db.staff[staffIndex] };
        
        if (staffData.name) updatedStaff.name = staffData.name;
        if (staffData.username) updatedStaff.username = staffData.username;
        if (staffData.password) updatedStaff.password = staffData.password;
        if (staffData.jobdesk) updatedStaff.jobdesk = staffData.jobdesk;
        if (staffData.shiftStart) updatedStaff.shiftStart = staffData.shiftStart;
        if (staffData.shiftEnd) updatedStaff.shiftEnd = staffData.shiftEnd;
        
        db.staff[staffIndex] = updatedStaff;
        this.updateDatabase(db);
        
        return { success: true, message: 'Staff berhasil diperbarui' };
    }

    deleteStaff(staffId) {
        const db = this.getDatabase();
        const initialLength = db.staff.length;
        
        // Jangan hapus staff yang masih memiliki izin aktif
        const hasActivePermission = db.activePermissions.some(ap => ap.staffId === staffId);
        if (hasActivePermission) {
            return { success: false, message: 'Tidak dapat menghapus staff yang sedang izin' };
        }
        
        db.staff = db.staff.filter(s => s.id !== staffId);
        
        if (db.staff.length < initialLength) {
            this.updateDatabase(db);
            return { success: true, message: 'Staff berhasil dihapus' };
        }
        
        return { success: false, message: 'Staff tidak ditemukan' };
    }
}

// Initialize database instance
const database = new StaffPermissionDatabase();


