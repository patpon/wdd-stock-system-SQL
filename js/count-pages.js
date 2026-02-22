/**
 * Count Pages - Stock counting for different areas
 * นับสต็อกแยกตามจุด: กาแฟ, บาร์น้ำ, สโตว์, ขาย, เบิกออก
 */

const CountPages = {
    // Current data cache
    currentData: {},

    /**
     * Initialize a count page
     */
    async init(pageType) {
        const dateInput = document.getElementById(`${pageType}Date`);
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        await this.loadData(pageType);
    },

    /**
     * Load data for a specific page type
     */
    async loadData(pageType) {
        const dateInput = document.getElementById(`${pageType}Date`);
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const bodyId = this.getBodyId(pageType);
        const body = document.getElementById(bodyId);

        if (!body) return;

        showLoading();

        // Load products
        const products = await Stock.loadProducts();
        // Load existing daily stock
        const existingStock = await Stock.loadDailyStock(date);

        // Create lookup
        const existingLookup = {};
        existingStock.forEach(s => {
            existingLookup[s.codeProduct] = s;
        });

        // Render table based on page type
        body.innerHTML = products.map(product => {
            const existing = existingLookup[product.codeProduct];
            return this.renderRow(pageType, product, existing);
        }).join('');

        hideLoading();
    },

    /**
     * Get tbody id for page type
     */
    getBodyId(pageType) {
        const mapping = {
            'countCoffee': 'countCoffeeBody',
            'countA': 'countABody',
            'countStore': 'countStoreBody',
            'sales': 'salesBody',
            'withdraw': 'withdrawBody'
        };
        return mapping[pageType];
    },

    /**
     * Render a table row based on page type
     */
    renderRow(pageType, product, existing) {
        const code = product.codeProduct;

        switch (pageType) {
            case 'countCoffee':
                return `
                    <tr data-code="${code}" data-qty-per-pack="${product.qtyPerPack}">
                        <td>${code}</td>
                        <td style="text-align: left;">${product.name}</td>
                        <td><input type="number" class="pack-input" value="${existing?.transferCoffeePack || 0}" min="0"></td>
                        <td><input type="number" class="bottle-input" value="${existing?.transferCoffee || 0}" min="0"></td>
                    </tr>
                `;
            case 'countA':
                return `
                    <tr data-code="${code}" data-qty-per-pack="${product.qtyPerPack}">
                        <td>${code}</td>
                        <td style="text-align: left;">${product.name}</td>
                        <td><input type="number" class="pack-input" value="${existing?.transferAPack || 0}" min="0"></td>
                        <td><input type="number" class="bottle-input" value="${existing?.transferA || 0}" min="0"></td>
                    </tr>
                `;
            case 'countStore':
                return `
                    <tr data-code="${code}" data-qty-per-pack="${product.qtyPerPack}">
                        <td>${code}</td>
                        <td style="text-align: left;">${product.name}</td>
                        <td><input type="number" class="pack-input" value="${existing?.transferStorePack || 0}" min="0"></td>
                        <td><input type="number" class="bottle-input" value="${existing?.transferStore || 0}" min="0"></td>
                    </tr>
                `;
            case 'sales':
                return `
                    <tr data-code="${code}">
                        <td>${code}</td>
                        <td style="text-align: left;">${product.name}</td>
                        <td><input type="number" class="sold-input" value="${existing?.sold || 0}" min="0"></td>
                    </tr>
                `;
            case 'withdraw':
                return `
                    <tr data-code="${code}">
                        <td>${code}</td>
                        <td style="text-align: left;">${product.name}</td>
                        <td><input type="number" class="withdraw-input" value="${existing?.withdraw || 0}" min="0"></td>
                    </tr>
                `;
            default:
                return '';
        }
    },

    /**
     * Save data for a specific page type
     */
    async saveData(pageType) {
        const dateInput = document.getElementById(`${pageType}Date`);
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const bodyId = this.getBodyId(pageType);
        const body = document.getElementById(bodyId);

        if (!body) return;

        showLoading();

        // Collect data from inputs
        const rows = body.querySelectorAll('tr');
        const updates = [];

        rows.forEach(row => {
            const code = parseInt(row.dataset.code);
            const data = this.collectRowData(pageType, row);
            if (data) {
                data.codeProduct = code;
                updates.push(data);
            }
        });

        // Merge with existing data and save
        await this.mergeAndSave(date, pageType, updates);

        hideLoading();
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
    },

    /**
     * Collect data from a row based on page type
     */
    collectRowData(pageType, row) {
        switch (pageType) {
            case 'countCoffee':
                return {
                    transferCoffeePack: parseInt(row.querySelector('.pack-input')?.value) || 0,
                    transferCoffee: parseInt(row.querySelector('.bottle-input')?.value) || 0
                };
            case 'countA':
                return {
                    transferAPack: parseInt(row.querySelector('.pack-input')?.value) || 0,
                    transferA: parseInt(row.querySelector('.bottle-input')?.value) || 0
                };
            case 'countStore':
                return {
                    transferStorePack: parseInt(row.querySelector('.pack-input')?.value) || 0,
                    transferStore: parseInt(row.querySelector('.bottle-input')?.value) || 0
                };
            case 'sales':
                return {
                    sold: parseInt(row.querySelector('.sold-input')?.value) || 0
                };
            case 'withdraw':
                return {
                    withdraw: parseInt(row.querySelector('.withdraw-input')?.value) || 0
                };
            default:
                return null;
        }
    },

    /**
     * Merge updates with existing data and save to database
     */
    async mergeAndSave(date, pageType, updates) {
        // Load existing daily stock first
        const existingStock = await Stock.loadDailyStock(date);
        const products = await Stock.loadProducts();
        const carryForward = await Stock.loadCarryForward(date);

        // Create lookup
        const existingLookup = {};
        existingStock.forEach(s => {
            existingLookup[s.codeProduct] = s;
        });

        // Build final stocks array
        const stocks = products.map(product => {
            const existing = existingLookup[product.codeProduct] || {};
            const update = updates.find(u => u.codeProduct === product.codeProduct) || {};
            const cf = carryForward[product.codeProduct] || { bottles: 0 };

            // Get receive records from localStorage
            const receiveRecord = typeof getReceiveRecord === 'function'
                ? getReceiveRecord(date, product.codeProduct)
                : { pack: 0, bottle: 0 };

            // Merge existing with update
            return {
                codeProduct: product.codeProduct,
                name: product.name,
                carryForward: existing.carryForward || cf.bottles || 0,
                incomingPack: existing.incomingPack || receiveRecord.pack || 0,
                incomingBottle: existing.incomingBottle || receiveRecord.bottle || 0,
                transferCoffeePack: update.transferCoffeePack !== undefined ? update.transferCoffeePack : (existing.transferCoffeePack || 0),
                transferCoffee: update.transferCoffee !== undefined ? update.transferCoffee : (existing.transferCoffee || 0),
                transferAPack: update.transferAPack !== undefined ? update.transferAPack : (existing.transferAPack || 0),
                transferA: update.transferA !== undefined ? update.transferA : (existing.transferA || 0),
                transferStorePack: update.transferStorePack !== undefined ? update.transferStorePack : (existing.transferStorePack || 0),
                transferStore: update.transferStore !== undefined ? update.transferStore : (existing.transferStore || 0),
                withdraw: update.withdraw !== undefined ? update.withdraw : (existing.withdraw || 0),
                sold: update.sold !== undefined ? update.sold : (existing.sold || 0)
            };
        });

        // Save to API
        const user = Auth.currentUser?.username || 'unknown';
        const result = await SheetsAPI.post('saveDailyStock', {
            date: date,
            stocks: stocks,
            user: user
        });

        if (!result.success) {
            showToast('เกิดข้อผิดพลาด: ' + (result.error || 'Unknown error'), 'error');
        }

        return result;
    }
};

// Setup event listeners for count pages
document.addEventListener('DOMContentLoaded', () => {
    // Count Coffee
    document.getElementById('loadCountCoffeeBtn')?.addEventListener('click', () => CountPages.loadData('countCoffee'));
    document.getElementById('saveCountCoffeeBtn')?.addEventListener('click', () => CountPages.saveData('countCoffee'));
    document.getElementById('countCoffeeDate')?.addEventListener('change', () => CountPages.loadData('countCoffee'));

    // Count A
    document.getElementById('loadCountABtn')?.addEventListener('click', () => CountPages.loadData('countA'));
    document.getElementById('saveCountABtn')?.addEventListener('click', () => CountPages.saveData('countA'));
    document.getElementById('countADate')?.addEventListener('change', () => CountPages.loadData('countA'));

    // Count Store
    document.getElementById('loadCountStoreBtn')?.addEventListener('click', () => CountPages.loadData('countStore'));
    document.getElementById('saveCountStoreBtn')?.addEventListener('click', () => CountPages.saveData('countStore'));
    document.getElementById('countStoreDate')?.addEventListener('change', () => CountPages.loadData('countStore'));

    // Sales
    document.getElementById('loadSalesBtn')?.addEventListener('click', () => CountPages.loadData('sales'));
    document.getElementById('saveSalesBtn')?.addEventListener('click', () => CountPages.saveData('sales'));
    document.getElementById('salesDate')?.addEventListener('change', () => CountPages.loadData('sales'));

    // Withdraw
    document.getElementById('loadWithdrawBtn')?.addEventListener('click', () => CountPages.loadData('withdraw'));
    document.getElementById('saveWithdrawBtn')?.addEventListener('click', () => CountPages.saveData('withdraw'));
    document.getElementById('withdrawDate')?.addEventListener('change', () => CountPages.loadData('withdraw'));

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    ['countCoffeeDate', 'countADate', 'countStoreDate', 'salesDate', 'withdrawDate'].forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.value) {
            input.value = today;
        }
    });
});
