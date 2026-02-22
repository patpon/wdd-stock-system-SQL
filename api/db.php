<?php
/**
 * Database Connection Configuration
 * การเชื่อมต่อฐานข้อมูล MySQL (using mysqli)
 * 
 * วิธีใช้งาน:
 * 1. แก้ไขค่าด้านล่างให้ตรงกับข้อมูล Database ที่สร้างใน DirectAdmin
 * 2. ค่าเหล่านี้ได้จากตอนสร้าง Database ใน MySQL Management
 */

// ==================== CONFIGURATION ====================
// แก้ไขค่าเหล่านี้ให้ตรงกับ Database ของคุณ

define('DB_HOST', 'localhost');           // โดยปกติคือ localhost
define('DB_NAME', 'ajpatpon_wddbar');  // ชื่อ Database ที่สร้าง
define('DB_USER', 'ajpatpon_wddbar');  // Username ที่สร้าง
define('DB_PASS', 'P^Y5Mypeq$s02xov'); // Password ที่ตั้ง
define('DB_CHARSET', 'utf8mb4');

// ==================== CONNECTION ====================

/**
 * Get mysqli Database Connection
 */
function getDB() {
    static $mysqli = null;
    
    if ($mysqli === null) {
        $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($mysqli->connect_error) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(array(
                'success' => false,
                'error' => 'Database connection failed: ' . $mysqli->connect_error
            ));
            exit;
        }
        
        $mysqli->set_charset(DB_CHARSET);
    }
    
    return $mysqli;
}

/**
 * Bind params helper for mysqli prepared statements
 */
function dbBindParams($stmt, $params) {
    if (empty($params)) return;
    
    $types = '';
    foreach ($params as $param) {
        if (is_int($param)) {
            $types .= 'i';
        } elseif (is_float($param)) {
            $types .= 'd';
        } else {
            $types .= 's';
        }
    }
    
    $refs = array($types);
    for ($i = 0; $i < count($params); $i++) {
        $refs[] = &$params[$i];
    }
    
    call_user_func_array(array($stmt, 'bind_param'), $refs);
}

/**
 * Execute SELECT query and return results
 */
function dbSelect($sql, $params = array()) {
    $db = getDB();
    $stmt = $db->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error . ' SQL: ' . $sql);
    }
    
    if (!empty($params)) {
        dbBindParams($stmt, $params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = array();
    
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    
    $stmt->close();
    return $rows;
}

/**
 * Execute SELECT query and return single row
 */
function dbSelectOne($sql, $params = array()) {
    $db = getDB();
    $stmt = $db->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error . ' SQL: ' . $sql);
    }
    
    if (!empty($params)) {
        dbBindParams($stmt, $params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    return $row;
}

/**
 * Execute INSERT/UPDATE/DELETE query
 */
function dbExecute($sql, $params = array()) {
    $db = getDB();
    $stmt = $db->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $db->error . ' SQL: ' . $sql);
    }
    
    if (!empty($params)) {
        dbBindParams($stmt, $params);
    }
    
    $result = $stmt->execute();
    $stmt->close();
    return $result;
}

/**
 * Get last insert ID
 */
function dbLastInsertId() {
    return getDB()->insert_id;
}

/**
 * Begin transaction
 */
function dbBeginTransaction() {
    return getDB()->begin_transaction();
}

/**
 * Commit transaction
 */
function dbCommit() {
    return getDB()->commit();
}

/**
 * Rollback transaction
 */
function dbRollback() {
    return getDB()->rollback();
}
?>