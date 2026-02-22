/**
 * Google Sheets API Integration
 * การเชื่อมต่อกับ Google Apps Script
 */

const SheetsAPI = {
    /**
     * Get the base path of the current page (for relative API calls)
     */
    getBasePath() {
        const path = window.location.pathname;
        // Remove the filename (e.g., index.html) to get the directory
        return path.substring(0, path.lastIndexOf('/') + 1);
    },

    /**
     * Make GET request to API (PHP or GAS)
     */
    async get(action, params = {}) {
        if (!isOnlineMode()) {
            return this.handleOfflineGet(action, params);
        }

        // Use PHP API if configured
        let apiUrl;
        if (CONFIG.USE_PHP_API) {
            // Build URL relative to current page location
            apiUrl = window.location.origin + this.getBasePath() + CONFIG.API_URL;
        } else {
            apiUrl = CONFIG.GAS_URL;
        }

        const url = new URL(apiUrl);
        url.searchParams.append('action', action);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

            const response = await fetch(url.toString(), {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Make POST request to API (PHP or GAS)
     */
    async post(action, data = {}) {
        if (!isOnlineMode()) {
            return this.handleOfflinePost(action, data);
        }

        // Use PHP API if configured
        let apiUrl;
        if (CONFIG.USE_PHP_API) {
            // Build URL relative to current page location
            apiUrl = window.location.origin + this.getBasePath() + CONFIG.API_URL;
        } else {
            apiUrl = CONFIG.GAS_URL;
        }
        const url = new URL(apiUrl);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': CONFIG.USE_PHP_API ? 'application/json' : 'text/plain'
                },
                body: JSON.stringify({ action, ...data }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Handle offline GET requests (demo mode)
     */
    handleOfflineGet(action, params) {
        console.log('Offline mode - GET:', action, params);

        switch (action) {
            case 'getProducts':
                return { success: true, products: CONFIG.DEFAULT_PRODUCTS };

            case 'getDailyStock':
                return {
                    success: true,
                    stocks: this.getLocalDailyStock(params.date)
                };

            case 'getCarryForward':
                return {
                    success: true,
                    carryForward: this.getLocalCarryForward(params.date)
                };

            case 'getShortages':
                return {
                    success: true,
                    shortages: this.getLocalShortages(params.date)
                };

            case 'getSummary':
                return {
                    success: true,
                    summary: this.getLocalSummary(params.month, params.year)
                };

            default:
                return { success: false, error: 'Unknown action' };
        }
    },

    /**
     * Handle offline POST requests (demo mode)
     */
    handleOfflinePost(action, data) {
        console.log('Offline mode - POST:', action, data);

        switch (action) {
            case 'login':
                return this.offlineLogin(data.username, data.password);

            case 'saveDailyStock':
                return this.saveLocalDailyStock(data.date, data.stocks);

            case 'addProduct':
                return this.addLocalProduct(data.product);

            case 'updateProduct':
                return this.updateLocalProduct(data.product);

            case 'deleteProduct':
                return this.deleteLocalProduct(data.codeProduct);

            case 'addUser':
                return { success: true, message: 'เพิ่มผู้ใช้สำเร็จ (Demo Mode)' };

            case 'sendLineNotify':
                console.log('LINE Notify (Demo):', data.message);
                return { success: true, message: 'ส่งข้อความ LINE สำเร็จ (Demo Mode)' };

            case 'sendShortageReport':
                console.log('Shortage Report (Demo):', data.date);
                return { success: true, message: 'ส่งรายงาน LINE สำเร็จ (Demo Mode)' };

            default:
                return { success: false, error: 'Unknown action' };
        }
    },

    /**
     * Offline login
     */
    offlineLogin(username, password) {
        const user = CONFIG.DEFAULT_USERS.find(
            u => u.username === username && u.password === password
        );

        if (user) {
            return {
                success: true,
                user: {
                    username: user.username,
                    role: user.role,
                    name: user.name
                }
            };
        }

        return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    },

    /**
     * Get local daily stock data
     */
    getLocalDailyStock(date) {
        const key = `dailyStock_${date}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Save local daily stock data
     */
    saveLocalDailyStock(date, stocks) {
        const key = `dailyStock_${date}`;
        localStorage.setItem(key, JSON.stringify(stocks));
        return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
    },

    /**
     * Get carry forward from previous day
     */
    getLocalCarryForward(date) {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        const stocks = this.getLocalDailyStock(prevDateStr);
        const carryForward = {};

        stocks.forEach(stock => {
            carryForward[stock.codeProduct] = {
                pack: stock.actualCountPack || 0,
                bottle: stock.actualCountBottle || 0
            };
        });

        return carryForward;
    },

    /**
     * Get shortages from local data
     */
    getLocalShortages(date) {
        const stocks = this.getLocalDailyStock(date);
        return stocks.filter(s => s.variance !== 0).map(s => ({
            codeProduct: s.codeProduct,
            name: s.name,
            variance: s.variance
        }));
    },

    /**
     * Get monthly summary from local data
     */
    getLocalSummary(month, year) {
        const summary = {};
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const stocks = this.getLocalDailyStock(dateStr);

            stocks.forEach(stock => {
                if (!summary[stock.codeProduct]) {
                    summary[stock.codeProduct] = {
                        name: stock.name,
                        days: {}
                    };
                }
                summary[stock.codeProduct].days[day] = {
                    variance: stock.variance || 0
                };
            });
        }

        return summary;
    },

    /**
     * Get local products
     */
    getLocalProducts() {
        const stored = localStorage.getItem('products');
        return stored ? JSON.parse(stored) : CONFIG.DEFAULT_PRODUCTS;
    },

    /**
     * Add local product
     */
    addLocalProduct(product) {
        const products = this.getLocalProducts();
        products.push(product);
        localStorage.setItem('products', JSON.stringify(products));
        return { success: true, message: 'เพิ่มสินค้าสำเร็จ' };
    },

    /**
     * Update local product
     */
    updateLocalProduct(product) {
        const products = this.getLocalProducts();
        const index = products.findIndex(p => p.codeProduct === product.codeProduct);
        if (index !== -1) {
            products[index] = product;
            localStorage.setItem('products', JSON.stringify(products));
            return { success: true, message: 'แก้ไขสินค้าสำเร็จ' };
        }
        return { success: false, error: 'ไม่พบสินค้า' };
    },

    /**
     * Delete local product
     */
    deleteLocalProduct(codeProduct) {
        const products = this.getLocalProducts();
        const filtered = products.filter(p => p.codeProduct !== codeProduct);
        localStorage.setItem('products', JSON.stringify(filtered));
        return { success: true, message: 'ลบสินค้าสำเร็จ' };
    },

    /**
     * Test connection to API (PHP or GAS)
     */
    async testConnection() {
        if (!isOnlineMode()) {
            return { success: true, message: 'Demo Mode - ไม่ได้เชื่อมต่อ Database' };
        }

        try {
            const result = await this.get('getProducts');
            if (result.success) {
                const dbType = CONFIG.USE_PHP_API ? 'MySQL' : 'Google Sheets';
                return { success: true, message: `เชื่อมต่อ ${dbType} สำเร็จ!` };
            } else {
                return { success: false, error: result.error || 'การเชื่อมต่อล้มเหลว' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
