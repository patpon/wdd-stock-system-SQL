/**
 * Stock Management Module
 * ระบบจัดการสต็อก
 */

const Stock = {
    products: [],
    dailyStocks: [],
    carryForward: {},

    /**
     * Load products from API
     */
    async loadProducts() {
        const result = await SheetsAPI.get('getProducts');
        if (result.success) {
            this.products = result.products;
        } else {
            // Fallback to local products
            this.products = SheetsAPI.getLocalProducts();
        }
        return this.products;
    },

    /**
     * Get product by code
     */
    getProduct(codeProduct) {
        return this.products.find(p => p.codeProduct == codeProduct);
    },

    /**
     * Load carry forward for a date
     */
    async loadCarryForward(date) {
        const result = await SheetsAPI.get('getCarryForward', { date });
        if (result.success) {
            this.carryForward = result.carryForward;
        }
        return this.carryForward;
    },

    /**
     * Load daily stock for a date
     */
    async loadDailyStock(date) {
        const result = await SheetsAPI.get('getDailyStock', { date });
        if (result.success) {
            this.dailyStocks = result.stocks;
        }
        return this.dailyStocks;
    },

    /**
     * Save daily stock
     */
    async saveDailyStock(date, stocks, user) {
        return await SheetsAPI.post('saveDailyStock', { date, stocks, user });
    },

    /**
     * Calculate variance
     */
    calculateVariance(stock, product) {
        const qtyPerPack = product ? product.qtyPerPack : 12;

        // Calculate expected bottles
        const openingBottles = (stock.carryForwardPack || 0) * qtyPerPack + (stock.carryForwardBottle || 0);
        const incomingBottles = (stock.incomingPack || 0) * qtyPerPack + (stock.incomingBottle || 0);
        const expectedBottles = openingBottles + incomingBottles - (stock.withdraw || 0) - (stock.sold || 0);

        // Calculate actual bottles
        const actualBottles = (stock.actualCountPack || 0) * qtyPerPack + (stock.actualCountBottle || 0);

        // Variance = Actual - Expected
        return actualBottles - expectedBottles;
    },

    /**
     * Get shortages for a date
     */
    async getShortages(date) {
        const result = await SheetsAPI.get('getShortages', { date });
        return result.success ? result.shortages : [];
    },

    /**
     * Send shortage report via LINE
     */
    async sendShortageReport(date) {
        return await SheetsAPI.post('sendShortageReport', { date });
    },

    /**
     * Get monthly summary
     */
    async getMonthlySummary(month, year) {
        const result = await SheetsAPI.get('getSummary', { month, year });
        return result.success ? result.summary : {};
    },

    /**
     * Add new product
     */
    async addProduct(product) {
        const result = await SheetsAPI.post('addProduct', { product });
        if (result.success) {
            await this.loadProducts();
        }
        return result;
    },

    /**
     * Update product
     */
    async updateProduct(product) {
        const result = await SheetsAPI.post('updateProduct', { product });
        if (result.success) {
            await this.loadProducts();
        }
        return result;
    },

    /**
     * Delete product
     */
    async deleteProduct(codeProduct) {
        const result = await SheetsAPI.post('deleteProduct', { codeProduct });
        if (result.success) {
            await this.loadProducts();
        }
        return result;
    },

    /**
     * Generate PDF report (client-side)
     */
    async generatePDF(date, stocks) {
        // Get restaurant name
        const restaurantName = localStorage.getItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME) || 'Bar Stock System';

        // Create printable content
        const printWindow = window.open('', '_blank');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>รายงานสต็อก - ${date}</title>
    <style>
        body { 
            font-family: 'Prompt', 'TH Sarabun New', sans-serif; 
            padding: 20px;
            background: white;
            color: black;
        }
        h1 { text-align: center; margin-bottom: 10px; }
        h2 { text-align: center; color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        th { background: #0f3460; color: white; }
        .shortage { background: #ffebee; color: #c62828; font-weight: bold; }
        .overage { background: #e8f5e9; color: #2e7d32; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>📊 รายงานสต็อก - ${restaurantName}</h1>
    <h2>วันที่: ${formatDateThai(date)}</h2>
    
    <table>
        <thead>
            <tr>
                <th>รหัส</th>
                <th>ชื่อสินค้า</th>
                <th>ยกมา (ลัง/ขวด)</th>
                <th>รับเข้า (ลัง/ขวด)</th>
                <th>เบิก</th>
                <th>ขาย</th>
                <th>นับจริง (ลัง/ขวด)</th>
                <th>ขาด/เกิน</th>
            </tr>
        </thead>
        <tbody>
            ${stocks.map(s => `
                <tr>
                    <td>${s.codeProduct || '-'}</td>
                    <td>${s.name || '-'}</td>
                    <td>${s.carryForwardPack ?? 0}/${s.carryForwardBottle ?? 0}</td>
                    <td>${s.incomingPack ?? 0}/${s.incomingBottle ?? 0}</td>
                    <td>${s.withdraw ?? 0}</td>
                    <td>${s.sold ?? 0}</td>
                    <td>${s.actualCountPack ?? 0}/${s.actualCountBottle ?? 0}</td>
                    <td class="${(s.variance || 0) < 0 ? 'shortage' : ((s.variance || 0) > 0 ? 'overage' : '')}">${s.variance ?? 0}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>สร้างโดย: ${restaurantName}</p>
        <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">
            🖨️ พิมพ์ / บันทึก PDF
        </button>
    </div>
</body>
</html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }
};
