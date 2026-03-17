// =====================================================
// Google Apps Script - Wedding Website Backend
// Hướng dẫn:
// 1. Mở script.google.com → New project
// 2. Xóa code cũ, paste toàn bộ file này vào
// 3. Sửa SHEET_ID và SITE_URL bên dưới
// 4. Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy URL deployment → dán vào index.html (APPS_SCRIPT_URL)
// 6. Cài trigger onEdit:
//    - Apps Script → Triggers (đồng hồ) → Add Trigger
//    - Function: onEdit | Event: From spreadsheet | Type: On edit
// =====================================================

const SHEET_ID  = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Lấy từ URL sheet: .../spreadsheets/d/[ID]/edit
const SITE_URL  = 'https://huuan-nguyendung.vercel.app'; // URL trang web

// =====================================================
// DANH SÁCH KHÁCH MỜI — tự gen link khi nhập tên
// =====================================================

function initGuestSheet() {
  const sheet = getSheet('DanhSachKhach');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Tên khách', 'Link thiệp cá nhân']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 450);
  }
  return sheet;
}

// Trigger: chạy tự động mỗi khi chỉnh sửa sheet
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'DanhSachKhach') return;

  const col = e.range.getColumn();
  const row = e.range.getRow();
  if (col !== 1 || row <= 1) return; // chỉ xử lý cột A, bỏ header

  const ten = e.range.getValue();
  const linkCell = sheet.getRange(row, 2);

  if (!ten || String(ten).trim() === '') {
    linkCell.setValue(''); // Xóa link nếu tên bị xóa
    return;
  }

  const encoded = encodeURIComponent(String(ten).trim());
  linkCell.setValue(SITE_URL + '/?ten=' + encoded);
  linkCell.setFontColor('#1155cc');
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// Khởi tạo header nếu sheet còn trống
function initSheets() {
  const wishSheet = getSheet('LoiChuc');
  if (wishSheet.getLastRow() === 0) {
    wishSheet.appendRow(['Thời gian', 'Tên', 'Lời chúc']);
    wishSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }

  const rsvpSheet = getSheet('XacNhanThamDu');
  if (rsvpSheet.getLastRow() === 0) {
    rsvpSheet.appendRow(['Thời gian', 'Tên', 'Số điện thoại', 'Khách của', 'Tham dự', 'Tiệc']);
    rsvpSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  initGuestSheet();
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getWishes') {
    return getWishes();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ success: false, error: 'Invalid JSON' });
  }

  if (body.action === 'addWish') {
    return addWish(body);
  }
  if (body.action === 'addRSVP') {
    return addRSVP(body);
  }

  return respond({ success: false, error: 'Unknown action' });
}

function getWishes() {
  initSheets();
  const sheet = getSheet('LoiChuc');
  const rows = sheet.getDataRange().getValues();

  // Bỏ qua header (row 0), lấy từ row 1 trở đi, đảo ngược để mới nhất lên đầu
  const wishes = rows.slice(1).reverse().map(row => ({
    time: row[0],
    name: row[1],
    text: row[2],
  }));

  return ContentService
    .createTextOutput(JSON.stringify({ wishes }))
    .setMimeType(ContentService.MimeType.JSON);
}

function addWish(body) {
  const { name, text } = body;
  if (!name || !text) return respond({ success: false, error: 'Missing fields' });

  initSheets();
  const sheet = getSheet('LoiChuc');
  sheet.appendRow([new Date(), name, text]);

  return respond({ success: true });
}

function addRSVP(body) {
  const { name, phone, guestOf, attendance, party } = body;
  if (!name) return respond({ success: false, error: 'Missing name' });

  initSheets();
  const sheet = getSheet('XacNhanThamDu');

  const attendanceLabel = attendance === 'yes' ? 'Có, tôi sẽ đến' : 'Rất tiếc, không đến được';
  const guestLabel = { nhatrai: 'Nhà Trai', nhagai: 'Nhà Gái', banbe: 'Bạn bè chung' }[guestOf] || guestOf;
  const partyLabel = { nhagai: 'Tiệc Nhà Gái', lethanhon: 'Lễ Thành Hôn', ca2: 'Cả 2 tiệc' }[party] || party;

  sheet.appendRow([new Date(), name, phone || '', guestLabel, attendanceLabel, partyLabel]);

  return respond({ success: true });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
