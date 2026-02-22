-- =====================================================
-- Bar Stock Management System - MySQL Schema
-- ระบบจัดการสต็อกบาร์น้ำ
-- =====================================================
-- วิธีใช้งาน:
-- 1. สร้าง Database ใน DirectAdmin (MySQL Management)
-- 2. เข้า phpMyAdmin
-- 3. เลือก Database ที่สร้าง
-- 4. ไปที่ Tab "Import" แล้วเลือกไฟล์นี้
-- หรือ Copy ทั้งหมดไป Tab "SQL" แล้วกด "Go"
-- =====================================================

-- ตั้งค่า Character Set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- ตาราง: master_products (รายการสินค้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS master_products (
    code_product INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'ชื่อสินค้า',
    qty_per_pack INT DEFAULT 12 COMMENT 'จำนวนต่อหน่วยบรรจุ',
    pack_unit VARCHAR(20) DEFAULT 'ลัง' COMMENT 'ชื่อหน่วยบรรจุ',
    sell_unit VARCHAR(20) DEFAULT 'ขวด' COMMENT 'หน่วยขาย',
    min_qty INT DEFAULT 60 COMMENT 'จำนวนขั้นต่ำ',
    category VARCHAR(50) DEFAULT 'บาร์น้ำ' COMMENT 'กลุ่มสินค้า',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'สถานะใช้งาน: 1=เปิด, 0=ปิด',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่าง (สินค้าเริ่มต้น)
INSERT INTO master_products (code_product, name, qty_per_pack, pack_unit, sell_unit, min_qty, category) VALUES
(1, 'SO', 24, 'ลัง', 'ขวด', 120, 'บาร์น้ำ'),
(2, 'PO', 12, 'แพ็ค', 'ขวด', 120, 'บาร์น้ำ'),
(3, 'COL', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(4, 'BS', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(5, 'BL', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(6, 'BC', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(7, 'BC250', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(8, 'BH', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(9, 'Bfed', 12, 'ลัง', 'ขวด', 12, 'บาร์น้ำ'),
(10, 'Co', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(11, 'Spy Red', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(12, 'Spy Classic', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(13, 'Re กลม', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(14, 'Re แบน', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(15, 'เหล้า 100', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(16, 'Red', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(17, 'Black', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(18, '285 ดำ', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(19, '285 ทอง', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'),
(20, 'หงส์', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ');

-- =====================================================
-- ตาราง: daily_stock (สต็อกประจำวัน)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stock_date DATE NOT NULL COMMENT 'วันที่',
    code_product INT NOT NULL COMMENT 'รหัสสินค้า',
    product_name VARCHAR(100) COMMENT 'ชื่อสินค้า',
    carry_forward INT DEFAULT 0 COMMENT 'ยอดยกมา (ขวด)',
    incoming_pack INT DEFAULT 0 COMMENT 'รับเข้า (ลัง)',
    incoming_bottle INT DEFAULT 0 COMMENT 'รับเข้า (ขวด)',
    transfer_coffee_pack INT DEFAULT 0 COMMENT 'กาแฟ (ลัง)',
    transfer_coffee INT DEFAULT 0 COMMENT 'กาแฟ (ขวด)',
    transfer_a_pack INT DEFAULT 0 COMMENT 'ฝั่งA (ลัง)',
    transfer_a INT DEFAULT 0 COMMENT 'ฝั่งA (ขวด)',
    transfer_store_pack INT DEFAULT 0 COMMENT 'สโตร์ (ลัง)',
    transfer_store INT DEFAULT 0 COMMENT 'สโตร์ (ขวด)',
    withdraw INT DEFAULT 0 COMMENT 'เบิกออก',
    ocha_coffee INT DEFAULT 0 COMMENT 'Ocha 1 กาแฟ (ขวด)',
    ocha_bar INT DEFAULT 0 COMMENT 'Ocha 2 บาร์น้ำ (ขวด)',
    sold INT DEFAULT 0 COMMENT 'รวม Ocha (ขวด)',
    carry_over INT DEFAULT 0 COMMENT 'ยอดยกไป',
    variance INT DEFAULT 0 COMMENT 'ขาด/เกิน',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_product (stock_date, code_product),
    INDEX idx_stock_date (stock_date),
    INDEX idx_code_product (code_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: transactions (ประวัติธุรกรรม)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลา',
    type VARCHAR(20) COMMENT 'ประเภท: receive, transfer, withdraw, sell',
    product_code INT COMMENT 'รหัสสินค้า',
    quantity INT COMMENT 'จำนวน',
    unit VARCHAR(20) DEFAULT 'ขวด' COMMENT 'หน่วย',
    note TEXT COMMENT 'หมายเหตุ',
    user VARCHAR(50) COMMENT 'ผู้บันทึก',
    INDEX idx_timestamp (timestamp),
    INDEX idx_type (type),
    INDEX idx_product_code (product_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: users (ผู้ใช้งาน)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT 'ชื่อผู้ใช้',
    password VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน',
    role VARCHAR(20) DEFAULT 'user' COMMENT 'สิทธิ์: admin, user',
    name VARCHAR(100) COMMENT 'ชื่อ-นามสกุล',
    permissions TEXT COMMENT 'สิทธิ์เข้าถึงหน้า (comma-separated): dashboard,daily,receive,countCoffee,countA,countStore,sales,withdraw,reports',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ผู้ใช้เริ่มต้น (Password: admin123 และ user123)
-- หมายเหตุ: ใช้ password_hash() ใน PHP จะปลอดภัยกว่า แต่สำหรับ demo ใช้ plain text ก่อน
INSERT INTO users (username, password, role, name, permissions) VALUES
('admin', 'admin123', 'admin', 'ผู้ดูแลระบบ', 'dashboard,daily,receive,countCoffee,countA,countStore,sales,withdraw,reports'),
('user', 'user123', 'user', 'พนักงาน', 'dashboard,daily,receive,countCoffee,countA,countStore,sales,withdraw,reports');

-- =====================================================
-- ตาราง: settings (ตั้งค่าระบบ)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY COMMENT 'รหัสตั้งค่า',
    setting_value TEXT COMMENT 'ค่า',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตั้งค่าเริ่มต้น
INSERT INTO settings (setting_key, setting_value) VALUES
('restaurantName', 'ร้านวันดีดี คาเฟ่ เรสเตอร์รองต์'),
('lineChannelToken', ''),
('lineTargetId', '');

-- =====================================================
-- ตาราง: holidays (วันหยุด)
-- =====================================================
CREATE TABLE IF NOT EXISTS holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATE NOT NULL UNIQUE COMMENT 'วันที่หยุด',
    description VARCHAR(100) COMMENT 'ชื่อวันหยุด',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: line_events (LINE Events Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS line_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type VARCHAR(50) COMMENT 'ประเภท event',
    source_type VARCHAR(50) COMMENT 'ประเภท source: user, group, room',
    source_id VARCHAR(100) COMMENT 'ID ของ source',
    user_id VARCHAR(100) COMMENT 'User ID',
    message_type VARCHAR(50) COMMENT 'ประเภทข้อความ',
    message_text TEXT COMMENT 'ข้อความ',
    raw_event TEXT COMMENT 'Raw JSON event',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_source_id (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ตาราง: receives (รับเข้าสินค้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS receives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receive_date DATE NOT NULL COMMENT 'วันที่รับ',
    code_product VARCHAR(50) NOT NULL COMMENT 'รหัสสินค้า',
    product_name VARCHAR(100) COMMENT 'ชื่อสินค้า',
    pack INT DEFAULT 0 COMMENT 'จำนวน (ลัง)',
    bottle INT DEFAULT 0 COMMENT 'จำนวน (ขวด)',
    note TEXT COMMENT 'หมายเหตุ',
    user VARCHAR(50) COMMENT 'ผู้บันทึก',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_product (receive_date, code_product),
    INDEX idx_receive_date (receive_date),
    INDEX idx_code_product (code_product)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- สิ้นสุด Schema
-- =====================================================
