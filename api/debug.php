<?php
/**
 * API Debug Test
 * ทดสอบ API ทีละส่วน
 */

// Show all errors
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔧 API Debug Test</h1>";

// Step 1: Check PHP version
echo "<h2>1. PHP Version</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Step 2: Check if db.php can be loaded
echo "<h2>2. Loading db.php</h2>";
try {
    require_once 'db.php';
    echo "<p style='color:green'>✅ db.php loaded successfully</p>";
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
    exit;
}

// Step 3: Test database connection
echo "<h2>3. Database Connection</h2>";
try {
    $pdo = getDB();
    echo "<p style='color:green'>✅ Database connected</p>";
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
    exit;
}

// Step 4: Test getProducts function
echo "<h2>4. Testing getProducts</h2>";
try {
    // Define the function inline first
    $products = dbSelect("SELECT * FROM master_products ORDER BY code_product LIMIT 3");
    echo "<p style='color:green'>✅ Query successful, found " . count($products) . " products</p>";
    echo "<pre>" . print_r($products, true) . "</pre>";
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
}

// Step 5: Test JSON encoding
echo "<h2>5. Testing JSON Encoding</h2>";
try {
    $result = ['success' => true, 'products' => $products];
    $json = json_encode($result, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        echo "<p style='color:red'>❌ JSON encode error: " . json_last_error_msg() . "</p>";
    } else {
        echo "<p style='color:green'>✅ JSON encoding works</p>";
        echo "<pre>" . htmlspecialchars(substr($json, 0, 500)) . "...</pre>";
    }
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
}

// Step 6: Check if api.php syntax is valid
echo "<h2>6. Checking api.php Syntax</h2>";
$output = shell_exec('php -l api.php 2>&1');
if (strpos($output, 'No syntax errors') !== false) {
    echo "<p style='color:green'>✅ api.php has no syntax errors</p>";
} else {
    echo "<p style='color:red'>❌ Syntax check result:</p>";
    echo "<pre>" . htmlspecialchars($output) . "</pre>";
}

echo "<hr><p>⚠️ ลบไฟล์นี้หลังทดสอบเสร็จ</p>";
?>