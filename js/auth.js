/**
 * Authentication Module
 * ระบบยืนยันตัวตน
 */

const Auth = {
    currentUser: null,

    /**
     * Initialize auth - check if user is logged in
     */
    init() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        if (stored) {
            this.currentUser = JSON.parse(stored);
            return true;
        }
        return false;
    },

    /**
     * Login
     */
    async login(username, password) {
        const result = await SheetsAPI.post('login', { username, password });

        if (result.success) {
            this.currentUser = result.user;
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(result.user));
        }

        return result;
    },

    /**
     * Logout
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }
};
