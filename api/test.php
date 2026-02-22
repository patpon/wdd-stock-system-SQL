<?php
/**
 * Database Connection Test
 * ทดสอบการเชื่อมต่อ Database
 * 
 * เมื่อทดสอบเสร็จแล้ว ให้ลบไฟล์นี้ออกเพื่อความปลอดภัย
 */

header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔧 Database Connection Test</h1>";

// Check if db.php exists
if (!file_exists('db.php')) {
    echo "<p style='color:red'>❌ ไม่พบไฟล์ db.php</p>";
    exit;
}

echo "<p>✅ พบไฟล์ db.php</p>";

// Try to include db.php
try {
    require_once 'db.php';
    echo "<p>✅ โหลด db.php สำเร็จ</p>";
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error loading db.php: " . $e->getMessage() . "</p>";
    exit;
}

// Display configuration (hide password)
echo "<h2>📋 Configuration</h2>";
echo "<ul>";
echo "<li>DB_HOST: " . DB_HOST . "</li>";
echo "<li>DB_NAME: " . DB_NAME . "</li>";
echo "<li>DB_USER: " . DB_USER . "</li>";
echo "<li>DB_PASS: ****" . substr(DB_PASS, -4) . "</li>";
echo "</ul>";

// Test connection
echo "<h2>🔌 Testing Connection</h2>";

try {
    $pdo = getDB();
    echo "<p style='color:green; font-weight:bold'>✅ เชื่อมต่อ Database สำเร็จ!</p>";

    // Test query
    echo "<h2>📊 Testing Query</h2>";
    $result = dbSelect("SELECT COUNT(*) as count FROM master_products");
    echo "<p>✅ จำนวนสินค้าในตาราง: " . $result[0]['count'] . " รายการ</p>";

    $users = dbSelect("SELECT username, role FROM users");
    echo "<p>✅ ผู้ใช้ในระบบ:</p><ul>";
    foreach ($users as $u) {
        echo "<li>{$u['username']} ({$u['role']})</li>";
    }
    echo "</ul>";

} catch (PDOException $e) {
    echo "<p style='color:red'>❌ Connection Error: " . $e->getMessage() . "</p>";

    // Common error hints
    $errorMsg = $e->getMessage();
    echo "<h3>💡 Possible Solutions:</h3><ul>";

    if (strpos($errorMsg, 'Access denied') !== false) {
        echo "<li>Username หรือ Password ไม่ถูกต้อง</li>";
        echo "<li>ตรวจสอบใน DirectAdmin → MySQL Management</li>";
    }
    if (strpos($errorMsg, 'Unknown database') !== false) {
        echo "<li>ชื่อ Database ไม่ถูกต้อง</li>";
        echo "<li>ตรวจสอบชื่อ Database ให้ตรงกับที่สร้างใน DirectAdmin</li>";
    }
    if (strpos($errorMsg, 'Could not find driver') !== false) {
        echo "<li>PHP ไม่มี PDO MySQL driver</li>";
        echo "<li>ติดต่อ Hosting Support เพื่อเปิดใช้งาน</li>";
    }
    echo "</ul>";
} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
}

echo "<hr><p style='color:gray'>⚠️ ลบไฟล์นี้หลังทดสอบเสร็จ</p>";
?>