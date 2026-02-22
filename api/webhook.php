<?php
/**
 * LINE Webhook Endpoint
 * ใช้รับ Webhook events จาก LINE Platform
 * 
 * URL: https://yourdomain.com/bar-stock-system/api/webhook.php
 * ตั้งค่า Webhook URL นี้ใน LINE Developers Console
 */

// Allow LINE Platform to access this endpoint
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Line-Signature');
header('Content-Type: application/json; charset=utf-8');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Handle GET request (for simple verification)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode(array('status' => 'ok', 'message' => 'LINE Webhook is ready'));
    exit;
}

// Include database connection
require_once 'db.php';

// Get the request body
$body = file_get_contents('php://input');

// Log webhook data for debugging (optional)
$logFile = __DIR__ . '/webhook_log.txt';
$logData = date('Y-m-d H:i:s') . " - " . $body . "\n";
file_put_contents($logFile, $logData, FILE_APPEND);

// Decode JSON
$events = json_decode($body, true);

if (!$events || !isset($events['events'])) {
    http_response_code(200);
    echo json_encode(array('status' => 'ok'));
    exit;
}

// Process each event
foreach ($events['events'] as $event) {
    $eventType = isset($event['type']) ? $event['type'] : '';
    $source = isset($event['source']) ? $event['source'] : array();
    $sourceType = isset($source['type']) ? $source['type'] : '';

    // Check if event is from a group
    if ($sourceType === 'group') {
        $groupId = isset($source['groupId']) ? $source['groupId'] : '';

        if (!empty($groupId)) {
            // Save Group ID to database
            saveGroupId($groupId, $eventType);
        }
    }

    // Check if event is from a room
    if ($sourceType === 'room') {
        $roomId = isset($source['roomId']) ? $source['roomId'] : '';

        if (!empty($roomId)) {
            saveGroupId($roomId, $eventType . '_room');
        }
    }

    // Also save User ID if available
    if (isset($source['userId'])) {
        $userId = $source['userId'];
        saveUserId($userId);
    }
}

// Return success response to LINE
http_response_code(200);
echo json_encode(array('status' => 'ok'));

/**
 * Save Group ID to settings
 */
function saveGroupId($groupId, $eventType)
{
    // Check if already saved
    $existing = dbSelectOne("SELECT setting_value FROM settings WHERE setting_key = 'line_target_id'", array());

    // Save to settings
    if ($existing) {
        // Update only if Group ID is different and current is empty
        if (empty($existing['setting_value']) || $existing['setting_value'] !== $groupId) {
            dbExecute(
                "UPDATE settings SET setting_value = ? WHERE setting_key = 'line_target_id'",
                array($groupId)
            );
        }
    } else {
        // Insert new
        dbExecute(
            "INSERT INTO settings (setting_key, setting_value) VALUES ('line_target_id', ?)",
            array($groupId)
        );
    }

    // Also log to a separate table for reference
    logLineEvent($groupId, $eventType);
}

/**
 * Save User ID for reference
 */
function saveUserId($userId)
{
    logLineEvent($userId, 'user');
}

/**
 * Log LINE events
 */
function logLineEvent($id, $type)
{
    // Create log table if not exists
    dbExecute("
        CREATE TABLE IF NOT EXISTS line_events (
            id INT PRIMARY KEY AUTO_INCREMENT,
            line_id VARCHAR(100),
            event_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ", array());

    // Check if already logged (avoid duplicates)
    $existing = dbSelectOne(
        "SELECT id FROM line_events WHERE line_id = ? AND event_type = ?",
        array($id, $type)
    );

    if (!$existing) {
        dbExecute(
            "INSERT INTO line_events (line_id, event_type) VALUES (?, ?)",
            array($id, $type)
        );
    }
}
?>