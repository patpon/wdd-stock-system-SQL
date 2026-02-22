/**
 * Configuration - Bar Stock Management System
 * ตั้งค่าระบบ
 */

const CONFIG = {
    // PHP API URL (relative path - สำหรับ MySQL backend)
    API_URL: localStorage.getItem('apiUrl') || 'api/api.php',

    // Google Apps Script URL (legacy - ไว้ใช้ถ้าต้องการกลับไปใช้ Google Sheets)
    GAS_URL: localStorage.getItem('gasUrl') || '',

    // Use PHP API instead of Google Apps Script
    USE_PHP_API: true,

    // Local Storage Keys
    STORAGE_KEYS: {
        USER: 'barstock_user',
        GAS_URL: 'gasUrl',
        LINE_CHANNEL_TOKEN: 'lineChannelToken',
        LINE_TARGET_ID: 'lineTargetId',
        RESTAURANT_NAME: 'restaurantName'
    },

    // API Timeout (ms)
    API_TIMEOUT: 30000,

    // Date Format
    DATE_FORMAT: 'th-TH',

    // Default Products (for offline/demo mode)
    DEFAULT_PRODUCTS: [
        { codeProduct: 1, name: 'SO', qtyPerPack: 24, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 120, category: 'บาร์น้ำ' },
        { codeProduct: 2, name: 'PO', qtyPerPack: 12, packUnit: 'แพ็ค', sellUnit: 'ขวด', minQty: 120, category: 'บาร์น้ำ' },
        { codeProduct: 3, name: 'COL', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 4, name: 'BS', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 5, name: 'BL', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 6, name: 'BC', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 7, name: 'BC250', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 8, name: 'BH', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 9, name: 'Bfed', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 12, category: 'บาร์น้ำ' },
        { codeProduct: 10, name: 'Co', qtyPerPack: 24, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 11, name: 'Spy Red', qtyPerPack: 24, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 12, name: 'Spy Classic', qtyPerPack: 24, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 13, name: 'Re กลม', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 14, name: 'Re แบน', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 15, name: 'เหล้า 100', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 16, name: 'Red', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 17, name: 'Black', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 18, name: '285 ดำ', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 19, name: '285 ทอง', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' },
        { codeProduct: 20, name: 'หงส์', qtyPerPack: 12, packUnit: 'ลัง', sellUnit: 'ขวด', minQty: 60, category: 'บาร์น้ำ' }
    ],

    // Default Users (for demo mode)
    DEFAULT_USERS: [
        { username: 'admin', password: 'admin123', role: 'admin', name: 'ผู้ดูแลระบบ' },
        { username: 'user', password: 'user123', role: 'user', name: 'พนักงาน' }
    ]
};

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Helper function to format date for display
function formatDateThai(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

// Check if online mode is available (PHP API or Google Apps Script)
function isOnlineMode() {
    // If using PHP API, always return true (API is local)
    if (CONFIG.USE_PHP_API) {
        return true;
    }
    // Legacy: check for Google Apps Script URL
    return CONFIG.GAS_URL && CONFIG.GAS_URL.length > 0;
}
