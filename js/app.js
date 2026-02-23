/**
 * Main Application - Bar Stock Management System
 * ระบบจัดการสต็อกบาร์น้ำ
 */

// ==================== DOM ELEMENTS ====================
const elements = {
    // Modals
    loginModal: document.getElementById('loginModal'),
    productModal: document.getElementById('productModal'),
    userModal: document.getElementById('userModal'),

    // Forms
    loginForm: document.getElementById('loginForm'),
    productForm: document.getElementById('productForm'),
    userForm: document.getElementById('userForm'),
    receiveForm: document.getElementById('receiveForm'),

    // Login
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    loginError: document.getElementById('loginError'),

    // App Container
    appContainer: document.getElementById('appContainer'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.querySelector('.sidebar'),

    // Header
    pageTitle: document.getElementById('pageTitle'),
    currentDate: document.getElementById('currentDate'),
    currentUserName: document.getElementById('currentUserName'),
    currentUserRole: document.getElementById('currentUserRole'),

    // Toast & Loading
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Dashboard
    totalProducts: document.getElementById('totalProducts'),
    inStockCount: document.getElementById('inStockCount'),
    lowStockCount: document.getElementById('lowStockCount'),
    shortageCount: document.getElementById('shortageCount'),
    shortageList: document.getElementById('shortageList'),

    // Daily Stock
    stockDate: document.getElementById('stockDate'),
    dailyStockBody: document.getElementById('dailyStockBody'),

    // Receive
    receiveProduct: document.getElementById('receiveProduct'),

    // Products
    productsBody: document.getElementById('productsBody'),

    // Reports
    reportMonth: document.getElementById('reportMonth'),
    reportYear: document.getElementById('reportYear'),
    summaryHeader: document.getElementById('summaryHeader'),
    summaryBody: document.getElementById('summaryBody'),

    // Settings
    gasUrl: document.getElementById('gasUrl'),
    lineChannelToken: document.getElementById('lineChannelToken'),
    lineTargetId: document.getElementById('lineTargetId'),
    restaurantName: document.getElementById('restaurantName')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    if (Auth.init()) {
        showApp();
        await initializeApp();
    } else {
        showLogin();
    }

    // Set current date
    elements.currentDate.textContent = formatDateThai(getTodayDate());
    elements.stockDate.value = getTodayDate();

    // Set report month/year defaults
    const today = new Date();
    elements.reportMonth.value = today.getMonth() + 1;
    elements.reportYear.value = today.getFullYear();

    // Load settings
    loadSettings();

    // Display restaurant name on login page
    const restaurantName = localStorage.getItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME) || 'ร้านวันดีดี คาเฟ่ เรสเตอร์รองต์';
    const loginRestaurantNameEl = document.getElementById('loginRestaurantName');
    if (loginRestaurantNameEl && restaurantName) {
        loginRestaurantNameEl.textContent = restaurantName;
    }

    // Setup event listeners
    setupEventListeners();
});

// ==================== APP INITIALIZATION ====================
async function initializeApp() {
    showLoading();

    try {
        // Load products
        await Stock.loadProducts();

        // Update user info
        const user = Auth.getUser();
        if (user) {
            if (elements.currentUserName) elements.currentUserName.textContent = user.name;
            if (elements.currentUserRole) elements.currentUserRole.textContent = user.role;

            // Show/hide admin menus
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = Auth.isAdmin() ? 'flex' : 'none';
            });

            // Apply permissions-based menu visibility (for non-admin users)
            if (!Auth.isAdmin()) {
                document.querySelectorAll('.nav-item[data-page]').forEach(el => {
                    const page = el.dataset.page;
                    // Skip admin-only pages (already handled above)
                    if (el.classList.contains('admin-only')) return;
                    // Check permission
                    el.style.display = hasPermission(page) ? 'flex' : 'none';
                });

                // Redirect to first allowed page if no dashboard permission
                if (!hasPermission('dashboard')) {
                    const userPermissions = user.permissions || [];
                    if (userPermissions.length > 0) {
                        navigateToPage(userPermissions[0]);
                    }
                } else {
                    // Has dashboard permission, load dashboard
                    await updateDashboard();
                }
            } else {
                // Admin - load dashboard
                await updateDashboard();
            }
        } else {
            // No user - load dashboard anyway
            await updateDashboard();
        }

        // Populate product dropdowns
        populateProductDropdowns();

        // Load products table
        renderProductsTable();

        // Load settings from server (async, don't block)
        loadSettings();

        // Auto-migrate localStorage receives to server (one-time)
        migrateLocalReceivesToServer();

    } catch (error) {
        console.error('Init error:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login form
    elements.loginForm.addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });

    // Mobile menu toggle
    elements.menuToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });

    // Collapse sidebar toggle
    const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
    if (collapseSidebarBtn) {
        // Restore collapsed state from localStorage
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            elements.sidebar.classList.add('collapsed');
            elements.appContainer.classList.add('sidebar-collapsed');
        }

        collapseSidebarBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('collapsed');
            elements.appContainer.classList.toggle('sidebar-collapsed');

            // Save state to localStorage
            const nowCollapsed = elements.sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', nowCollapsed);
        });
    }

    // Theme toggle
    const toggleThemeBtn = document.getElementById('toggleThemeBtn');
    if (toggleThemeBtn) {
        // Restore theme from localStorage
        const savedTheme = localStorage.getItem('bar_stock_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);

        toggleThemeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('bar_stock_theme', next);
            updateThemeButton(next);
        });
    }

    // Quick action buttons
    document.querySelectorAll('.quick-action-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateToPage(btn.dataset.page);
        });
    });

    // Daily Stock
    document.getElementById('loadStockBtn').addEventListener('click', loadDailyStock);
    document.getElementById('saveStockBtn').addEventListener('click', saveDailyStock);
    document.getElementById('stockDate')?.addEventListener('change', loadDailyStock);

    // Receive Form
    elements.receiveForm.addEventListener('submit', handleReceive);
    document.getElementById('loadReceiveBtn')?.addEventListener('click', renderRecentReceives);
    document.getElementById('receiveDate')?.addEventListener('change', renderRecentReceives);
    document.getElementById('receiveCancelBtn')?.addEventListener('click', cancelReceiveEdit);
    document.getElementById('loadReportBtn').addEventListener('click', loadMonthlySummary);
    document.getElementById('exportReportBtn').addEventListener('click', exportReportPDF);

    // Products
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openProductModal();
    });
    elements.productForm.addEventListener('submit', handleProductSubmit);
    document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);

    // Users
    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
    elements.userForm.addEventListener('submit', handleUserSubmit);
    document.getElementById('closeUserModal').addEventListener('click', () => {
        elements.userModal.classList.remove('active');
        document.getElementById('newUsername').disabled = false;
    });
    document.getElementById('cancelUserBtn').addEventListener('click', () => {
        elements.userModal.classList.remove('active');
        document.getElementById('newUsername').disabled = false;
    });

    // Settings
    document.getElementById('saveGasUrl').addEventListener('click', saveGasUrl);
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('saveLineToken').addEventListener('click', saveLineToken);
    document.getElementById('testLineNotify').addEventListener('click', testLineNotify);
    document.getElementById('saveRestaurantInfo').addEventListener('click', saveRestaurantInfo);
    document.getElementById('addHolidayBtn')?.addEventListener('click', addHoliday);

    // Dashboard actions
    document.getElementById('loadDashboardBtn')?.addEventListener('click', updateDashboard);
    document.getElementById('dashboardDate')?.addEventListener('change', updateDashboard);
    document.getElementById('sendLineBtn').addEventListener('click', sendLineShortageReport);
    document.getElementById('exportPdfBtn').addEventListener('click', exportDailyPDF);

    // Print Daily Stock
    document.getElementById('printDailyStockBtn')?.addEventListener('click', printDailyStock);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// ==================== THEME ====================
function updateThemeButton(theme) {
    const icon = document.querySelector('#toggleThemeBtn .theme-icon');
    const text = document.querySelector('#toggleThemeBtn .theme-text');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (text) text.textContent = theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด';
}

// ==================== AUTHENTICATION ====================
async function handleLogin(e) {
    e.preventDefault();

    const username = elements.username.value.trim();
    const password = elements.password.value;

    showLoading();

    const result = await Auth.login(username, password);

    hideLoading();

    if (result.success) {
        elements.loginError.classList.remove('show');
        showApp();
        await initializeApp();
    } else {
        elements.loginError.textContent = result.error;
        elements.loginError.classList.add('show');
    }
}

function handleLogout() {
    Auth.logout();
    showLogin();
    elements.loginForm.reset();
}

function showLogin() {
    elements.loginModal.classList.add('active');
    elements.appContainer.classList.add('hidden');
}

function showApp() {
    elements.loginModal.classList.remove('active');
    elements.appContainer.classList.remove('hidden');
}

// ==================== NAVIGATION ====================
function navigateToPage(pageId) {
    // Update nav items
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });

    // Show page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageId}Page`).classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        daily: 'บันทึกประจำวัน',
        receive: 'รับเข้าสินค้า',
        countCoffee: 'นับสต็อก กาแฟ',
        countA: 'นับสต็อก บาร์น้ำ',
        countStore: 'นับสต็อก สโตว์',
        sales: 'ขาย',
        withdraw: 'เบิกออก',
        reports: 'รายงาน/สรุป',
        products: 'จัดการสินค้า',
        users: 'จัดการผู้ใช้',
        settings: 'ตั้งค่าระบบ'
    };
    elements.pageTitle.textContent = titles[pageId] || pageId;

    // Close mobile menu
    elements.sidebar.classList.remove('open');

    // Hide floating scrollbar when not on daily page
    if (pageId !== 'daily') {
        destroyFloatingScrollbar();
    }

    // Page-specific init
    if (pageId === 'daily') {
        loadDailyStock();
    } else if (pageId === 'products') {
        renderProductsTable();
    } else if (pageId === 'receive') {
        const receiveDateInput = document.getElementById('receiveDate');
        if (receiveDateInput && !receiveDateInput.value) {
            receiveDateInput.value = getTodayDate();
        }
        renderRecentReceives();
    } else if (pageId === 'countCoffee') {
        CountPages.init('countCoffee');
    } else if (pageId === 'countA') {
        CountPages.init('countA');
    } else if (pageId === 'countStore') {
        CountPages.init('countStore');
    } else if (pageId === 'sales') {
        CountPages.init('sales');
    } else if (pageId === 'withdraw') {
        CountPages.init('withdraw');
    } else if (pageId === 'users') {
        renderUsersTable();
    } else if (pageId === 'settings') {
        loadHolidays();
    }
}

// ==================== DASHBOARD ====================
async function updateDashboard() {
    const products = Stock.products;
    const dashboardDateInput = document.getElementById('dashboardDate');
    const date = dashboardDateInput && dashboardDateInput.value ? dashboardDateInput.value : getTodayDate();

    // Set date input if empty
    if (dashboardDateInput && !dashboardDateInput.value) {
        dashboardDateInput.value = date;
    }

    showLoading();

    // Load selected day's data
    await Stock.loadDailyStock(date);
    const shortages = await Stock.getShortages(date);

    // Update stats
    elements.totalProducts.textContent = products.length;

    // Count stock status
    let inStock = 0;
    let lowStock = 0;
    let shortage = 0;

    shortages.forEach(s => {
        if (s.variance < 0) shortage++;
        else if (s.variance > 0) inStock++;
    });

    elements.inStockCount.textContent = products.length - shortage - lowStock;
    elements.lowStockCount.textContent = lowStock;
    elements.shortageCount.textContent = shortage;

    // Render shortage list
    if (shortages.length === 0) {
        elements.shortageList.innerHTML = '<p class="text-muted">✅ ไม่มีสินค้าขาด/เกิน</p>';
    } else {
        elements.shortageList.innerHTML = shortages.map(s => `
            <div class="shortage-item ${s.variance > 0 ? 'overage' : ''}">
                <span class="product-name">${s.name}</span>
                <span class="variance ${s.variance < 0 ? 'negative' : 'positive'}">
                    ${s.variance > 0 ? '+' : ''}${s.variance} ขวด
                </span>
            </div>
        `).join('');
    }

    hideLoading();
}

// ==================== DAILY STOCK ====================
async function loadDailyStock() {
    const date = elements.stockDate.value;

    showLoading();

    // Load products, carry forward, existing stock, and receives from server
    const products = await Stock.loadProducts();
    const carryForward = await Stock.loadCarryForward(date);
    const existingStock = await Stock.loadDailyStock(date);

    // Load receives from server for the selected date
    const receivesData = await loadServerReceives(date);

    // Create lookup for existing data
    const existingLookup = {};
    existingStock.forEach(s => {
        existingLookup[s.codeProduct] = s;
    });

    // Render table
    elements.dailyStockBody.innerHTML = products.map(product => {
        const existing = existingLookup[product.codeProduct];
        const cf = carryForward[product.codeProduct] || { bottles: 0 };
        // Use saved carryForward from DB if exists, otherwise calculate from previous day
        const cfFromPrevDay = cf.pack ? (cf.pack * product.qtyPerPack + (cf.bottle || 0)) : (cf.bottles || 0);
        const cfBottles = (existing && existing.carryForward > 0) ? existing.carryForward : cfFromPrevDay;

        // Get receive records from server (fallback to localStorage)
        // Convert codeProduct to string for consistent key matching
        const productCodeStr = String(product.codeProduct);
        const receiveKey = `${date}_${productCodeStr}`;
        const receiveRecord = receivesData[receiveKey] || getReceiveRecord(date, productCodeStr);

        // IMPORTANT: Prioritize receive record if it has data, otherwise use existing daily_stock
        // This ensures newly added receives show up even if daily_stock was saved before
        const receivePack = parseInt(receiveRecord.pack) || 0;
        const receiveBottle = parseInt(receiveRecord.bottle) || 0;
        const incomingPack = (receivePack > 0 || receiveBottle > 0) ? receivePack : (existing?.incomingPack ?? 0);
        const incomingBottle = (receivePack > 0 || receiveBottle > 0) ? receiveBottle : (existing?.incomingBottle ?? 0);

        return `
            <tr data-code="${product.codeProduct}" data-qty-per-pack="${product.qtyPerPack}">
                <td>${product.codeProduct}</td>
                <td style="text-align: left;">${product.name}</td>
                <td class="td-cf">
                    <input type="number" class="cf-bottle" value="${cfBottles}" min="0">
                </td>
                <td class="td-in">
                    <input type="number" class="in-pack" value="${incomingPack || ''}" min="0">
                </td>
                <td class="td-in">
                    <input type="number" class="in-bottle" value="${incomingBottle || ''}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-coffee-pack" value="${(existing?.transferCoffeePack || '')}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-coffee" value="${(existing?.transferCoffee || '')}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-a-pack" value="${(existing?.transferAPack || '')}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-a" value="${(existing?.transferA || '')}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-store-pack" value="${(existing?.transferStorePack || '')}" min="0">
                </td>
                <td class="td-transfer">
                    <input type="number" class="transfer-store" value="${(existing?.transferStore || '')}" min="0">
                </td>
                <td class="td-withdraw">
                    <input type="number" class="withdraw" value="${(existing?.withdraw || '')}" min="0">
                </td>
                <td class="td-sold">
                    <input type="number" class="ocha-coffee" value="${(existing?.ochaCoffee || '')}" min="0">
                </td>
                <td class="td-sold">
                    <input type="number" class="ocha-bar" value="${(existing?.ochaBar || '')}" min="0">
                </td>
                <td class="td-sold sold-total-cell" data-sold-total="0">
                    0
                </td>
                <td class="evening-total-cell" data-evening-total="0" style="display:none">
                    0
                </td>
                <td class="morning-evening-cell" data-morning-evening="0" style="display:none">
                    0
                </td>
                <td class="variance-cell" data-variance="0">
                    0
                </td>
                <td class="carry-over-cell" data-carry-over="0">
                    0
                </td>
            </tr>
        `;
    }).join('');

    // Add change listeners for auto-calculate carry over
    document.querySelectorAll('#dailyStockBody input').forEach(input => {
        input.addEventListener('change', () => {
            calculateRowCarryOver(input.closest('tr'));
        });
    });

    // Calculate initial carry over for all rows
    document.querySelectorAll('#dailyStockBody tr').forEach(row => {
        calculateRowCarryOver(row);
    });

    hideLoading();

    // Initialize floating scrollbar after table is rendered
    setTimeout(() => initFloatingScrollbar(), 100);
}

function calculateRowCarryOver(row) {
    const qtyPerPack = parseInt(row.dataset.qtyPerPack) || 12;

    const cfBottle = parseInt(row.querySelector('.cf-bottle').value) || 0;
    const inPack = parseInt(row.querySelector('.in-pack').value) || 0;
    const inBottle = parseInt(row.querySelector('.in-bottle').value) || 0;
    const transferCoffeePack = parseInt(row.querySelector('.transfer-coffee-pack').value) || 0;
    const transferCoffee = parseInt(row.querySelector('.transfer-coffee').value) || 0;
    const transferAPack = parseInt(row.querySelector('.transfer-a-pack').value) || 0;
    const transferA = parseInt(row.querySelector('.transfer-a').value) || 0;
    const transferStorePack = parseInt(row.querySelector('.transfer-store-pack').value) || 0;
    const transferStore = parseInt(row.querySelector('.transfer-store').value) || 0;
    const withdraw = parseInt(row.querySelector('.withdraw').value) || 0;
    const ochaCoffee = parseInt(row.querySelector('.ocha-coffee').value) || 0;
    const ochaBar = parseInt(row.querySelector('.ocha-bar').value) || 0;
    const sold = ochaCoffee + ochaBar;

    // Update sold total cell
    const soldTotalCell = row.querySelector('.sold-total-cell');
    soldTotalCell.textContent = sold;
    soldTotalCell.dataset.soldTotal = sold;

    // Calculate transfers (convert packs to bottles)
    const coffeeBottles = transferCoffeePack * qtyPerPack + transferCoffee;
    const aBottles = transferAPack * qtyPerPack + transferA;
    const storeBottles = transferStorePack * qtyPerPack + transferStore;

    // Calculate incoming bottles
    const incomingBottles = inPack * qtyPerPack + inBottle;

    // รวมเย็น (Evening Total) = กาแฟ + บาร์น้ำ + สโตร์ + เบิกออก
    const eveningTotal = coffeeBottles + aBottles + storeBottles + withdraw;

    // Update evening total cell
    const eveningTotalCell = row.querySelector('.evening-total-cell');
    eveningTotalCell.textContent = eveningTotal;
    eveningTotalCell.dataset.eveningTotal = eveningTotal;

    // เช้า-เย็น (Morning - Evening) = ยอดยกมา + รับเข้า - รวมเย็น
    const morningEvening = cfBottle + incomingBottles - eveningTotal;

    // Update morning-evening cell
    const morningEveningCell = row.querySelector('.morning-evening-cell');
    morningEveningCell.textContent = morningEvening;
    morningEveningCell.dataset.morningEvening = morningEvening;

    // ยอดยกไป (Carry Over) = รวมเย็น - เบิกออก
    const carryOver = eveningTotal - withdraw;

    // Update carry over cell
    const carryOverCell = row.querySelector('.carry-over-cell');
    carryOverCell.textContent = carryOver;
    carryOverCell.dataset.carryOver = carryOver;

    // ขาด/เกิน (Variance) = ยอดขาย(Ocha) - เช้า-เย็น
    const variance = sold - morningEvening;

    // Update variance cell with colors
    const varianceCell = row.querySelector('.variance-cell');
    varianceCell.textContent = variance;
    varianceCell.dataset.variance = variance;
    varianceCell.classList.remove('negative', 'positive', 'zero');
    if (variance < 0) {
        varianceCell.classList.add('negative'); // Red - ขาด
    } else if (variance > 0) {
        varianceCell.classList.add('positive'); // Yellow - เกิน
    } else {
        varianceCell.classList.add('zero'); // Green - พอดี
    }
}

async function saveDailyStock() {
    const date = elements.stockDate.value;
    const rows = document.querySelectorAll('#dailyStockBody tr');

    const stocks = [];
    rows.forEach(row => {
        const product = Stock.getProduct(row.dataset.code);
        stocks.push({
            codeProduct: row.dataset.code,
            name: product?.name || '',
            carryForward: parseInt(row.querySelector('.cf-bottle').value) || 0,
            incomingPack: parseInt(row.querySelector('.in-pack').value) || 0,
            incomingBottle: parseInt(row.querySelector('.in-bottle').value) || 0,
            transferCoffeePack: parseInt(row.querySelector('.transfer-coffee-pack').value) || 0,
            transferCoffee: parseInt(row.querySelector('.transfer-coffee').value) || 0,
            transferAPack: parseInt(row.querySelector('.transfer-a-pack').value) || 0,
            transferA: parseInt(row.querySelector('.transfer-a').value) || 0,
            transferStorePack: parseInt(row.querySelector('.transfer-store-pack').value) || 0,
            transferStore: parseInt(row.querySelector('.transfer-store').value) || 0,
            withdraw: parseInt(row.querySelector('.withdraw').value) || 0,
            ochaCoffee: parseInt(row.querySelector('.ocha-coffee').value) || 0,
            ochaBar: parseInt(row.querySelector('.ocha-bar').value) || 0,
            sold: parseInt(row.querySelector('.sold-total-cell').dataset.soldTotal) || 0,
            carryOver: parseInt(row.querySelector('.carry-over-cell').dataset.carryOver) || 0,
            variance: parseInt(row.querySelector('.variance-cell').dataset.variance) || 0
        });
    });

    showLoading();

    const result = await Stock.saveDailyStock(date, stocks, Auth.getUser()?.username || 'unknown');

    hideLoading();

    if (result.success) {
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        await updateDashboard();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

// ==================== PRINT DAILY STOCK ====================
function printDailyStock() {
    // Get current date from form
    const stockDate = elements.stockDate.value || getTodayDate();

    // Get restaurant name
    const restaurantName = localStorage.getItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME) || 'ร้านอาหาร';

    // Format current timestamp for print
    const now = new Date();
    const printTimestamp = formatDateTimeThai(now);

    // Format data date with Thai day name
    const dateObj = new Date(stockDate);
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dayName = thaiDays[dateObj.getDay()];
    const day = dateObj.getDate();
    const month = thaiMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543;

    // Format timestamp date part
    const printDay = now.getDate();
    const printMonth = thaiMonths[now.getMonth()];
    const printYear = now.getFullYear() + 543;
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    // Set print header values - 2 lines
    // Line 1: "บันทึกสต๊อกประจำวัน วันที่ข้อมูล วันเสาร์ที่ 17 มกราคม 2569"
    document.getElementById('printLine1').textContent =
        `📝 บันทึกสต็อกประจำวัน วันที่ข้อมูล ${dayName}ที่ ${day} ${month} ${year}`;

    // Line 2: "ร้านอาหารระเบียงบัว พิมพ์เมื่อวันที่ 17 มกราคม 2569 เวลา 16:22:32 น."
    document.getElementById('printLine2').textContent =
        `${restaurantName} พิมพ์เมื่อวันที่ ${printDay} ${printMonth} ${printYear} เวลา ${hours}:${minutes}:${seconds} น.`;

    // Hide zero values before printing - store original values
    const inputs = document.querySelectorAll('#dailyStockBody input[type="number"]');
    const cells = document.querySelectorAll('#dailyStockBody .carry-over-cell, #dailyStockBody .variance-cell');
    const originalInputValues = [];
    const originalCellValues = [];

    // Replace 0 with empty string in inputs
    inputs.forEach((input, i) => {
        originalInputValues[i] = input.value;
        if (parseInt(input.value) === 0) {
            input.value = '';
        }
    });

    // Replace 0 with empty string in calculated cells (only carry-over, not variance)
    cells.forEach((cell, i) => {
        originalCellValues[i] = cell.textContent;
        // Only hide zeros in carry-over cells, keep variance cells showing 0
        if (cell.classList.contains('carry-over-cell') && parseInt(cell.textContent) === 0) {
            cell.textContent = '';
        }
    });

    // Trigger print dialog
    window.print();

    // Restore original values after print dialog closes
    inputs.forEach((input, i) => {
        input.value = originalInputValues[i];
    });
    cells.forEach((cell, i) => {
        cell.textContent = originalCellValues[i];
    });
}

/**
 * Format date and time in Thai format
 */
function formatDateTimeThai(date) {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const d = new Date(date);
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543; // Convert to Buddhist Era
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${day} ${month} ${year} เวลา ${hours}:${minutes}:${seconds} น.`;
}

// ==================== RECEIVE PRODUCT ====================
// Storage key for receive records (localStorage cache)
const RECEIVE_STORAGE_KEY = 'barstock_receives';
const RECEIVE_MIGRATED_KEY = 'barstock_receives_migrated';

// Server-side receives cache
let serverReceivesCache = null;

/**
 * Direct GAS API call (bypasses PHP API for receives)
 * Since receives endpoints only exist in Google Apps Script
 */
async function gasGet(action, params = {}) {
    const gasUrl = localStorage.getItem('gasUrl') || CONFIG.GAS_URL;
    if (!gasUrl) {
        console.warn('GAS URL not configured');
        return { success: false, error: 'GAS URL not configured' };
    }

    try {
        const url = new URL(gasUrl);
        url.searchParams.append('action', action);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('GAS GET Error:', error);
        return { success: false, error: error.message };
    }
}

async function gasPost(action, data = {}) {
    const gasUrl = localStorage.getItem('gasUrl') || CONFIG.GAS_URL;
    if (!gasUrl) {
        console.warn('GAS URL not configured');
        return { success: false, error: 'GAS URL not configured' };
    }

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({ action, ...data }),
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('GAS POST Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get receive records from localStorage (cache)
 */
function getReceiveRecords() {
    const stored = localStorage.getItem(RECEIVE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}

/**
 * Load receives from server (PHP API)
 */
async function loadServerReceives(date = null) {
    try {
        const result = await SheetsAPI.get('getReceives', date ? { date } : {});
        if (result.success && result.receives) {
            // Convert array to object for compatibility with existing code
            const records = {};
            result.receives.forEach(r => {
                // Use string productCode to ensure consistent key matching
                const key = `${r.date}_${String(r.productCode)}`;
                records[key] = r;
            });
            serverReceivesCache = records;
            // Also update localStorage cache
            localStorage.setItem(RECEIVE_STORAGE_KEY, JSON.stringify(records));
            return records;
        }
    } catch (error) {
        console.error('Could not load receives from server:', error);
    }
    return getReceiveRecords(); // Fallback to localStorage
}

/**
 * Migrate localStorage receives to server (one-time)
 */
async function migrateLocalReceivesToServer() {
    const migrated = localStorage.getItem(RECEIVE_MIGRATED_KEY);
    if (migrated) return; // Already migrated

    const localRecords = getReceiveRecords();
    const recordsArray = Object.values(localRecords);

    if (recordsArray.length === 0) {
        localStorage.setItem(RECEIVE_MIGRATED_KEY, 'true');
        return;
    }

    console.log('Migrating', recordsArray.length, 'receive records to server...');

    let successCount = 0;
    for (const record of recordsArray) {
        try {
            const result = await SheetsAPI.post('saveReceive', {
                receive: {
                    date: record.date,
                    productCode: record.productCode,
                    productName: record.productName || '',
                    pack: record.pack || 0,
                    bottle: record.bottle || 0,
                    note: record.note || '',
                    user: Auth.getUser()?.username || ''
                }
            });
            if (result.success) successCount++;
        } catch (error) {
            console.error('Migration error for record:', record, error);
        }
    }

    console.log('Migrated', successCount, 'of', recordsArray.length, 'records');
    localStorage.setItem(RECEIVE_MIGRATED_KEY, 'true');
}

/**
 * Save receive record to both localStorage and server
 */
async function saveReceiveRecord(date, productCode, pack, bottle, note = '', productName = '') {
    const records = getReceiveRecords();
    const key = `${date}_${productCode}`;

    // Create/update record
    const recordData = {
        date: date,
        productCode: productCode,
        productName: productName,
        pack: parseInt(pack) || 0,
        bottle: parseInt(bottle) || 0,
        note: note,
        timestamp: new Date().toISOString()
    };

    // Add to existing or create new (localStorage)
    if (records[key]) {
        records[key].pack = (parseInt(records[key].pack) || 0) + recordData.pack;
        records[key].bottle = (parseInt(records[key].bottle) || 0) + recordData.bottle;
        records[key].timestamp = recordData.timestamp;
        if (note) records[key].note = note;
    } else {
        records[key] = recordData;
    }

    localStorage.setItem(RECEIVE_STORAGE_KEY, JSON.stringify(records));

    // Save to server via PHP API (await to ensure data is saved before refresh)
    try {
        const result = await SheetsAPI.post('saveReceive', {
            receive: {
                ...recordData,
                user: Auth.getUser()?.username || ''
            }
        });
        if (!result.success) {
            console.warn('Failed to save receive to server:', result.error);
        }
    } catch (error) {
        console.error('Server save error:', error);
    }

    return records[key];
}

function getReceiveRecord(date, productCode) {
    const records = getReceiveRecords();
    const key = `${date}_${productCode}`;
    return records[key] || { pack: 0, bottle: 0 };
}

function clearReceiveRecord(date, productCode) {
    const records = getReceiveRecords();
    const key = `${date}_${productCode}`;
    delete records[key];
    localStorage.setItem(RECEIVE_STORAGE_KEY, JSON.stringify(records));

    // Delete from server via PHP API
    SheetsAPI.post('deleteReceive', { date, productCode });
}

async function handleReceive(e) {
    e.preventDefault();

    const productCode = elements.receiveProduct.value;
    const product = Stock.getProduct(productCode);

    if (!product) {
        showToast('กรุณาเลือกสินค้า', 'warning');
        return;
    }

    const pack = parseInt(document.getElementById('receivePack').value) || 0;
    const bottle = parseInt(document.getElementById('receiveBottle').value) || 0;

    if (pack === 0 && bottle === 0) {
        showToast('กรุณาระบุจำนวน', 'warning');
        return;
    }

    const note = document.getElementById('receiveNote').value || '';
    const dateInput = document.getElementById('receiveDate');
    const date = dateInput ? dateInput.value : getTodayDate();
    const editIndex = document.getElementById('receiveEditIndex').value;

    showLoading();

    // If editing, update the record
    if (editIndex) {
        await updateReceiveRecord(editIndex, productCode, pack, bottle, note, product.name, date);
        showToast(`แก้ไขรับเข้า ${product.name} สำเร็จ`, 'success');
        document.getElementById('receiveEditIndex').value = '';
        document.getElementById('receiveCancelBtn').style.display = 'none';
    } else {
        // Save new record to localStorage and server
        await saveReceiveRecord(date, productCode, pack, bottle, note, product.name);
        showToast(`บันทึกรับเข้า ${product.name}: ${pack} ลัง ${bottle} ขวด`, 'success');
    }

    hideLoading();

    // Render receives table for selected date
    await renderRecentReceives();

    // Reset form
    elements.receiveForm.reset();
    document.getElementById('receivePack').value = '0';
    document.getElementById('receiveBottle').value = '0';
}

/**
 * Update a receive record
 */
async function updateReceiveRecord(recordKey, productCode, pack, bottle, note, productName, date) {
    const records = getReceiveRecords();
    const [oldDate, oldProductCode] = recordKey.split('_');

    // Update localStorage
    if (records[recordKey]) {
        records[recordKey] = {
            ...records[recordKey],
            productCode: productCode,
            productName: productName,
            pack: pack,
            bottle: bottle,
            note: note,
            date: date,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(RECEIVE_STORAGE_KEY, JSON.stringify(records));
    }

    // Update server
    try {
        await SheetsAPI.post('updateReceive', {
            receive: {
                date: date,
                productCode: productCode,
                productName: productName,
                pack: pack,
                bottle: bottle,
                note: note,
                user: Auth.getUser()?.username || ''
            }
        });
    } catch (error) {
        console.error('Server update error:', error);
    }
}

/**
 * Delete a receive record
 */
async function deleteReceiveRecord(recordKey) {
    const records = getReceiveRecords();
    const [date, productCode] = recordKey.split('_');

    // Delete from localStorage
    if (records[recordKey]) {
        delete records[recordKey];
        localStorage.setItem(RECEIVE_STORAGE_KEY, JSON.stringify(records));
    }

    // Delete from server
    try {
        await SheetsAPI.post('deleteReceive', { date, productCode });
    } catch (error) {
        console.error('Server delete error:', error);
    }
}

/**
 * Edit a receive record - populate form
 */
function editReceive(recordKey) {
    const records = getReceiveRecords();
    const record = records[recordKey];

    if (!record) return;

    document.getElementById('receiveProduct').value = record.productCode;
    document.getElementById('receivePack').value = record.pack || 0;
    document.getElementById('receiveBottle').value = record.bottle || 0;
    document.getElementById('receiveNote').value = record.note || '';
    document.getElementById('receiveEditIndex').value = recordKey;
    document.getElementById('receiveCancelBtn').style.display = 'inline-block';

    // Scroll to form
    document.getElementById('receiveForm').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cancel editing
 */
function cancelReceiveEdit() {
    document.getElementById('receiveEditIndex').value = '';
    document.getElementById('receiveCancelBtn').style.display = 'none';
    elements.receiveForm.reset();
    document.getElementById('receivePack').value = '0';
    document.getElementById('receiveBottle').value = '0';
}

/**
 * Confirm and delete receive
 */
async function confirmDeleteReceive(recordKey) {
    if (confirm('ต้องการลบรายการนี้?')) {
        showLoading();
        await deleteReceiveRecord(recordKey);
        hideLoading();
        showToast('ลบรายการสำเร็จ', 'success');
        await renderRecentReceives();
    }
}

/**
 * Render receives table (load from server first, fallback to localStorage)
 */
async function renderRecentReceives() {
    const recentReceivesBody = document.getElementById('recentReceives');
    if (!recentReceivesBody) return;

    // Load from server
    const records = await loadServerReceives();

    // Convert to array and sort by date (newest first)
    const recordsArray = Object.entries(records).sort((a, b) => {
        return new Date(b[1].date || b[1].timestamp) - new Date(a[1].date || a[1].timestamp);
    });

    if (recordsArray.length === 0) {
        recentReceivesBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted);">
                    ยังไม่มีรายการรับเข้า
                </td>
            </tr>
        `;
        return;
    }

    recentReceivesBody.innerHTML = recordsArray.map(([key, record]) => {
        const product = Stock.getProduct(record.productCode);
        const productName = record.productName || product?.name || record.productCode;
        const displayDate = record.date || new Date(record.timestamp).toISOString().split('T')[0];

        return `
            <tr>
                <td>${displayDate}</td>
                <td>${productName}</td>
                <td>${record.pack || 0}</td>
                <td>${record.bottle || 0}</td>
                <td>${record.note || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editReceive('${key}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDeleteReceive('${key}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== PRODUCTS ====================
function populateProductDropdowns() {
    const options = Stock.products.map(p =>
        `<option value="${p.codeProduct}">${p.name}</option>`
    ).join('');

    elements.receiveProduct.innerHTML = '<option value="">เลือกสินค้า</option>' + options;
}

async function renderProductsTable() {
    showLoading();

    // Load ALL products (including inactive) for admin view
    const result = await SheetsAPI.get('getAllProducts');
    const allProducts = result.success ? result.products : Stock.products;

    hideLoading();

    elements.productsBody.innerHTML = allProducts.map(p => {
        const isActive = p.isActive !== 0;
        const rowStyle = isActive ? '' : 'opacity: 0.5;';
        const statusBadge = isActive
            ? '<span class="badge bg-success">เปิด</span>'
            : '<span class="badge bg-danger">ปิด</span>';
        const toggleIcon = isActive ? '🔴' : '🟢';
        const toggleText = isActive ? 'ปิด' : 'เปิด';

        return `
        <tr style="${rowStyle}">
            <td>${p.codeProduct}</td>
            <td>${p.name}</td>
            <td>${p.qtyPerPack}</td>
            <td>${p.packUnit}</td>
            <td>${p.sellUnit}</td>
            <td>${p.minQty}</td>
            <td>${p.category}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editProduct(${p.codeProduct})">
                    ✏️ แก้ไข
                </button>
                <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" onclick="toggleProduct(${p.codeProduct}, ${isActive ? 0 : 1})">
                    ${toggleIcon} ${toggleText}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.codeProduct})">
                    🗑️ ลบ
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

let editingProduct = null;

function openProductModal(product = null) {
    editingProduct = product;

    if (product) {
        document.getElementById('productModalTitle').textContent = 'แก้ไขสินค้า';
        document.getElementById('productCode').value = product.codeProduct;
        document.getElementById('productCode').disabled = true;
        document.getElementById('productName').value = product.name;
        document.getElementById('qtyPerPack').value = product.qtyPerPack;
        document.getElementById('packUnit').value = product.packUnit;
        document.getElementById('sellUnit').value = product.sellUnit;
        document.getElementById('minQty').value = product.minQty;
        document.getElementById('category').value = product.category;
    } else {
        document.getElementById('productModalTitle').textContent = 'เพิ่มสินค้า';
        document.getElementById('productCode').disabled = false;
        elements.productForm.reset();
        // Set defaults
        document.getElementById('qtyPerPack').value = 12;
        document.getElementById('sellUnit').value = 'ขวด';
        document.getElementById('minQty').value = 60;
        document.getElementById('category').value = 'บาร์น้ำ';
    }

    elements.productModal.classList.add('active');
}

function closeProductModal() {
    elements.productModal.classList.remove('active');
    editingProduct = null;
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const product = {
        codeProduct: parseInt(document.getElementById('productCode').value),
        name: document.getElementById('productName').value,
        qtyPerPack: parseInt(document.getElementById('qtyPerPack').value),
        packUnit: document.getElementById('packUnit').value,
        sellUnit: document.getElementById('sellUnit').value,
        minQty: parseInt(document.getElementById('minQty').value),
        category: document.getElementById('category').value
    };

    showLoading();

    let result;
    if (editingProduct) {
        result = await Stock.updateProduct(product);
    } else {
        result = await Stock.addProduct(product);
    }

    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
        closeProductModal();
        renderProductsTable();
        populateProductDropdowns();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

function editProduct(codeProduct) {
    const product = Stock.getProduct(codeProduct);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(codeProduct) {
    if (!confirm('ต้องการลบสินค้านี้หรือไม่?')) return;

    showLoading();
    const result = await Stock.deleteProduct(codeProduct);
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
        renderProductsTable();
        populateProductDropdowns();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

async function toggleProduct(codeProduct, isActive) {
    const action = isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    if (!confirm(`ต้องการ${action}สินค้านี้หรือไม่?`)) return;

    showLoading();
    const result = await SheetsAPI.post('toggleProductActive', { codeProduct, isActive });
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
        // Reload products to update cache
        await Stock.loadProducts();
        renderProductsTable();
        populateProductDropdowns();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

// ==================== USERS ====================
// User permissions storage key
const USER_PERMISSIONS_KEY = 'barstock_user_permissions';

// Get user permissions from localStorage
function getUserPermissions() {
    const stored = localStorage.getItem(USER_PERMISSIONS_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Save user permissions to localStorage
function saveUserPermissions(permissions) {
    localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(permissions));
}

// Check if user has permission to access a page
function hasPermission(pageId) {
    const user = Auth.getUser();
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Check user's permissions from server (stored during login)
    const userPermissions = user.permissions || [];

    // If no permissions set, deny access (safer default)
    if (userPermissions.length === 0) return false;

    return userPermissions.includes(pageId);
}

// Render users table
async function renderUsersTable() {
    const usersBody = document.getElementById('usersBody');
    if (!usersBody) return;

    showLoading();

    // Get users from API
    const result = await SheetsAPI.get('getUsers');
    let users = result.success ? result.users : [];

    hideLoading();

    if (users.length === 0) {
        usersBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted);">
                    ยังไม่มีข้อมูลผู้ใช้ (กรุณาเพิ่มผู้ใช้)
                </td>
            </tr>
        `;
        return;
    }

    // Store users for edit functionality
    window._appUsers = users;

    usersBody.innerHTML = users.map(user => {
        const userPerms = user.permissions || [];
        const permLabels = {
            dashboard: '📊',
            daily: '📝',
            receive: '📦',
            countCoffee: '☕',
            countA: '💧',
            countStore: '🏪',
            sales: '💰',
            withdraw: '📤',
            reports: '📈'
        };

        const permDisplay = user.role === 'admin' ?
            '<span style="color: var(--success);">ทั้งหมด</span>' :
            userPerms.length > 0 ? userPerms.map(p => permLabels[p] || p).join(' ') : '<span style="color: var(--text-muted);">-</span>';

        return `
            <tr>
                <td>${user.username}</td>
                <td>${user.name || '-'}</td>
                <td><span class="badge ${user.role === 'admin' ? 'bg-primary' : ''}">${user.role}</span></td>
                <td>${permDisplay}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editUser('${user.username}')">✏️</button>
                    ${user.username !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${user.username}')">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Open user modal (for add or edit)
function openUserModal(username = null) {
    const modal = elements.userModal;
    const titleEl = document.getElementById('userModalTitle');
    const usernameInput = document.getElementById('newUsername');
    const passwordInput = document.getElementById('newPassword');
    const nameInput = document.getElementById('newName');
    const roleSelect = document.getElementById('newRole');
    const editIdInput = document.getElementById('editUserId');

    // Reset form
    elements.userForm.reset();

    // Reset all permission checkboxes to checked
    document.querySelectorAll('.permissions-grid input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });

    if (username) {
        // Edit mode
        titleEl.textContent = 'แก้ไขผู้ใช้';
        editIdInput.value = username;
        usernameInput.value = username;
        usernameInput.disabled = true;

        // Get user data from cached users (loaded by renderUsersTable)
        const users = window._appUsers || [];
        const user = users.find(u => u.username === username);

        if (user) {
            nameInput.value = user.name || '';
            roleSelect.value = user.role || 'user';

            // Set permission checkboxes from API data
            if (user.permissions && user.permissions.length > 0) {
                document.querySelectorAll('.permissions-grid input[type="checkbox"]').forEach(cb => {
                    cb.checked = user.permissions.includes(cb.value);
                });
            }
        }
    } else {
        // Add mode
        titleEl.textContent = 'เพิ่มผู้ใช้';
        editIdInput.value = '';
        usernameInput.disabled = false;
    }

    modal.classList.add('active');
}

// Edit user
function editUser(username) {
    openUserModal(username);
}

// Delete user
async function deleteUser(username) {
    if (!confirm(`ต้องการลบผู้ใช้ "${username}"?`)) return;

    showLoading();

    // Delete from API
    const result = await SheetsAPI.post('deleteUser', { username });

    hideLoading();

    if (result.success) {
        showToast('ลบผู้ใช้สำเร็จ', 'success');
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }

    renderUsersTable();
}

async function handleUserSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById('editUserId').value;
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const name = document.getElementById('newName').value;
    const role = document.getElementById('newRole').value;

    // Collect permissions
    const permissions = [];
    document.querySelectorAll('.permissions-grid input[type="checkbox"]:checked').forEach(cb => {
        permissions.push(cb.value);
    });

    // Build user object with permissions
    const user = {
        username: username,
        password: password,
        name: name,
        role: role,
        permissions: permissions
    };

    if (!editId) {
        // New user - must have password
        if (!password) {
            showToast('กรุณาระบุรหัสผ่าน', 'warning');
            return;
        }

        showLoading();
        const result = await SheetsAPI.post('addUser', { user });
        hideLoading();

        if (result.success) {
            showToast('เพิ่มผู้ใช้สำเร็จ', 'success');
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
            return;
        }
    } else {
        // Edit mode - always update (with or without password)
        showLoading();
        const result = await SheetsAPI.post('updateUser', { user });
        hideLoading();

        if (result.success) {
            showToast('แก้ไขผู้ใช้สำเร็จ', 'success');
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
            return;
        }
    }

    elements.userModal.classList.remove('active');
    elements.userForm.reset();
    document.getElementById('newUsername').disabled = false;
    renderUsersTable();
}

// ==================== REPORTS ====================
async function loadMonthlySummary() {
    const month = elements.reportMonth.value;
    const year = elements.reportYear.value;

    showLoading();

    const summary = await Stock.getMonthlySummary(month, year);
    const products = Stock.products;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build header
    let headerHtml = '<tr><th>สินค้า</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        headerHtml += `<th>${d}</th>`;
    }
    headerHtml += '<th style="background: var(--primary); color: white;">รวม</th>';
    headerHtml += '</tr>';
    elements.summaryHeader.innerHTML = headerHtml;

    // Build body
    let bodyHtml = '';
    products.forEach(product => {
        const productSummary = summary[product.codeProduct];
        bodyHtml += `<tr><td style="text-align: left; white-space: nowrap;">${product.name}</td>`;

        let totalVariance = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayData = productSummary?.days?.[d];
            const variance = dayData?.variance || '';
            let cellClass = 'day-cell';
            if (variance < 0) cellClass += ' negative';
            else if (variance > 0) cellClass += ' positive';

            bodyHtml += `<td class="${cellClass}">${variance}</td>`;

            // Add to total
            if (variance !== '') {
                totalVariance += parseInt(variance) || 0;
            }
        }

        // Add total column
        let totalClass = 'day-cell';
        if (totalVariance < 0) totalClass += ' negative';
        else if (totalVariance > 0) totalClass += ' positive';
        bodyHtml += `<td class="${totalClass}" style="font-weight: bold;">${totalVariance}</td>`;

        bodyHtml += '</tr>';
    });

    elements.summaryBody.innerHTML = bodyHtml;

    hideLoading();
}

async function exportReportPDF() {
    const month = elements.reportMonth.value;
    const year = elements.reportYear.value;

    showToast('กำลังสร้าง PDF...', 'success');

    // Create printable summary
    const printWindow = window.open('', '_blank');
    const summary = await Stock.getMonthlySummary(month, year);
    const products = Stock.products;
    const daysInMonth = new Date(year, month, 0).getDate();

    const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    let tableHeader = '<th>สินค้า</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        tableHeader += `<th>${d}</th>`;
    }
    tableHeader += '<th style="background: #16213e;">รวม</th>';

    let tableBody = '';
    products.forEach(product => {
        const productSummary = summary[product.codeProduct];
        tableBody += `<tr><td style="text-align: left; white-space: nowrap;">${product.name}</td>`;

        let totalVariance = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayData = productSummary?.days?.[d];
            const variance = dayData?.variance || '';
            let style = '';
            if (variance < 0) style = 'background: #ffebee; color: #c62828;';
            else if (variance > 0) style = 'background: #e8f5e9; color: #2e7d32;';

            tableBody += `<td style="${style}">${variance}</td>`;

            // Add to total
            if (variance !== '') {
                totalVariance += parseInt(variance) || 0;
            }
        }

        // Add total column
        let totalStyle = 'font-weight: bold;';
        if (totalVariance < 0) totalStyle += ' background: #ffebee; color: #c62828;';
        else if (totalVariance > 0) totalStyle += ' background: #e8f5e9; color: #2e7d32;';
        tableBody += `<td style="${totalStyle}">${totalVariance}</td>`;

        tableBody += '</tr>';
    });

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>สรุปสต็อก ${monthNames[month]} ${year}</title>
    <style>
        body { font-family: 'Prompt', sans-serif; padding: 10px; }
        h1 { text-align: center; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
        th { background: #0f3460; color: white; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <h1>📊 สรุปสต็อกบาร์น้ำ - ${monthNames[month]} ${year}</h1>
    <table>
        <thead><tr>${tableHeader}</tr></thead>
        <tbody>${tableBody}</tbody>
    </table>
    <div style="text-align: center; margin-top: 10px;">
        <button onclick="window.print()" style="padding: 10px 30px; cursor: pointer;">🖨️ พิมพ์</button>
    </div>
</body>
</html>
    `);
    printWindow.document.close();
}

// ==================== SETTINGS ====================
async function loadSettings() {
    // First load from localStorage (instant)
    elements.gasUrl.value = localStorage.getItem(CONFIG.STORAGE_KEYS.GAS_URL) || '';
    elements.lineChannelToken.value = localStorage.getItem(CONFIG.STORAGE_KEYS.LINE_CHANNEL_TOKEN) || '';
    elements.lineTargetId.value = localStorage.getItem(CONFIG.STORAGE_KEYS.LINE_TARGET_ID) || '';
    elements.restaurantName.value = localStorage.getItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME) || '';

    // Then try to load from server (may take time)
    try {
        const result = await SheetsAPI.get('getSettings');
        if (result.success && result.settings) {
            const settings = result.settings;

            // Update UI and localStorage with server values
            if (settings.restaurantName) {
                elements.restaurantName.value = settings.restaurantName;
                localStorage.setItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME, settings.restaurantName);
            }
            if (settings.lineChannelToken) {
                elements.lineChannelToken.value = settings.lineChannelToken;
                localStorage.setItem(CONFIG.STORAGE_KEYS.LINE_CHANNEL_TOKEN, settings.lineChannelToken);
            }
            if (settings.lineTargetId) {
                elements.lineTargetId.value = settings.lineTargetId;
                localStorage.setItem(CONFIG.STORAGE_KEYS.LINE_TARGET_ID, settings.lineTargetId);
            }
            // GAS URL is intentionally NOT synced from server (device-specific)
        }
    } catch (error) {
        console.log('Could not load settings from server, using localStorage');
    }
}

async function saveGasUrl() {
    const url = elements.gasUrl.value.trim();
    localStorage.setItem(CONFIG.STORAGE_KEYS.GAS_URL, url);
    CONFIG.GAS_URL = url;
    showToast('บันทึก URL สำเร็จ', 'success');
}

async function testConnection() {
    showLoading();
    const result = await SheetsAPI.testConnection();
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
    } else {
        showToast(result.error || 'การเชื่อมต่อล้มเหลว', 'error');
    }
}

async function saveLineToken() {
    const channelToken = elements.lineChannelToken.value.trim();
    const targetId = elements.lineTargetId.value.trim();

    // Save to localStorage (for immediate use)
    localStorage.setItem(CONFIG.STORAGE_KEYS.LINE_CHANNEL_TOKEN, channelToken);
    localStorage.setItem(CONFIG.STORAGE_KEYS.LINE_TARGET_ID, targetId);

    // Save to server (Google Sheets)
    showLoading();
    const result = await SheetsAPI.post('saveSettings', {
        settings: {
            lineChannelToken: channelToken,
            lineTargetId: targetId
        }
    });
    hideLoading();

    if (result.success) {
        showToast('บันทึกการตั้งค่า LINE สำเร็จ (ทั้ง Local และ Server)', 'success');
    } else {
        showToast('บันทึกใน localStorage แล้ว แต่ Server: ' + (result.error || 'ไม่สำเร็จ'), 'warning');
    }
}

async function testLineNotify() {
    showLoading();
    const result = await SheetsAPI.post('sendLineNotify', { message: '🔔 ทดสอบการเชื่อมต่อ LINE Messaging API จาก Bar Stock System' });
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
    } else {
        showToast(result.error || 'ส่งข้อความล้มเหลว', 'error');
    }
}

async function saveRestaurantInfo() {
    const name = elements.restaurantName.value.trim();

    // Save to localStorage
    localStorage.setItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME, name);

    // Save to server
    showLoading();
    const result = await SheetsAPI.post('saveSettings', {
        settings: {
            restaurantName: name
        }
    });
    hideLoading();

    if (result.success) {
        showToast('บันทึกข้อมูลร้านสำเร็จ (ทั้ง Local และ Server)', 'success');
    } else {
        showToast('บันทึกใน localStorage แล้ว แต่ Server: ' + (result.error || 'ไม่สำเร็จ'), 'warning');
    }
}

// ==================== HOLIDAY MANAGEMENT ====================
async function loadHolidays() {
    const holidaysBody = document.getElementById('holidaysBody');
    if (!holidaysBody) return;

    showLoading();
    const result = await SheetsAPI.get('getHolidays');
    hideLoading();

    if (!result.success || !result.holidays || result.holidays.length === 0) {
        holidaysBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted);">
                    ยังไม่มีวันหยุด
                </td>
            </tr>
        `;
        return;
    }

    holidaysBody.innerHTML = result.holidays.map(h => {
        // Format date for display (YYYY-MM-DD to DD/MM/YYYY)
        const dateParts = h.holidayDate.split('-');
        const displayDate = dateParts.length === 3 ?
            `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` :
            h.holidayDate;

        return `
            <tr>
                <td>${displayDate}</td>
                <td>${h.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteHoliday(${h.id})">
                        🗑️ ลบ
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function addHoliday() {
    const dateInput = document.getElementById('holidayDate');
    const descInput = document.getElementById('holidayDesc');

    const holidayDate = dateInput.value;
    const description = descInput.value.trim();

    if (!holidayDate) {
        showToast('กรุณาเลือกวันที่', 'warning');
        return;
    }

    showLoading();
    const result = await SheetsAPI.post('addHoliday', {
        holiday: {
            holidayDate: holidayDate,
            description: description
        }
    });
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
        dateInput.value = '';
        descInput.value = '';
        loadHolidays();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

async function deleteHoliday(id) {
    if (!confirm('ต้องการลบวันหยุดนี้?')) return;

    showLoading();
    const result = await SheetsAPI.post('deleteHoliday', { id: id });
    hideLoading();

    if (result.success) {
        showToast(result.message, 'success');
        loadHolidays();
    } else {
        showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
}

// ==================== LINE & PDF ====================
async function sendLineShortageReport() {
    const dashboardDateInput = document.getElementById('dashboardDate');
    const date = dashboardDateInput && dashboardDateInput.value ? dashboardDateInput.value : getTodayDate();
    const restaurantName = localStorage.getItem(CONFIG.STORAGE_KEYS.RESTAURANT_NAME) || 'ร้านอาหาร';

    showLoading();

    // Load shortages for selected date
    await Stock.loadDailyStock(date);
    const shortages = await Stock.getShortages(date);

    if (shortages.length === 0) {
        const noShortageMessage = `📊 ${restaurantName} | ${date}\nผลการตรวจนับสต๊อกวันนี้: ไม่มีของหาย ✅\nยินดีด้วยทุกคน 🎉`;
        const result = await SheetsAPI.post('sendLineNotify', { message: noShortageMessage });
        hideLoading();

        if (result.success) {
            showToast('ส่งรายงาน LINE สำเร็จ', 'success');
        } else {
            showToast(result.error || 'ส่งรายงานล้มเหลว', 'error');
        }
        return;
    }

    // Build message with shorter separators
    let message = `📊 รายงานสินค้าขาด/เกิน\n📅 วันที่: ${date}\n`;
    message += `━━━━━━━━━\n`;

    let shortageItems = [];
    let overageItems = [];

    shortages.forEach(s => {
        if (s.variance < 0) {
            shortageItems.push(`🔴 ${s.name}: ${s.variance} ขวด`);
        } else if (s.variance > 0) {
            overageItems.push(`🟡 ${s.name}: +${s.variance} ขวด`);
        }
    });

    if (shortageItems.length > 0) {
        message += `\n❌ สินค้าขาด (${shortageItems.length} รายการ):\n`;
        message += shortageItems.join('\n');
    }

    if (overageItems.length > 0) {
        message += `\n\n⚠️ สินค้าเกิน (${overageItems.length} รายการ):\n`;
        message += overageItems.join('\n');
    }

    message += `\n━━━━━━━━━\n`;
    message += `📍 ${restaurantName}`;

    // Send via API
    const result = await SheetsAPI.post('sendLineNotify', { message: message });
    hideLoading();

    if (result.success) {
        showToast('ส่งรายงาน LINE สำเร็จ', 'success');
    } else {
        showToast(result.error || 'ส่งรายงานล้มเหลว', 'error');
    }
}

async function exportDailyPDF() {
    const dashboardDateInput = document.getElementById('dashboardDate');
    const date = dashboardDateInput && dashboardDateInput.value ? dashboardDateInput.value : getTodayDate();

    showLoading();

    // Load selected day's data if not loaded
    const stocks = await Stock.loadDailyStock(date);

    if (stocks.length === 0) {
        hideLoading();
        showToast('ยังไม่มีข้อมูลสำหรับวันที่เลือก', 'warning');
        return;
    }

    hideLoading();

    Stock.generatePDF(date, stocks);
}

// ==================== UTILITIES ====================
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    elements.toast.querySelector('.toast-icon').textContent = icons[type] || icons.info;
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ==================== FLOATING SCROLLBAR ====================
/**
 * Initialize floating scrollbar for horizontal table scrolling
 * ใช้สำหรับหน้าจอขนาดเล็ก เช่น 14 นิ้ว
 */
function initFloatingScrollbar() {
    // Find existing floating scrollbar or create new one
    let scrollbarContainer = document.querySelector('.floating-scrollbar-container');

    if (!scrollbarContainer) {
        // Create floating scrollbar elements
        scrollbarContainer = document.createElement('div');
        scrollbarContainer.className = 'floating-scrollbar-container';

        const label = document.createElement('span');
        label.className = 'floating-scrollbar-label';
        label.textContent = '⬅️ เลื่อนตาราง ➡️';

        const scrollbar = document.createElement('div');
        scrollbar.className = 'floating-scrollbar';

        const content = document.createElement('div');
        content.className = 'floating-scrollbar-content';

        scrollbar.appendChild(content);
        scrollbarContainer.appendChild(label);
        scrollbarContainer.appendChild(scrollbar);
        document.body.appendChild(scrollbarContainer);
    }

    // Get table container
    const tableContainer = document.querySelector('#dailyPage .table-container');
    const floatingScrollbar = scrollbarContainer.querySelector('.floating-scrollbar');
    const floatingContent = scrollbarContainer.querySelector('.floating-scrollbar-content');

    if (!tableContainer) return;

    // Check if table needs horizontal scroll
    const needsScroll = tableContainer.scrollWidth > tableContainer.clientWidth;

    if (needsScroll) {
        // Show floating scrollbar
        scrollbarContainer.classList.add('visible');

        // Set content width to match table scroll width
        floatingContent.style.width = tableContainer.scrollWidth + 'px';

        // Sync scrolling between floating scrollbar and table
        let isSyncing = false;

        floatingScrollbar.onscroll = () => {
            if (isSyncing) return;
            isSyncing = true;
            tableContainer.scrollLeft = floatingScrollbar.scrollLeft;
            requestAnimationFrame(() => isSyncing = false);
        };

        tableContainer.onscroll = () => {
            if (isSyncing) return;
            isSyncing = true;
            floatingScrollbar.scrollLeft = tableContainer.scrollLeft;
            requestAnimationFrame(() => isSyncing = false);
        };

        // Update on window resize
        window.addEventListener('resize', () => {
            const stillNeedsScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
            if (stillNeedsScroll) {
                floatingContent.style.width = tableContainer.scrollWidth + 'px';
            } else {
                scrollbarContainer.classList.remove('visible');
            }
        });
    } else {
        // Hide floating scrollbar if not needed
        scrollbarContainer.classList.remove('visible');
    }
}

/**
 * Destroy floating scrollbar
 */
function destroyFloatingScrollbar() {
    const scrollbarContainer = document.querySelector('.floating-scrollbar-container');
    if (scrollbarContainer) {
        scrollbarContainer.classList.remove('visible');
    }
}

// Make functions available globally for inline onclick handlers
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.initFloatingScrollbar = initFloatingScrollbar;
window.destroyFloatingScrollbar = destroyFloatingScrollbar;
window.editReceive = editReceive;
window.confirmDeleteReceive = confirmDeleteReceive;

