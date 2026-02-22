-- =====================================================
-- Reset Database สำหรับร้านวันดีดี
-- ล้างข้อมูลร้านระเบียงบัวออก แล้วตั้งค่าใหม่
-- =====================================================
-- วิธีใช้: เข้า phpMyAdmin → เลือก database ajpatpon_wddbar
-- → Tab "SQL" → วาง SQL นี้ → กด "Go"
-- =====================================================

SET NAMES utf8mb4;

-- ล้างข้อมูลเก่าทั้งหมด
TRUNCATE TABLE daily_stock;
TRUNCATE TABLE transactions;
TRUNCATE TABLE receives;
TRUNCATE TABLE line_events;
TRUNCATE TABLE holidays;

-- เพิ่มคอลัมน์ Ocha 2 เครื่อง (กาแฟ + บาร์น้ำ)
-- ถ้าคอลัมน์มีอยู่แล้วจะ error แต่ไม่เป็นไร
ALTER TABLE daily_stock ADD COLUMN ocha_coffee INT DEFAULT 0 COMMENT 'Ocha 1 กาแฟ (ขวด)' AFTER withdraw;
ALTER TABLE daily_stock ADD COLUMN ocha_bar INT DEFAULT 0 COMMENT 'Ocha 2 บาร์น้ำ (ขวด)' AFTER ocha_coffee;

-- Reset settings สำหรับร้านวันดีดี
DELETE FROM settings;
INSERT INTO settings (setting_key, setting_value) VALUES
('restaurantName', 'ร้านวันดีดี คาเฟ่ เรสเตอร์รองต์'),
('lineChannelToken', ''),
('lineTargetId', '');

-- =====================================================
-- สิ้นสุด Reset
-- =====================================================
