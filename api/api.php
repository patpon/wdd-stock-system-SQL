<?php
/**
 * Bar Stock Management System - PHP API
 * ระบบจัดการสต็อกบาร์น้ำ
 * 
 * แทนที่ Google Apps Script ด้วย PHP + MySQL
 * Compatible with PHP 5.6+
 */

// Enable CORS for local development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
require_once 'db.php';

// ==================== HELPER FUNCTION FOR PHP 5.6 ====================
// Replacement for ?? operator (null coalescing)
function getVal($array, $key, $default = '')
{
    return isset($array[$key]) ? $array[$key] : $default;
}

// ==================== MAIN ROUTER ====================

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        handleGetRequest();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handlePostRequest();
    } else {
        jsonResponse(array('success' => false, 'error' => 'Method not allowed'), 405);
    }
} catch (Exception $e) {
    jsonResponse(array('success' => false, 'error' => $e->getMessage()), 500);
}

// ==================== REQUEST HANDLERS ====================

function handleGetRequest()
{
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    switch ($action) {
        case 'init':
            jsonResponse(array('success' => true, 'message' => 'Database initialized'));
            break;

        case 'getProducts':
            jsonResponse(getProducts());
            break;

        case 'getAllProducts':
            jsonResponse(getProducts(true));
            break;

        case 'getDailyStock':
            $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
            jsonResponse(getDailyStock($date));
            break;

        case 'getCarryForward':
            $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
            jsonResponse(getCarryForward($date));
            break;

        case 'getSummary':
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
            jsonResponse(getMonthlySummary($month, $year));
            break;

        case 'getShortages':
            $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
            jsonResponse(getShortages($date));
            break;

        case 'getHolidays':
            jsonResponse(getHolidays());
            break;

        case 'getUsers':
            jsonResponse(getUsers());
            break;

        case 'getLineEvents':
            jsonResponse(getLineEvents());
            break;

        case 'getReceives':
            $date = isset($_GET['date']) ? $_GET['date'] : null;
            jsonResponse(getReceives($date));
            break;

        case 'getSettings':
            jsonResponse(getSettings());
            break;

        default:
            jsonResponse(array('success' => false, 'error' => 'Unknown action: ' . $action));
    }
}

function handlePostRequest()
{
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        jsonResponse(array('success' => false, 'error' => 'Invalid JSON data'));
        return;
    }

    $action = isset($data['action']) ? $data['action'] : '';

    switch ($action) {
        case 'login':
            $username = isset($data['username']) ? $data['username'] : '';
            $password = isset($data['password']) ? $data['password'] : '';
            jsonResponse(authenticateUser($username, $password));
            break;

        case 'saveDailyStock':
            $user = isset($data['user']) ? $data['user'] : 'unknown';
            jsonResponse(saveDailyStock($data['date'], $data['stocks'], $user));
            break;

        case 'addProduct':
            jsonResponse(addProduct($data['product']));
            break;

        case 'updateProduct':
            jsonResponse(updateProduct($data['product']));
            break;

        case 'deleteProduct':
            jsonResponse(deleteProduct($data['codeProduct']));
            break;

        case 'toggleProductActive':
            $codeProduct = isset($data['codeProduct']) ? $data['codeProduct'] : 0;
            $isActive = isset($data['isActive']) ? $data['isActive'] : 1;
            jsonResponse(toggleProductActive($codeProduct, $isActive));
            break;

        case 'addUser':
            jsonResponse(addUser($data['user']));
            break;

        case 'updateUser':
            jsonResponse(updateUser($data['user']));
            break;

        case 'deleteUser':
            $username = isset($data['username']) ? $data['username'] : '';
            jsonResponse(deleteUser($username));
            break;

        case 'saveSettings':
            $settings = isset($data['settings']) ? $data['settings'] : array();
            jsonResponse(saveSettings($settings));
            break;

        case 'sendLineNotify':
        case 'sendShortageReport':
            $message = isset($data['message']) ? $data['message'] : '';
            jsonResponse(sendLineMessage($message));
            break;

        case 'addHoliday':
            $holiday = isset($data['holiday']) ? $data['holiday'] : array();
            jsonResponse(addHoliday($holiday));
            break;

        case 'deleteHoliday':
            $id = isset($data['id']) ? $data['id'] : 0;
            jsonResponse(deleteHoliday($id));
            break;

        case 'saveReceive':
            $receive = isset($data['receive']) ? $data['receive'] : array();
            jsonResponse(saveReceive($receive));
            break;

        case 'updateReceive':
            $receive = isset($data['receive']) ? $data['receive'] : array();
            jsonResponse(updateReceive($receive));
            break;

        case 'deleteReceive':
            $date = isset($data['date']) ? $data['date'] : '';
            $productCode = isset($data['productCode']) ? $data['productCode'] : '';
            jsonResponse(deleteReceive($date, $productCode));
            break;

        default:
            jsonResponse(array('success' => false, 'error' => 'Unknown action: ' . $action));
    }
}

// ==================== HELPER FUNCTIONS ====================

function jsonResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ==================== AUTHENTICATION ====================

function authenticateUser($username, $password)
{
    $user = dbSelectOne(
        "SELECT username, password, role, name, permissions FROM users WHERE username = ?",
        array($username)
    );

    if ($user && $user['password'] === $password) {
        // Parse permissions (comma-separated string to array)
        $permissions = array();
        if (!empty($user['permissions'])) {
            $permissions = explode(',', $user['permissions']);
        }

        return array(
            'success' => true,
            'user' => array(
                'username' => $user['username'],
                'role' => $user['role'],
                'name' => $user['name'],
                'permissions' => $permissions
            )
        );
    }

    return array('success' => false, 'error' => 'Invalid username or password');
}

// ==================== PRODUCT MANAGEMENT ====================

function getProducts($includeInactive = false)
{
    if ($includeInactive) {
        $products = dbSelect("SELECT * FROM master_products ORDER BY code_product");
    } else {
        $products = dbSelect("SELECT * FROM master_products WHERE is_active = 1 ORDER BY code_product");
    }

    $result = array();
    foreach ($products as $p) {
        $result[] = array(
            'codeProduct' => (int) $p['code_product'],
            'name' => $p['name'],
            'qtyPerPack' => (int) $p['qty_per_pack'],
            'packUnit' => $p['pack_unit'],
            'sellUnit' => $p['sell_unit'],
            'minQty' => (int) $p['min_qty'],
            'category' => $p['category'],
            'isActive' => isset($p['is_active']) ? (int) $p['is_active'] : 1
        );
    }

    return array('success' => true, 'products' => $result);
}

function addProduct($product)
{
    $name = isset($product['name']) ? $product['name'] : '';
    $qtyPerPack = isset($product['qtyPerPack']) ? $product['qtyPerPack'] : 12;
    $packUnit = isset($product['packUnit']) ? $product['packUnit'] : 'case';
    $sellUnit = isset($product['sellUnit']) ? $product['sellUnit'] : 'bottle';
    $minQty = isset($product['minQty']) ? $product['minQty'] : 60;
    $category = isset($product['category']) ? $product['category'] : 'bar';

    dbExecute(
        "INSERT INTO master_products (name, qty_per_pack, pack_unit, sell_unit, min_qty, category) 
         VALUES (?, ?, ?, ?, ?, ?)",
        array($name, $qtyPerPack, $packUnit, $sellUnit, $minQty, $category)
    );

    return array('success' => true, 'message' => 'Product added successfully');
}

function updateProduct($product)
{
    $codeProduct = isset($product['codeProduct']) ? $product['codeProduct'] : 0;
    $name = isset($product['name']) ? $product['name'] : '';
    $qtyPerPack = isset($product['qtyPerPack']) ? $product['qtyPerPack'] : 12;
    $packUnit = isset($product['packUnit']) ? $product['packUnit'] : 'case';
    $sellUnit = isset($product['sellUnit']) ? $product['sellUnit'] : 'bottle';
    $minQty = isset($product['minQty']) ? $product['minQty'] : 60;
    $category = isset($product['category']) ? $product['category'] : 'bar';

    dbExecute(
        "UPDATE master_products SET 
            name = ?, qty_per_pack = ?, pack_unit = ?, sell_unit = ?, min_qty = ?, category = ?
         WHERE code_product = ?",
        array($name, $qtyPerPack, $packUnit, $sellUnit, $minQty, $category, $codeProduct)
    );

    return array('success' => true, 'message' => 'Product updated successfully');
}

function deleteProduct($codeProduct)
{
    dbExecute("DELETE FROM master_products WHERE code_product = ?", array($codeProduct));
    return array('success' => true, 'message' => 'Product deleted successfully');
}

function toggleProductActive($codeProduct, $isActive)
{
    if (empty($codeProduct)) {
        return array('success' => false, 'error' => 'Product code is required');
    }

    $isActive = $isActive ? 1 : 0;

    dbExecute(
        "UPDATE master_products SET is_active = ? WHERE code_product = ?",
        array($isActive, $codeProduct)
    );

    $statusText = $isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    return array('success' => true, 'message' => $statusText . 'สินค้าเรียบร้อย');
}

// ==================== DAILY STOCK MANAGEMENT ====================

function getDailyStock($date)
{
    $stocks = dbSelect(
        "SELECT * FROM daily_stock WHERE stock_date = ? ORDER BY code_product",
        array($date)
    );

    $result = array();
    foreach ($stocks as $s) {
        $result[] = array(
            'date' => $s['stock_date'],
            'codeProduct' => (int) $s['code_product'],
            'name' => $s['product_name'],
            'carryForward' => (int) $s['carry_forward'],
            'incomingPack' => (int) $s['incoming_pack'],
            'incomingBottle' => (int) $s['incoming_bottle'],
            'transferCoffeePack' => (int) $s['transfer_coffee_pack'],
            'transferCoffee' => (int) $s['transfer_coffee'],
            'transferAPack' => (int) $s['transfer_a_pack'],
            'transferA' => (int) $s['transfer_a'],
            'transferStorePack' => (int) $s['transfer_store_pack'],
            'transferStore' => (int) $s['transfer_store'],
            'withdraw' => (int) $s['withdraw'],
            'ochaCoffee' => (int) (isset($s['ocha_coffee']) ? $s['ocha_coffee'] : 0),
            'ochaBar' => (int) (isset($s['ocha_bar']) ? $s['ocha_bar'] : 0),
            'sold' => (int) $s['sold'],
            'carryOver' => (int) $s['carry_over'],
            'variance' => (int) $s['variance']
        );
    }

    return array('success' => true, 'stocks' => $result);
}

function getCarryForward($date)
{
    // ดึงรายการวันหยุด
    $holidays = dbSelect("SELECT holiday_date FROM holidays");
    $holidayDates = array();
    foreach ($holidays as $h) {
        $holidayDates[] = $h['holiday_date'];
    }

    // หาวันก่อนหน้าที่ไม่ใช่วันหยุด (สูงสุด 7 วัน)
    $prevDate = $date;
    $maxDays = 7;
    for ($i = 0; $i < $maxDays; $i++) {
        $prevDate = date('Y-m-d', strtotime($prevDate . ' -1 day'));
        if (!in_array($prevDate, $holidayDates)) {
            break;
        }
    }

    $stocks = dbSelect(
        "SELECT code_product, carry_over FROM daily_stock WHERE stock_date = ?",
        array($prevDate)
    );

    $carryForward = array();
    foreach ($stocks as $s) {
        $carryForward[$s['code_product']] = array(
            'bottles' => (int) $s['carry_over']
        );
    }

    return array('success' => true, 'carryForward' => $carryForward);
}

function saveDailyStock($date, $stocks, $user)
{
    dbBeginTransaction();

    try {
        dbExecute("DELETE FROM daily_stock WHERE stock_date = ?", array($date));

        $productsResult = getProducts();
        $products = array();
        foreach ($productsResult['products'] as $p) {
            $products[$p['codeProduct']] = $p;
        }

        foreach ($stocks as $stock) {
            $codeProduct = $stock['codeProduct'];
            $product = isset($products[$codeProduct]) ? $products[$codeProduct] : null;
            $qtyPerPack = $product ? $product['qtyPerPack'] : 12;

            $carryForward = isset($stock['carryForward']) ? $stock['carryForward'] : 0;
            $transferCoffeePack = isset($stock['transferCoffeePack']) ? $stock['transferCoffeePack'] : 0;
            $transferCoffee = isset($stock['transferCoffee']) ? $stock['transferCoffee'] : 0;
            $transferAPack = isset($stock['transferAPack']) ? $stock['transferAPack'] : 0;
            $transferA = isset($stock['transferA']) ? $stock['transferA'] : 0;
            $transferStorePack = isset($stock['transferStorePack']) ? $stock['transferStorePack'] : 0;
            $transferStore = isset($stock['transferStore']) ? $stock['transferStore'] : 0;
            $withdraw = isset($stock['withdraw']) ? $stock['withdraw'] : 0;
            $ochaCoffee = isset($stock['ochaCoffee']) ? $stock['ochaCoffee'] : 0;
            $ochaBar = isset($stock['ochaBar']) ? $stock['ochaBar'] : 0;
            $sold = $ochaCoffee + $ochaBar;
            $incomingPack = isset($stock['incomingPack']) ? $stock['incomingPack'] : 0;
            $incomingBottle = isset($stock['incomingBottle']) ? $stock['incomingBottle'] : 0;
            $productName = isset($stock['name']) ? $stock['name'] : '';

            $coffeeBottles = $transferCoffeePack * $qtyPerPack + $transferCoffee;
            $aBottles = $transferAPack * $qtyPerPack + $transferA;
            $storeBottles = $transferStorePack * $qtyPerPack + $transferStore;
            $incomingBottles = $incomingPack * $qtyPerPack + $incomingBottle;
            // รวมเย็น = กาแฟ + บาร์น้ำ + สโตร์ + เบิกออก
            $eveningTotal = $coffeeBottles + $aBottles + $storeBottles + $withdraw;
            // เช้า-เย็น = ยอดยกมา + รับเข้า - รวมเย็น
            $morningEvening = $carryForward + $incomingBottles - $eveningTotal;
            // ยอดยกไป = รวมเย็น - เบิกออก
            $carryOver = $eveningTotal - $withdraw;
            // ขาด/เกิน = ยอดขาย(Ocha) - เช้า-เย็น
            $variance = $sold - $morningEvening;

            dbExecute(
                "INSERT INTO daily_stock 
                 (stock_date, code_product, product_name, carry_forward, 
                  incoming_pack, incoming_bottle, 
                  transfer_coffee_pack, transfer_coffee, 
                  transfer_a_pack, transfer_a, 
                  transfer_store_pack, transfer_store, 
                  withdraw, ocha_coffee, ocha_bar, sold, carry_over, variance)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                array(
                    $date,
                    $codeProduct,
                    $productName,
                    $carryForward,
                    $incomingPack,
                    $incomingBottle,
                    $transferCoffeePack,
                    $transferCoffee,
                    $transferAPack,
                    $transferA,
                    $transferStorePack,
                    $transferStore,
                    $withdraw,
                    $ochaCoffee,
                    $ochaBar,
                    $sold,
                    $carryOver,
                    $variance
                )
            );

            logTransaction($date, $stock, $qtyPerPack, $user);
        }

        // Recalculate carry_forward ของวันถัดไปทั้งหมดที่มีข้อมูลแล้ว
        recalculateSubsequentDays($date);

        dbCommit();
        return array('success' => true, 'message' => 'Data saved successfully');

    } catch (Exception $e) {
        dbRollback();
        return array('success' => false, 'error' => $e->getMessage());
    }
}

/**
 * Recalculate carry_forward for all dates after $savedDate
 * เมื่อบันทึกข้อมูลย้อนหลัง ต้อง recalculate ยอดยกมาของวันถัดไปทั้งหมด
 */
function recalculateSubsequentDays($savedDate)
{
    // ดึงรายการวันหยุด
    $holidays = dbSelect("SELECT holiday_date FROM holidays");
    $holidayDates = array();
    foreach ($holidays as $h) {
        $holidayDates[] = $h['holiday_date'];
    }

    // ดึงข้อมูลสินค้า
    $productsResult = getProducts();
    $products = array();
    foreach ($productsResult['products'] as $p) {
        $products[$p['codeProduct']] = $p;
    }

    // หาวันที่มีข้อมูลหลังจากวันที่บันทึก
    $futureDates = dbSelect(
        "SELECT DISTINCT stock_date FROM daily_stock WHERE stock_date > ? ORDER BY stock_date",
        array($savedDate)
    );

    if (empty($futureDates)) {
        return;
    }

    foreach ($futureDates as $fd) {
        $currentDate = $fd['stock_date'];

        // หาวันก่อนหน้าที่ไม่ใช่วันหยุด (เหมือน getCarryForward)
        $prevDate = $currentDate;
        for ($i = 0; $i < 7; $i++) {
            $prevDate = date('Y-m-d', strtotime($prevDate . ' -1 day'));
            if (!in_array($prevDate, $holidayDates)) {
                break;
            }
        }

        // ดึง carry_over ของวันก่อนหน้า
        $prevStocks = dbSelect(
            "SELECT code_product, carry_over FROM daily_stock WHERE stock_date = ?",
            array($prevDate)
        );

        $carryOverMap = array();
        foreach ($prevStocks as $ps) {
            $carryOverMap[$ps['code_product']] = (int) $ps['carry_over'];
        }

        // ดึงข้อมูลวันปัจจุบัน
        $currentStocks = dbSelect(
            "SELECT * FROM daily_stock WHERE stock_date = ?",
            array($currentDate)
        );

        $hasChanges = false;

        foreach ($currentStocks as $cs) {
            $codeProduct = $cs['code_product'];
            $product = isset($products[$codeProduct]) ? $products[$codeProduct] : null;
            $qtyPerPack = $product ? $product['qtyPerPack'] : 12;

            // carry_forward ใหม่ = carry_over ของวันก่อนหน้า
            $newCarryForward = isset($carryOverMap[$codeProduct]) ? $carryOverMap[$codeProduct] : 0;

            // ถ้าไม่เปลี่ยน ข้ามไป
            if ((int) $cs['carry_forward'] === $newCarryForward) {
                continue;
            }

            $hasChanges = true;

            // คำนวณค่าที่เปลี่ยนตาม carry_forward ใหม่
            $incomingBottles = (int) $cs['incoming_pack'] * $qtyPerPack + (int) $cs['incoming_bottle'];
            $coffeeBottles = (int) $cs['transfer_coffee_pack'] * $qtyPerPack + (int) $cs['transfer_coffee'];
            $aBottles = (int) $cs['transfer_a_pack'] * $qtyPerPack + (int) $cs['transfer_a'];
            $storeBottles = (int) $cs['transfer_store_pack'] * $qtyPerPack + (int) $cs['transfer_store'];
            $withdraw = (int) $cs['withdraw'];
            $sold = (int) $cs['sold'];

            $eveningTotal = $coffeeBottles + $aBottles + $storeBottles + $withdraw;
            $morningEvening = $newCarryForward + $incomingBottles - $eveningTotal;
            $variance = $sold - $morningEvening;
            // carry_over ไม่เปลี่ยน เพราะไม่ขึ้นกับ carry_forward

            dbExecute(
                "UPDATE daily_stock SET carry_forward = ?, variance = ? WHERE stock_date = ? AND code_product = ?",
                array($newCarryForward, $variance, $currentDate, $codeProduct)
            );
        }

        // ถ้าวันนี้ไม่มีอะไรเปลี่ยน วันถัดไปก็ไม่ต้องเปลี่ยน (carry_over ไม่เปลี่ยน)
        if (!$hasChanges) {
            break;
        }
    }
}

function logTransaction($date, $stock, $qtyPerPack, $user)
{
    $timestamp = date('Y-m-d H:i:s');
    $codeProduct = $stock['codeProduct'];

    $incomingPack = isset($stock['incomingPack']) ? $stock['incomingPack'] : 0;
    $incomingBottle = isset($stock['incomingBottle']) ? $stock['incomingBottle'] : 0;

    if ($incomingPack > 0 || $incomingBottle > 0) {
        $qty = $incomingPack * $qtyPerPack + $incomingBottle;
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'receive', ?, ?, 'bottle', 'receive', ?)",
            array($timestamp, $codeProduct, $qty, $user)
        );
    }

    $transferCoffeePack = isset($stock['transferCoffeePack']) ? $stock['transferCoffeePack'] : 0;
    $transferCoffee = isset($stock['transferCoffee']) ? $stock['transferCoffee'] : 0;
    $coffeeBottles = $transferCoffeePack * $qtyPerPack + $transferCoffee;
    if ($coffeeBottles > 0) {
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'transfer', ?, ?, 'bottle', 'coffee', ?)",
            array($timestamp, $codeProduct, $coffeeBottles, $user)
        );
    }

    $transferAPack = isset($stock['transferAPack']) ? $stock['transferAPack'] : 0;
    $transferA = isset($stock['transferA']) ? $stock['transferA'] : 0;
    $aBottles = $transferAPack * $qtyPerPack + $transferA;
    if ($aBottles > 0) {
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'transfer', ?, ?, 'bottle', 'side_a', ?)",
            array($timestamp, $codeProduct, $aBottles, $user)
        );
    }

    $transferStorePack = isset($stock['transferStorePack']) ? $stock['transferStorePack'] : 0;
    $transferStore = isset($stock['transferStore']) ? $stock['transferStore'] : 0;
    $storeBottles = $transferStorePack * $qtyPerPack + $transferStore;
    if ($storeBottles > 0) {
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'transfer', ?, ?, 'bottle', 'store', ?)",
            array($timestamp, $codeProduct, $storeBottles, $user)
        );
    }

    $withdraw = isset($stock['withdraw']) ? $stock['withdraw'] : 0;
    if ($withdraw > 0) {
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'withdraw', ?, ?, 'bottle', 'other', ?)",
            array($timestamp, $codeProduct, $withdraw, $user)
        );
    }

    $sold = isset($stock['sold']) ? $stock['sold'] : 0;
    if ($sold > 0) {
        dbExecute(
            "INSERT INTO transactions (timestamp, type, product_code, quantity, unit, note, user) 
             VALUES (?, 'sell', ?, ?, 'bottle', 'sell', ?)",
            array($timestamp, $codeProduct, $sold, $user)
        );
    }
}

// ==================== SHORTAGE DETECTION ====================

function getShortages($date)
{
    $stockResult = getDailyStock($date);

    if (!$stockResult['success']) {
        return array('success' => false, 'error' => 'Cannot fetch data');
    }

    $shortages = array();
    foreach ($stockResult['stocks'] as $stock) {
        if ($stock['variance'] !== 0) {
            $shortages[] = array(
                'codeProduct' => $stock['codeProduct'],
                'name' => $stock['name'],
                'variance' => $stock['variance']
            );
        }
    }

    usort($shortages, function ($a, $b) {
        return $a['variance'] - $b['variance'];
    });

    return array('success' => true, 'shortages' => $shortages);
}

// ==================== MONTHLY SUMMARY ====================

function getMonthlySummary($month, $year)
{
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = date('Y-m-t', strtotime($startDate));

    $stocks = dbSelect(
        "SELECT stock_date, code_product, product_name, variance 
         FROM daily_stock 
         WHERE stock_date BETWEEN ? AND ? 
         ORDER BY code_product, stock_date",
        array($startDate, $endDate)
    );

    $summary = array();
    foreach ($stocks as $s) {
        $code = $s['code_product'];
        $day = (int) date('j', strtotime($s['stock_date']));

        if (!isset($summary[$code])) {
            $summary[$code] = array(
                'name' => $s['product_name'],
                'days' => array()
            );
        }

        $summary[$code]['days'][$day] = array(
            'variance' => (int) $s['variance']
        );
    }

    return array('success' => true, 'summary' => $summary);
}

// ==================== USER MANAGEMENT ====================

function getUsers()
{
    $users = dbSelect("SELECT id, username, role, name, permissions FROM users ORDER BY id");

    $result = array();
    foreach ($users as $u) {
        // Parse permissions
        $permissions = array();
        if (!empty($u['permissions'])) {
            $permissions = explode(',', $u['permissions']);
        }

        $result[] = array(
            'id' => (int) $u['id'],
            'username' => $u['username'],
            'role' => $u['role'],
            'name' => $u['name'],
            'permissions' => $permissions
        );
    }

    return array('success' => true, 'users' => $result);
}

function addUser($user)
{
    $username = isset($user['username']) ? $user['username'] : '';
    $existing = dbSelectOne("SELECT id FROM users WHERE username = ?", array($username));
    if ($existing) {
        return array('success' => false, 'error' => 'Username already exists');
    }

    $password = isset($user['password']) ? $user['password'] : '';
    $role = isset($user['role']) ? $user['role'] : 'user';
    $name = isset($user['name']) ? $user['name'] : '';

    // Handle permissions - can be array or comma-separated string
    $permissions = '';
    if (isset($user['permissions'])) {
        if (is_array($user['permissions'])) {
            $permissions = implode(',', $user['permissions']);
        } else {
            $permissions = $user['permissions'];
        }
    } else {
        // Default permissions for new users
        $permissions = 'dashboard,daily,receive,countCoffee,countA,countStore,sales,withdraw,reports';
    }

    dbExecute(
        "INSERT INTO users (username, password, role, name, permissions) VALUES (?, ?, ?, ?, ?)",
        array($username, $password, $role, $name, $permissions)
    );

    return array('success' => true, 'message' => 'User added successfully');
}

function updateUser($user)
{
    $username = isset($user['username']) ? $user['username'] : '';
    if (empty($username)) {
        return array('success' => false, 'error' => 'Username is required');
    }

    $existing = dbSelectOne("SELECT id FROM users WHERE username = ?", array($username));
    if (!$existing) {
        return array('success' => false, 'error' => 'User not found');
    }

    $role = isset($user['role']) ? $user['role'] : 'user';
    $name = isset($user['name']) ? $user['name'] : '';

    // Handle permissions
    $permissions = '';
    if (isset($user['permissions'])) {
        if (is_array($user['permissions'])) {
            $permissions = implode(',', $user['permissions']);
        } else {
            $permissions = $user['permissions'];
        }
    }

    // Check if password needs update
    $password = isset($user['password']) ? $user['password'] : '';

    if (!empty($password)) {
        // Update with new password
        dbExecute(
            "UPDATE users SET password = ?, role = ?, name = ?, permissions = ? WHERE username = ?",
            array($password, $role, $name, $permissions, $username)
        );
    } else {
        // Update without password
        dbExecute(
            "UPDATE users SET role = ?, name = ?, permissions = ? WHERE username = ?",
            array($role, $name, $permissions, $username)
        );
    }

    return array('success' => true, 'message' => 'User updated successfully');
}

function deleteUser($username)
{
    if (empty($username)) {
        return array('success' => false, 'error' => 'Username is required');
    }

    // Prevent deleting admin
    if ($username === 'admin') {
        return array('success' => false, 'error' => 'Cannot delete admin user');
    }

    dbExecute("DELETE FROM users WHERE username = ?", array($username));
    return array('success' => true, 'message' => 'User deleted successfully');
}

// ==================== LINE MESSAGING API ====================

function normalizeSettingKey($key)
{
    $keyMap = array(
        'lineChannelToken' => 'line_channel_token',
        'lineTargetId' => 'line_target_id',
        'restaurantName' => 'restaurant_name'
    );

    return isset($keyMap[$key]) ? $keyMap[$key] : $key;
}

function getSettings()
{
    $settings = dbSelect("SELECT setting_key, setting_value FROM settings");

    $result = array();
    foreach ($settings as $s) {
        $result[$s['setting_key']] = $s['setting_value'];
    }

    // Backward-compatible aliases for frontend (camelCase)
    if (isset($result['line_channel_token'])) {
        $result['lineChannelToken'] = $result['line_channel_token'];
    }
    if (isset($result['line_target_id'])) {
        $result['lineTargetId'] = $result['line_target_id'];
    }
    if (isset($result['restaurant_name'])) {
        $result['restaurantName'] = $result['restaurant_name'];
    }

    return array('success' => true, 'settings' => $result);
}

function saveSettings($settings)
{
    if (!is_array($settings)) {
        return array('success' => false, 'error' => 'Invalid settings format');
    }

    // Handle both formats:
    // 1. Object format: { restaurantName: "xxx", lineChannelToken: "yyy" }
    // 2. Array format: [{ key: "restaurantName", value: "xxx" }, ...]

    // Check if it's the object format (no 'key' in first element or numeric keys)
    $isObjectFormat = true;
    foreach ($settings as $k => $v) {
        if (is_array($v) && isset($v['key'])) {
            $isObjectFormat = false;
            break;
        }
    }

    if ($isObjectFormat) {
        // Object format: key => value directly
        foreach ($settings as $key => $value) {
            $key = normalizeSettingKey($key);
            if (empty($key))
                continue;

            // Check if exists
            $existing = dbSelectOne("SELECT setting_key FROM settings WHERE setting_key = ?", array($key));

            if ($existing) {
                dbExecute("UPDATE settings SET setting_value = ? WHERE setting_key = ?", array($value, $key));
            } else {
                dbExecute("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", array($key, $value));
            }
        }
    } else {
        // Array format: [{key, value}, ...]
        foreach ($settings as $setting) {
            $key = isset($setting['key']) ? $setting['key'] : '';
            $key = normalizeSettingKey($key);
            $value = isset($setting['value']) ? $setting['value'] : '';

            if (empty($key))
                continue;

            $existing = dbSelectOne("SELECT setting_key FROM settings WHERE setting_key = ?", array($key));

            if ($existing) {
                dbExecute("UPDATE settings SET setting_value = ? WHERE setting_key = ?", array($value, $key));
            } else {
                dbExecute("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", array($key, $value));
            }
        }
    }

    return array('success' => true, 'message' => 'Settings saved successfully');
}

function getLineSetting($key)
{
    $key = normalizeSettingKey($key);
    $setting = dbSelectOne("SELECT setting_value FROM settings WHERE setting_key = ?", array($key));
    if ($setting) {
        return $setting['setting_value'];
    }

    // Backward compatibility: support old camelCase keys if they were saved previously
    if ($key === 'line_channel_token') {
        $legacy = dbSelectOne("SELECT setting_value FROM settings WHERE setting_key = ?", array('lineChannelToken'));
        return $legacy ? $legacy['setting_value'] : '';
    }

    if ($key === 'line_target_id') {
        $legacy = dbSelectOne("SELECT setting_value FROM settings WHERE setting_key = ?", array('lineTargetId'));
        return $legacy ? $legacy['setting_value'] : '';
    }

    return '';
}

function sendLineMessage($message)
{
    // Get settings from database
    $channelToken = getLineSetting('line_channel_token');
    $targetId = getLineSetting('line_target_id');

    // Check if settings exist
    if (empty($channelToken) || empty($targetId)) {
        return array(
            'success' => false,
            'error' => 'LINE Messaging API not configured. Please set Channel Access Token and Group/User ID in Settings.'
        );
    }

    if (empty($message)) {
        return array('success' => false, 'error' => 'Message is empty');
    }

    // LINE Messaging API endpoint
    $url = 'https://api.line.me/v2/bot/message/push';

    // Build request body
    $data = array(
        'to' => $targetId,
        'messages' => array(
            array(
                'type' => 'text',
                'text' => $message
            )
        )
    );

    // Make HTTP request using cURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'Authorization: Bearer ' . $channelToken
    ));
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return array('success' => false, 'error' => 'cURL Error: ' . $error);
    }

    if ($httpCode === 200) {
        return array('success' => true, 'message' => 'ส่งข้อความ LINE สำเร็จ');
    } else {
        $responseData = json_decode($response, true);
        $errorMsg = isset($responseData['message']) ? $responseData['message'] : 'Unknown error';
        return array('success' => false, 'error' => 'LINE API Error (' . $httpCode . '): ' . $errorMsg);
    }
}

function getLineEvents()
{
    // Check if table exists
    $tableCheck = dbSelect("SHOW TABLES LIKE 'line_events'");
    if (empty($tableCheck)) {
        return array('success' => true, 'events' => array(), 'message' => 'ยังไม่มีข้อมูล Webhook');
    }

    $events = dbSelect("SELECT * FROM line_events ORDER BY created_at DESC LIMIT 50");

    $result = array();
    foreach ($events as $e) {
        $result[] = array(
            'id' => (int) $e['id'],
            'lineId' => $e['line_id'],
            'eventType' => $e['event_type'],
            'createdAt' => $e['created_at']
        );
    }

    return array('success' => true, 'events' => $result);
}

// ==================== HOLIDAY MANAGEMENT ====================

function getHolidays()
{
    $holidays = dbSelect("SELECT * FROM holidays ORDER BY holiday_date DESC");

    $result = array();
    foreach ($holidays as $h) {
        $result[] = array(
            'id' => (int) $h['id'],
            'holidayDate' => $h['holiday_date'],
            'description' => $h['description']
        );
    }

    return array('success' => true, 'holidays' => $result);
}

function addHoliday($holiday)
{
    $holidayDate = isset($holiday['holidayDate']) ? $holiday['holidayDate'] : '';
    $description = isset($holiday['description']) ? $holiday['description'] : '';

    if (empty($holidayDate)) {
        return array('success' => false, 'error' => 'กรุณาระบุวันที่');
    }

    // Check if already exists
    $existing = dbSelectOne("SELECT id FROM holidays WHERE holiday_date = ?", array($holidayDate));
    if ($existing) {
        return array('success' => false, 'error' => 'วันหยุดนี้มีอยู่แล้ว');
    }

    dbExecute(
        "INSERT INTO holidays (holiday_date, description) VALUES (?, ?)",
        array($holidayDate, $description)
    );

    return array('success' => true, 'message' => 'เพิ่มวันหยุดเรียบร้อย');
}

function deleteHoliday($id)
{
    if (empty($id)) {
        return array('success' => false, 'error' => 'กรุณาระบุ ID');
    }

    dbExecute("DELETE FROM holidays WHERE id = ?", array($id));
    return array('success' => true, 'message' => 'ลบวันหยุดเรียบร้อย');
}

// ==================== RECEIVES MANAGEMENT ====================

function getReceives($date = null)
{
    // Check if table exists
    $tableCheck = dbSelect("SHOW TABLES LIKE 'receives'");
    if (empty($tableCheck)) {
        return array('success' => true, 'receives' => array(), 'message' => 'ยังไม่มีตาราง receives');
    }

    if ($date) {
        $receives = dbSelect(
            "SELECT * FROM receives WHERE receive_date = ? ORDER BY code_product",
            array($date)
        );
    } else {
        $receives = dbSelect("SELECT * FROM receives ORDER BY receive_date DESC, code_product");
    }

    $result = array();
    foreach ($receives as $r) {
        $result[] = array(
            'date' => $r['receive_date'],
            'productCode' => $r['code_product'],
            'productName' => $r['product_name'],
            'pack' => (int) $r['pack'],
            'bottle' => (int) $r['bottle'],
            'note' => $r['note'],
            'user' => $r['user'],
            'timestamp' => $r['updated_at']
        );
    }

    return array('success' => true, 'receives' => $result);
}

function saveReceive($receive)
{
    $date = isset($receive['date']) ? $receive['date'] : '';
    $productCode = isset($receive['productCode']) ? $receive['productCode'] : '';
    $productName = isset($receive['productName']) ? $receive['productName'] : '';
    $pack = isset($receive['pack']) ? (int) $receive['pack'] : 0;
    $bottle = isset($receive['bottle']) ? (int) $receive['bottle'] : 0;
    $note = isset($receive['note']) ? $receive['note'] : '';
    $user = isset($receive['user']) ? $receive['user'] : '';

    if (empty($date) || empty($productCode)) {
        return array('success' => false, 'error' => 'กรุณาระบุวันที่และรหัสสินค้า');
    }

    // Check if exists
    $existing = dbSelectOne(
        "SELECT id, pack, bottle FROM receives WHERE receive_date = ? AND code_product = ?",
        array($date, $productCode)
    );

    if ($existing) {
        // Add to existing quantities
        $newPack = (int) $existing['pack'] + $pack;
        $newBottle = (int) $existing['bottle'] + $bottle;

        dbExecute(
            "UPDATE receives SET pack = ?, bottle = ?, note = ?, user = ? WHERE id = ?",
            array($newPack, $newBottle, $note, $user, $existing['id'])
        );

        return array('success' => true, 'message' => 'อัพเดทรายการรับเข้าเรียบร้อย');
    } else {
        // Insert new
        dbExecute(
            "INSERT INTO receives (receive_date, code_product, product_name, pack, bottle, note, user) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            array($date, $productCode, $productName, $pack, $bottle, $note, $user)
        );

        return array('success' => true, 'message' => 'บันทึกรายการรับเข้าเรียบร้อย');
    }
}

function updateReceive($receive)
{
    $date = isset($receive['date']) ? $receive['date'] : '';
    $productCode = isset($receive['productCode']) ? $receive['productCode'] : '';
    $productName = isset($receive['productName']) ? $receive['productName'] : '';
    $pack = isset($receive['pack']) ? (int) $receive['pack'] : 0;
    $bottle = isset($receive['bottle']) ? (int) $receive['bottle'] : 0;
    $note = isset($receive['note']) ? $receive['note'] : '';
    $user = isset($receive['user']) ? $receive['user'] : '';

    if (empty($date) || empty($productCode)) {
        return array('success' => false, 'error' => 'กรุณาระบุวันที่และรหัสสินค้า');
    }

    // Check if exists
    $existing = dbSelectOne(
        "SELECT id FROM receives WHERE receive_date = ? AND code_product = ?",
        array($date, $productCode)
    );

    if ($existing) {
        // Replace quantities (not add)
        dbExecute(
            "UPDATE receives SET product_name = ?, pack = ?, bottle = ?, note = ?, user = ? WHERE id = ?",
            array($productName, $pack, $bottle, $note, $user, $existing['id'])
        );

        return array('success' => true, 'message' => 'แก้ไขรายการรับเข้าเรียบร้อย');
    } else {
        // Insert new
        dbExecute(
            "INSERT INTO receives (receive_date, code_product, product_name, pack, bottle, note, user) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            array($date, $productCode, $productName, $pack, $bottle, $note, $user)
        );

        return array('success' => true, 'message' => 'บันทึกรายการรับเข้าเรียบร้อย');
    }
}

function deleteReceive($date, $productCode)
{
    if (empty($date) || empty($productCode)) {
        return array('success' => false, 'error' => 'กรุณาระบุวันที่และรหัสสินค้า');
    }

    dbExecute(
        "DELETE FROM receives WHERE receive_date = ? AND code_product = ?",
        array($date, $productCode)
    );

    return array('success' => true, 'message' => 'ลบรายการรับเข้าเรียบร้อย');
}
?>