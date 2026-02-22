/**
 * Bar Stock Management System - Google Apps Script Backend
 * ระบบจัดการสต็อกบาร์น้ำ
 * 
 * วิธีใช้งาน:
 * 1. สร้าง Google Sheet ใหม่
 * 2. ไปที่ Extensions > Apps Script
 * 3. คัดลอกโค้ดนี้ทั้งหมดไปวาง
 * 4. Deploy > New deployment > Web app
 * 5. Execute as: Me, Who has access: Anyone
 * 6. คัดลอก URL ไปใช้ใน Web App
 */

// ==================== CONFIGURATION ====================

// LINE Messaging API Configuration
// ได้จาก LINE Developers Console: https://developers.line.biz/console/
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN';
// Group ID หรือ User ID ที่ต้องการส่งข้อความ (ได้จาก Webhook เมื่อ Bot เข้ากลุ่ม)
const LINE_TARGET_ID = 'YOUR_GROUP_ID_OR_USER_ID';

// Sheet Names
const SHEET_NAMES = {
  MASTER_PRODUCT: 'MasterProduct',
  DAILY_STOCK: 'DailyStock',
  TRANSACTIONS: 'Transactions',
  USERS: 'Users',
  SETTINGS: 'Settings',
  RECEIVES: 'Receives'
};


// ==================== INITIALIZATION ====================

/**
 * Initialize sheets if not exist
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create MasterProduct sheet
  let masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER_PRODUCT);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(SHEET_NAMES.MASTER_PRODUCT);
    masterSheet.getRange('A1:G1').setValues([[
      'codeProduct', 'ชื่อสินค้า', 'จน หน่วยบรรจุ', 'ชื่อหน่วยบรรจุ',
      'หน่วยขาย', 'จำนวนขั้นต่ำ', 'กลุ่มสินค้า'
    ]]);
    masterSheet.getRange('A1:G1').setBackground('#4285f4').setFontColor('#ffffff').setFontWeight('bold');

    // Add sample data
    const sampleProducts = [
      [1, 'SO', 24, 'ลัง', 'ขวด', 120, 'บาร์น้ำ'],
      [2, 'PO', 12, 'แพ็ค', 'ขวด', 120, 'บาร์น้ำ'],
      [3, 'COL', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [4, 'BS', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [5, 'BL', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [6, 'BC', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [7, 'BC250', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [8, 'BH', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [9, 'Bfed', 12, 'ลัง', 'ขวด', 12, 'บาร์น้ำ'],
      [10, 'Co', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [11, 'Spy Red', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [12, 'Spy Classic', 24, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [13, 'Re กลม', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [14, 'Re แบน', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [15, 'เหล้า 100', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [16, 'Red', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [17, 'Black', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [18, '285 ดำ', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [19, '285 ทอง', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ'],
      [20, 'หงส์', 12, 'ลัง', 'ขวด', 60, 'บาร์น้ำ']
    ];
    masterSheet.getRange(2, 1, sampleProducts.length, 7).setValues(sampleProducts);
  }

  // Create DailyStock sheet
  let dailySheet = ss.getSheetByName(SHEET_NAMES.DAILY_STOCK);
  if (!dailySheet) {
    dailySheet = ss.insertSheet(SHEET_NAMES.DAILY_STOCK);
    dailySheet.getRange('A1:P1').setValues([[
      'วันที่', 'รหัสสินค้า', 'ชื่อสินค้า', 'ยอดยกมา',
      'รับเข้า_ลัง', 'รับเข้า_ขวด',
      'กาแฟ_ลัง', 'กาแฟ_ขวด', 'ฝั่งA_ลัง', 'ฝั่งA_ขวด', 'สโตร์_ลัง', 'สโตร์_ขวด',
      'เบิกออก', 'ขาย', 'ยอดยกไป', 'ขาด_เกิน'
    ]]);
    dailySheet.getRange('A1:P1').setBackground('#34a853').setFontColor('#ffffff').setFontWeight('bold');
  }

  // Create Transactions sheet
  let transSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);
  if (!transSheet) {
    transSheet = ss.insertSheet(SHEET_NAMES.TRANSACTIONS);
    transSheet.getRange('A1:G1').setValues([[
      'timestamp', 'type', 'productCode', 'quantity', 'unit', 'note', 'user'
    ]]);
    transSheet.getRange('A1:G1').setBackground('#fbbc04').setFontColor('#000000').setFontWeight('bold');
  }

  // Create Users sheet
  let usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_NAMES.USERS);
    usersSheet.getRange('A1:D1').setValues([[
      'username', 'password', 'role', 'name'
    ]]);
    usersSheet.getRange('A1:D1').setBackground('#ea4335').setFontColor('#ffffff').setFontWeight('bold');

    // Add default admin user
    usersSheet.getRange('A2:D2').setValues([['admin', 'admin123', 'admin', 'ผู้ดูแลระบบ']]);
    usersSheet.getRange('A3:D3').setValues([['user', 'user123', 'user', 'พนักงาน']]);
  }

  // Create Settings sheet
  let settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_NAMES.SETTINGS);
    settingsSheet.getRange('A1:B1').setValues([['key', 'value']]);
    settingsSheet.getRange('A1:B1').setBackground('#9c27b0').setFontColor('#ffffff').setFontWeight('bold');
    settingsSheet.getRange('A2:B5').setValues([
      ['restaurantName', 'ร้านอาหาร'],
      ['lineChannelToken', ''],
      ['lineTargetId', ''],
      ['gasUrl', '']
    ]);
  }

  // Create Receives sheet
  let receivesSheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);
  if (!receivesSheet) {
    receivesSheet = ss.insertSheet(SHEET_NAMES.RECEIVES);
    receivesSheet.getRange('A1:H1').setValues([[
      'date', 'productCode', 'productName', 'pack', 'bottle', 'note', 'timestamp', 'user'
    ]]);
    receivesSheet.getRange('A1:H1').setBackground('#00bcd4').setFontColor('#ffffff').setFontWeight('bold');
  }

  return { success: true, message: 'Sheets initialized successfully' };
}

// ==================== WEB APP ENDPOINTS ====================

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'init':
        result = initializeSheets();
        break;
      case 'getProducts':
        result = getProducts();
        break;
      case 'getDailyStock':
        result = getDailyStock(e.parameter.date);
        break;
      case 'getCarryForward':
        result = getCarryForward(e.parameter.date);
        break;
      case 'getSummary':
        result = getMonthlySummary(e.parameter.month, e.parameter.year);
        break;
      case 'getShortages':
        result = getShortages(e.parameter.date);
        break;
      case 'getSettings':
        result = getSettings();
        break;
      case 'getReceives':
        result = getReceives(e.parameter.date);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch (action) {
      case 'login':
        result = authenticateUser(data.username, data.password);
        break;
      case 'saveDailyStock':
        result = saveDailyStock(data.date, data.stocks, data.user);
        break;
      case 'addProduct':
        result = addProduct(data.product);
        break;
      case 'updateProduct':
        result = updateProduct(data.product);
        break;
      case 'deleteProduct':
        result = deleteProduct(data.codeProduct);
        break;
      case 'addUser':
        result = addUser(data.user);
        break;
      case 'sendLineNotify':
        result = sendLineNotify(data.message);
        break;
      case 'sendShortageReport':
        result = sendShortageReport(data.date);
        break;
      case 'saveSettings':
        result = saveSettings(data.settings);
        break;
      case 'saveReceive':
        result = saveReceive(data.receive);
        break;
      case 'updateReceive':
        result = updateReceive(data.receive);
        break;
      case 'deleteReceive':
        result = deleteReceive(data.date, data.productCode);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== AUTHENTICATION ====================

function authenticateUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return {
        success: true,
        user: {
          username: data[i][0],
          role: data[i][2],
          name: data[i][3]
        }
      };
    }
  }

  return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

// ==================== PRODUCT MANAGEMENT ====================

function getProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_PRODUCT);
  const data = sheet.getDataRange().getValues();

  const products = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      products.push({
        codeProduct: data[i][0],
        name: data[i][1],
        qtyPerPack: data[i][2],
        packUnit: data[i][3],
        sellUnit: data[i][4],
        minQty: data[i][5],
        category: data[i][6]
      });
    }
  }

  return { success: true, products: products };
}

function addProduct(product) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_PRODUCT);
  const lastRow = sheet.getLastRow();

  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[
    product.codeProduct,
    product.name,
    product.qtyPerPack,
    product.packUnit,
    product.sellUnit,
    product.minQty,
    product.category
  ]]);

  return { success: true, message: 'เพิ่มสินค้าสำเร็จ' };
}

function updateProduct(product) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_PRODUCT);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == product.codeProduct) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        product.codeProduct,
        product.name,
        product.qtyPerPack,
        product.packUnit,
        product.sellUnit,
        product.minQty,
        product.category
      ]]);
      return { success: true, message: 'แก้ไขสินค้าสำเร็จ' };
    }
  }

  return { success: false, error: 'ไม่พบสินค้า' };
}

function deleteProduct(codeProduct) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.MASTER_PRODUCT);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == codeProduct) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'ลบสินค้าสำเร็จ' };
    }
  }

  return { success: false, error: 'ไม่พบสินค้า' };
}

// ==================== DAILY STOCK MANAGEMENT ====================

function getDailyStock(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DAILY_STOCK);
  const data = sheet.getDataRange().getValues();

  const stocks = [];
  for (let i = 1; i < data.length; i++) {
    const rowDate = Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (rowDate === date) {
      stocks.push({
        date: rowDate,
        codeProduct: data[i][1],
        name: data[i][2],
        carryForward: data[i][3] || 0,
        incomingPack: data[i][4] || 0,
        incomingBottle: data[i][5] || 0,
        transferCoffeePack: data[i][6] || 0,
        transferCoffee: data[i][7] || 0,
        transferAPack: data[i][8] || 0,
        transferA: data[i][9] || 0,
        transferStorePack: data[i][10] || 0,
        transferStore: data[i][11] || 0,
        withdraw: data[i][12] || 0,
        sold: data[i][13] || 0,
        carryOver: data[i][14] || 0,
        variance: data[i][15] || 0
      });
    }
  }

  return { success: true, stocks: stocks };
}

function getCarryForward(date) {
  // Get previous day's carry over as today's carry forward
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DAILY_STOCK);
  const data = sheet.getDataRange().getValues();

  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() - 1);
  const prevDate = Utilities.formatDate(targetDate, 'Asia/Bangkok', 'yyyy-MM-dd');

  const carryForward = {};
  for (let i = 1; i < data.length; i++) {
    const rowDate = Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (rowDate === prevDate) {
      const productCode = data[i][1];
      const carryOver = data[i][14] || 0;  // carryOver is column 14
      carryForward[productCode] = { bottles: carryOver };
    }
  }

  return { success: true, carryForward: carryForward };
}

function saveDailyStock(date, stocks, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DAILY_STOCK);
  const transSheet = ss.getSheetByName(SHEET_NAMES.TRANSACTIONS);

  // First, delete existing records for this date
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (rowDate === date) {
      sheet.deleteRow(i + 1);
    }
  }

  // Add new records
  const timestamp = new Date();
  const rows = [];
  const transRows = [];

  stocks.forEach(stock => {
    const productsResult = getProducts();
    const product = productsResult.products.find(p => p.codeProduct == stock.codeProduct);
    const qtyPerPack = product ? product.qtyPerPack : 12;

    // Total transfers (convert packs to bottles)
    const carryForward = stock.carryForward || 0;
    const transferCoffeePack = stock.transferCoffeePack || 0;
    const transferCoffee = stock.transferCoffee || 0;
    const transferAPack = stock.transferAPack || 0;
    const transferA = stock.transferA || 0;
    const transferStorePack = stock.transferStorePack || 0;
    const transferStore = stock.transferStore || 0;
    const withdraw = stock.withdraw || 0;
    const sold = stock.sold || 0;

    const coffeeBottles = transferCoffeePack * qtyPerPack + transferCoffee;
    const aBottles = transferAPack * qtyPerPack + transferA;
    const storeBottles = transferStorePack * qtyPerPack + transferStore;

    const incomingBottles = (stock.incomingPack || 0) * qtyPerPack + (stock.incomingBottle || 0);

    // ยอดยกไป (Carry Over) = กาแฟ + บาร์น้ำ + สโตว์ (only transfers, not including withdraw and sold)
    const carryOver = coffeeBottles + aBottles + storeBottles;

    // ขาด/เกิน (Variance) = ขาย - (ยอดยกมา + รับเข้า - (กาแฟ + บาร์น้ำ + สโตว์ + เบิกออก))
    const totalTransfers = coffeeBottles + aBottles + storeBottles + withdraw;
    const variance = sold - (carryForward + incomingBottles - totalTransfers);

    rows.push([
      date,
      stock.codeProduct,
      stock.name,
      carryForward,
      stock.incomingPack || 0,
      stock.incomingBottle || 0,
      transferCoffeePack,
      transferCoffee,
      transferAPack,
      transferA,
      transferStorePack,
      transferStore,
      withdraw,
      sold,
      carryOver,
      variance
    ]);

    // Log transactions
    if (stock.incomingPack > 0 || stock.incomingBottle > 0) {
      transRows.push([timestamp, 'receive', stock.codeProduct,
        stock.incomingPack * qtyPerPack + stock.incomingBottle, 'ขวด', 'รับเข้า', user]);
    }
    if (coffeeBottles > 0) {
      transRows.push([timestamp, 'transfer', stock.codeProduct, coffeeBottles, 'ขวด', 'ส่งกาแฟ', user]);
    }
    if (aBottles > 0) {
      transRows.push([timestamp, 'transfer', stock.codeProduct, aBottles, 'ขวด', 'ส่งฝั่งA', user]);
    }
    if (storeBottles > 0) {
      transRows.push([timestamp, 'transfer', stock.codeProduct, storeBottles, 'ขวด', 'ส่งสโตร์', user]);
    }
    if (withdraw > 0) {
      transRows.push([timestamp, 'withdraw', stock.codeProduct, withdraw, 'ขวด', 'เบิกออก', user]);
    }
    if (sold > 0) {
      transRows.push([timestamp, 'sell', stock.codeProduct, sold, 'ขวด', 'ขาย', user]);
    }
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 16).setValues(rows);
  }

  if (transRows.length > 0) {
    transSheet.getRange(transSheet.getLastRow() + 1, 1, transRows.length, 7).setValues(transRows);
  }

  return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
}

// ==================== SHORTAGE DETECTION ====================

function getShortages(date) {
  const stockResult = getDailyStock(date);
  const productsResult = getProducts();

  if (!stockResult.success || !productsResult.success) {
    return { success: false, error: 'ไม่สามารถดึงข้อมูลได้' };
  }

  const shortages = [];

  stockResult.stocks.forEach(stock => {
    if (stock.variance !== 0) {
      const product = productsResult.products.find(p => p.codeProduct == stock.codeProduct);
      shortages.push({
        codeProduct: stock.codeProduct,
        name: stock.name,
        variance: stock.variance,
        minQty: product ? product.minQty : 0,
        actualBottles: stock.actualCountPack * (product ? product.qtyPerPack : 12) + stock.actualCountBottle
      });
    }
  });

  // Sort by variance (most negative first)
  shortages.sort((a, b) => a.variance - b.variance);

  return { success: true, shortages: shortages };
}

// ==================== MONTHLY SUMMARY ====================

function getMonthlySummary(month, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DAILY_STOCK);
  const data = sheet.getDataRange().getValues();

  const summary = {};

  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]);
    if (rowDate.getMonth() + 1 === parseInt(month) && rowDate.getFullYear() === parseInt(year)) {
      const day = rowDate.getDate();
      const code = data[i][1];

      if (!summary[code]) {
        summary[code] = {
          name: data[i][2],
          days: {}
        };
      }

      summary[code].days[day] = {
        variance: data[i][11] || 0
      };
    }
  }

  return { success: true, summary: summary };
}

// ==================== LINE MESSAGING API ====================

/**
 * ส่งข้อความผ่าน LINE Messaging API (Push Message)
 * ใช้แทน LINE Notify ที่ปิดบริการแล้ว
 * 
 * วิธีตั้งค่า:
 * 1. ไปที่ https://developers.line.biz/console/
 * 2. สร้าง Provider และ Messaging API Channel
 * 3. ใน Channel Settings:
 *    - คัดลอก "Channel access token" มาใส่ LINE_CHANNEL_ACCESS_TOKEN
 *    - เปิด "Allow bot to join group chats" ถ้าต้องการส่งเข้ากลุ่ม
 * 4. เชิญ Bot เข้ากลุ่ม LINE
 * 5. Group ID จะได้จาก Webhook event เมื่อ Bot เข้ากลุ่ม
 */
function sendLineMessage(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const settings = settingsSheet.getDataRange().getValues();

  let channelToken = LINE_CHANNEL_ACCESS_TOKEN;
  let targetId = LINE_TARGET_ID;

  // Try to get settings from sheet
  for (let i = 1; i < settings.length; i++) {
    if (settings[i][0] === 'lineChannelToken' && settings[i][1]) {
      channelToken = settings[i][1];
    }
    if (settings[i][0] === 'lineTargetId' && settings[i][1]) {
      targetId = settings[i][1];
    }
  }

  if (!channelToken || channelToken === 'YOUR_CHANNEL_ACCESS_TOKEN') {
    return { success: false, error: 'กรุณาตั้งค่า LINE Channel Access Token' };
  }

  if (!targetId || targetId === 'YOUR_GROUP_ID_OR_USER_ID') {
    return { success: false, error: 'กรุณาตั้งค่า LINE Group ID หรือ User ID' };
  }

  const payload = {
    to: targetId,
    messages: [
      {
        type: 'text',
        text: message
      }
    ]
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + channelToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return { success: true, message: 'ส่งข้อความ LINE สำเร็จ' };
    } else {
      const responseBody = JSON.parse(response.getContentText());
      return { success: false, error: `LINE API Error: ${responseBody.message || responseCode}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * ส่งข้อความแบบ Flex Message (สวยขึ้น)
 */
function sendLineFlexMessage(title, contents) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const settings = settingsSheet.getDataRange().getValues();

  let channelToken = LINE_CHANNEL_ACCESS_TOKEN;
  let targetId = LINE_TARGET_ID;

  for (let i = 1; i < settings.length; i++) {
    if (settings[i][0] === 'lineChannelToken' && settings[i][1]) {
      channelToken = settings[i][1];
    }
    if (settings[i][0] === 'lineTargetId' && settings[i][1]) {
      targetId = settings[i][1];
    }
  }

  if (!channelToken || channelToken === 'YOUR_CHANNEL_ACCESS_TOKEN' ||
    !targetId || targetId === 'YOUR_GROUP_ID_OR_USER_ID') {
    // Fallback to simple text message
    return sendLineMessage(contents);
  }

  const flexMessage = {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#6366f1',
        paddingAll: '15px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: contents,
            wrap: true,
            size: 'sm'
          }
        ],
        paddingAll: '15px'
      }
    }
  };

  const payload = {
    to: targetId,
    messages: [flexMessage]
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + channelToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return { success: true, message: 'ส่งข้อความ LINE สำเร็จ' };
    } else {
      const responseBody = JSON.parse(response.getContentText());
      return { success: false, error: `LINE API Error: ${responseBody.message || responseCode}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Legacy function name for compatibility
function sendLineNotify(message) {
  return sendLineMessage(message);
}

function sendShortageReport(date) {
  const shortagesResult = getShortages(date);

  if (!shortagesResult.success) {
    return shortagesResult;
  }

  if (shortagesResult.shortages.length === 0) {
    return { success: true, message: 'ไม่มีสินค้าขาด/เกิน' };
  }

  let message = '📊 รายงานสินค้าขาด/เกิน\n';
  message += `📅 วันที่: ${date}\n`;
  message += '━━━━━━━━━━━━━━━\n';

  const shortItems = shortagesResult.shortages.filter(s => s.variance < 0);
  const overItems = shortagesResult.shortages.filter(s => s.variance > 0);

  if (shortItems.length > 0) {
    message += '🔴 สินค้าขาด:\n';
    shortItems.forEach(item => {
      message += `  • ${item.name}: ${item.variance} ขวด\n`;
    });
  }

  if (overItems.length > 0) {
    message += '🟢 สินค้าเกิน:\n';
    overItems.forEach(item => {
      message += `  • ${item.name}: +${item.variance} ขวด\n`;
    });
  }

  return sendLineMessage(message);
}


// ==================== PDF GENERATION ====================

function generateDailyReport(date) {
  const stockResult = getDailyStock(date);
  const shortagesResult = getShortages(date);

  if (!stockResult.success) {
    return { success: false, error: 'ไม่สามารถดึงข้อมูลได้' };
  }

  // Create HTML for PDF
  let html = `
    <html>
    <head>
      <style>
        body { font-family: 'Sarabun', sans-serif; padding: 20px; }
        h1 { color: #1a1a2e; text-align: center; }
        h2 { color: #16213e; border-bottom: 2px solid #0f3460; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #0f3460; color: white; }
        .shortage { background-color: #ffebee; color: #c62828; }
        .overage { background-color: #e8f5e9; color: #2e7d32; }
        .footer { text-align: center; margin-top: 30px; color: #666; }
      </style>
    </head>
    <body>
      <h1>📊 รายงานสต็อกบาร์น้ำประจำวัน</h1>
      <h2>📅 วันที่: ${date}</h2>
      
      <table>
        <tr>
          <th>รหัส</th>
          <th>ชื่อสินค้า</th>
          <th>ยกมา (ลัง/ขวด)</th>
          <th>รับเข้า</th>
          <th>เบิก</th>
          <th>ขาย</th>
          <th>นับจริง</th>
          <th>ขาด/เกิน</th>
        </tr>
  `;

  stockResult.stocks.forEach(stock => {
    const varianceClass = stock.variance < 0 ? 'shortage' : (stock.variance > 0 ? 'overage' : '');
    html += `
      <tr>
        <td>${stock.codeProduct}</td>
        <td>${stock.name}</td>
        <td>${stock.carryForwardPack}/${stock.carryForwardBottle}</td>
        <td>${stock.incomingPack}/${stock.incomingBottle}</td>
        <td>${stock.withdraw}</td>
        <td>${stock.sold}</td>
        <td>${stock.actualCountPack}/${stock.actualCountBottle}</td>
        <td class="${varianceClass}">${stock.variance}</td>
      </tr>
    `;
  });

  html += `
      </table>
      <div class="footer">
        <p>สร้างโดย: Bar Stock Management System</p>
        <p>วันที่พิมพ์: ${new Date().toLocaleString('th-TH')}</p>
      </div>
    </body>
    </html>
  `;

  // Create PDF
  const blob = HtmlService.createHtmlOutput(html).getBlob().setName(`stock-report-${date}.pdf`).getAs('application/pdf');

  // Save to Drive
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile(blob);

  return {
    success: true,
    pdfUrl: file.getUrl(),
    downloadUrl: file.getDownloadUrl()
  };
}

// ==================== USER MANAGEMENT ====================

function addUser(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  // Check if username exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user.username) {
      return { success: false, error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
    }
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([[
    user.username,
    user.password,
    user.role,
    user.name
  ]]);

  return { success: true, message: 'เพิ่มผู้ใช้สำเร็จ' };
}

function getUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      username: data[i][0],
      role: data[i][2],
      name: data[i][3]
    });
  }

  return { success: true, users: users };
}

// ==================== SETTINGS MANAGEMENT ====================

/**
 * Get all settings from Settings sheet
 */
function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  if (!sheet) {
    // Initialize if not exists
    initializeSheets();
    sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  }

  const data = sheet.getDataRange().getValues();
  const settings = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      settings[data[i][0]] = data[i][1];
    }
  }

  return { success: true, settings: settings };
}

/**
 * Save multiple settings at once
 * @param {Object} settings - Key-value pairs to save
 */
function saveSettings(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  if (!sheet) {
    initializeSheets();
    sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  }

  const data = sheet.getDataRange().getValues();

  // Update existing or add new settings
  for (const key in settings) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      // Add new setting
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, 1, 2).setValues([[key, settings[key]]]);
    }
  }

  return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ' };
}

// ==================== RECEIVES MANAGEMENT ====================

/**
 * Get receive records by date (or all if no date specified)
 * @param {string} date - Date in YYYY-MM-DD format (optional)
 */
function getReceives(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);

  if (!sheet) {
    initializeSheets();
    sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);
  }

  const data = sheet.getDataRange().getValues();
  const receives = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const rowDate = typeof data[i][0] === 'string'
        ? data[i][0]
        : Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');

      // If date is specified, filter by date
      if (!date || rowDate === date) {
        receives.push({
          date: rowDate,
          productCode: data[i][1],
          productName: data[i][2],
          pack: data[i][3] || 0,
          bottle: data[i][4] || 0,
          note: data[i][5] || '',
          timestamp: data[i][6],
          user: data[i][7] || ''
        });
      }
    }
  }

  return { success: true, receives: receives };
}

/**
 * Save a receive record
 * @param {Object} receive - Receive record object
 */
function saveReceive(receive) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);

  if (!sheet) {
    initializeSheets();
    sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);
  }

  const data = sheet.getDataRange().getValues();

  // Check if record for this date+productCode already exists
  for (let i = 1; i < data.length; i++) {
    const rowDate = typeof data[i][0] === 'string'
      ? data[i][0]
      : Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');

    if (rowDate === receive.date && data[i][1] == receive.productCode) {
      // Update existing record (add quantities)
      const newPack = (parseInt(data[i][3]) || 0) + (parseInt(receive.pack) || 0);
      const newBottle = (parseInt(data[i][4]) || 0) + (parseInt(receive.bottle) || 0);

      sheet.getRange(i + 1, 4, 1, 4).setValues([[
        newPack,
        newBottle,
        receive.note || data[i][5],
        new Date().toISOString()
      ]]);

      return { success: true, message: 'อัพเดตรายการรับสินค้าสำเร็จ' };
    }
  }

  // Add new record
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 8).setValues([[
    receive.date,
    receive.productCode,
    receive.productName || '',
    parseInt(receive.pack) || 0,
    parseInt(receive.bottle) || 0,
    receive.note || '',
    new Date().toISOString(),
    receive.user || ''
  ]]);

  return { success: true, message: 'บันทึกรายการรับสินค้าสำเร็จ' };
}

/**
 * Update a receive record (replace quantities)
 * @param {Object} receive - Receive record object
 */
function updateReceive(receive) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);

  if (!sheet) {
    return { success: false, error: 'ไม่พบตาราง Receives' };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowDate = typeof data[i][0] === 'string'
      ? data[i][0]
      : Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');

    if (rowDate === receive.date && data[i][1] == receive.productCode) {
      // Update record
      sheet.getRange(i + 1, 1, 1, 8).setValues([[
        receive.date,
        receive.productCode,
        receive.productName || data[i][2],
        parseInt(receive.pack) || 0,
        parseInt(receive.bottle) || 0,
        receive.note || '',
        new Date().toISOString(),
        receive.user || data[i][7]
      ]]);

      return { success: true, message: 'แก้ไขรายการรับสินค้าสำเร็จ' };
    }
  }

  return { success: false, error: 'ไม่พบรายการรับสินค้า' };
}

/**
 * Delete a receive record
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number|string} productCode - Product code
 */
function deleteReceive(date, productCode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RECEIVES);

  if (!sheet) {
    return { success: false, error: 'ไม่พบตาราง Receives' };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = typeof data[i][0] === 'string'
      ? data[i][0]
      : Utilities.formatDate(new Date(data[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');

    if (rowDate === date && data[i][1] == productCode) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'ลบรายการรับสินค้าสำเร็จ' };
    }
  }

  return { success: false, error: 'ไม่พบรายการรับสินค้า' };
}

