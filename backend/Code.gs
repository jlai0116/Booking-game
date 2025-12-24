/**
 * 民宿訂房系統 - Google Apps Script 後端
 * 核心原則：
 * 1. 唯一計價中心：所有金額計算集中於此
 * 2. 容量優先模型：加床增加容量，超過才收加人費
 * 3. 資料一致性：所有規則由 Google Sheets 驅動
 */

// ==================== CONFIG ====================
const SHEET_NAMES = {
  PRICE_LIST: 'PriceList',
  GLOBAL_SETTINGS: 'GlobalSettings',
  HOLIDAY_CONFIG: 'HolidayConfig',
  BOOKINGS: 'Bookings'
};

const DATE_TYPES = {
  WEEKDAY: 'weekday',
  HOLIDAY: 'holiday',
  CNY: 'cny' // 過年
};

// ==================== API ENDPOINTS ====================

/**
 * doGet - 提供房間列表與現有訂單
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getRooms';
    
    if (action === 'getRooms') {
      const rooms = getPriceList();
      return createResponse({ success: true, data: rooms });
    }
    
    if (action === 'getBookings') {
      const bookings = getBookings();
      return createResponse({ success: true, data: bookings });
    }

    if (action === 'getBookedDates') {
      const roomNumber = e.parameter.roomNumber;
      if (!roomNumber) {
        throw new Error('缺少房號參數');
      }
      const bookedDates = getBookedDates(roomNumber);
      return createResponse({ success: true, data: bookedDates });
    }

    if (action === 'getAvailability') {
        const startDate = e.parameter.startDate || new Date().toISOString().split('T')[0];
        const days = parseInt(e.parameter.days) || 30;
        
        const result = getAvailabilityWindow(startDate, days);
        return createResponse({ success: true, data: result });
    }
    
    return createResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * doPost - 接收訂房請求，支援兩階段提交
 * action=CALCULATE: 僅計價不寫入
 * action=BOOK: 檢查衝突後寫入訂單
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action || 'BOOK'; // 向後兼容，預設為 BOOK
    
    // 驗證必要欄位
    const required = ['roomNumber', 'checkIn', 'checkOut', 'adults', 'children5Plus', 'childrenUnder5', 'extraBeds'];
    for (let field of required) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`缺少必要欄位: ${field}`);
      }
    }
    
    // 執行計價
    const result = calculateBooking(params);
    
    // 根據 action 決定是否寫入
    if (action === 'CALCULATE') {
      // 僅計價，不寫入資料
      return createResponse({
        success: true,
        data: result
      });
    }
    
    if (action === 'BOOK') {
      // 驗證客戶資料必填欄位
      if (!params.name || !params.phone) {
        throw new Error('缺少客戶資料：姓名與電話為必填');
      }
      
      // 檢查日期衝突
      const hasConflict = checkDateConflict(
        params.roomNumber,
        params.checkIn,
        params.checkOut
      );
      
      if (hasConflict) {
        throw new Error('此房間在選定日期已被訂滿，請重新選擇日期');
      }
      
      // 寫入訂單
      const bookingId = saveBooking({
        ...params,
        ...result,
        createdAt: new Date()
      });
      
      return createResponse({
        success: true,
        data: {
          bookingId,
          ...result
        }
      });
    }

    throw new Error('無效的 action 參數');
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * 建立 JSON 回應
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== 核心計價邏輯 ====================

/**
 * calculateBooking - 核心計價函數
 * @param {Object} params - 訂房參數
 * @returns {Object} 計價結果
 */
function calculateBooking(params) {
  const {
    roomNumber,
    checkIn,
    checkOut,
    adults,
    children5Plus,
    childrenUnder5,
    extraBeds,
    petLarge = 0,
    petSmall = 0
  } = params;
  
  // 取得房間資訊
  const room = getRoomInfo(roomNumber);
  if (!room) throw new Error(`找不到房號: ${roomNumber}`);
  
  // 驗證加床數量
  if (extraBeds > room.extraBeds) {
    throw new Error(`加床數量超過上限 (最多 ${room.extraBeds} 床)`);
  }
  
  // 取得全域設定
  const settings = getGlobalSettings();
  const holidayConfig = getHolidayConfig();
  
  // ============================================
  // Step 1: 計算最終物理容量 (Physical Capacity)
  // ============================================
  // 加床直接視為物理容量的延伸
  const finalCapacity = room.baseCapacity + extraBeds;
  
  // ============================================
  // Step 2: 確定收費人數優先級 (Priority Allocation)
  // ============================================
  // 我們將人分為兩類：
  // Class A (必須付費的群體): 成人 + 5歲以上兒童
  // Class B (可能有優惠的群體): 5歲以下兒童
  const classA_Count = adults + children5Plus;
  const classB_Count = childrenUnder5;
  const totalGuests = classA_Count + classB_Count;
  
  // 計算 Class A 的溢出人數 (優先佔用容量)
  // 如果 Class A 人數 > 最終容量，則溢出的人必須付費
  // 如果 Class A 人數 <= 最終容量，則 Class A 全部住進去，剩餘容量留給 Class B
  const overflowClassA = Math.max(0, classA_Count - finalCapacity);
  const remainingCapacityForClassB = Math.max(0, finalCapacity - classA_Count);
  
  // 計算 Class B 的溢出人數 (使用剩餘容量)
  const overflowClassB = Math.max(0, classB_Count - remainingCapacityForClassB);
  
  // 計算日期範圍
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  if (checkInDate >= checkOutDate) {
    throw new Error('退房日期必須晚於入住日期');
  }
  
  // 逐日計價
  let totalRoomPrice = 0;
  let totalExtraBedPrice = 0;
  let totalExtraPersonFee = 0;
  let dailyBreakdown = [];
  
  // 新增：用於前端顯示的詳細明細陣列
  let priceDetails = [];
  
  let currentDate = new Date(checkInDate);
  while (currentDate < checkOutDate) {
    const dateType = getDateType(currentDate, holidayConfig);
    const dateStr = formatDate(currentDate);
    
    let typeLabel = '平日';
    if (dateType === DATE_TYPES.HOLIDAY) typeLabel = '假日';
    else if (dateType === DATE_TYPES.CNY) typeLabel = '春節';
    
    // --- 1. 房價 ---
    let roomPrice = 0;
    if (dateType === DATE_TYPES.CNY) roomPrice = room.cnyPrice;
    else if (dateType === DATE_TYPES.HOLIDAY) roomPrice = room.holidayPrice;
    else roomPrice = room.weekdayPrice;
    
    priceDetails.push({
        label: `${dateStr} (${typeLabel}) 房價`,
        formula: `${roomNumber}房 x 1晚`,
        subtotal: roomPrice
    });
    
    // --- 2. 加床費 ---
    const extraBedPrice = extraBeds * settings.extraBed[dateType];
    if (extraBeds > 0) {
        priceDetails.push({
            label: `加床費用 (${typeLabel})`,
            formula: `$${settings.extraBed[dateType]} x ${extraBeds}床`,
            subtotal: extraBedPrice
        });
    }
    
    // --- 3. 加人費 (使用 Step 2 的溢出計算) ---
    let extraPersonFee = 0;
    
    // 3.1 處理 Class A 溢出 (成人/5歲以上)
    if (overflowClassA > 0) {
        const fee = overflowClassA * settings.addPerson5Plus[dateType];
        extraPersonFee += fee;
        priceDetails.push({
            label: `超額加人費 (5歲以上, ${typeLabel})`,
            formula: `$${settings.addPerson5Plus[dateType]} x ${overflowClassA}人 (容量已滿)`,
            subtotal: fee
        });
    }
    
    // 3.2 處理 Class B 溢出 (5歲以下) - 適用階梯優惠
    // 平日/假日：前2人免費，第3人起收費
    // 春節：前1人免費，第2人起收費
    if (overflowClassB > 0) {
        const freeCount = (dateType === DATE_TYPES.CNY) ? 1 : 2;
        const chargeableClassB = Math.max(0, overflowClassB - freeCount);
        
        if (chargeableClassB > 0) {
            const fee = chargeableClassB * settings.addPerson5Minus[dateType];
            extraPersonFee += fee;
            priceDetails.push({
                label: `超額加人費 (5歲以下, ${typeLabel})`,
                formula: `$${settings.addPerson5Minus[dateType]} x ${chargeableClassB}人 (超出${freeCount}名免費額度)`,
                subtotal: fee
            });
        }
    }
    
    totalRoomPrice += roomPrice;
    totalExtraBedPrice += extraBedPrice;
    totalExtraPersonFee += extraPersonFee;
    
    dailyBreakdown.push({
      date: dateStr,
      dateType,
      roomPrice,
      extraBedPrice,
      extraPersonFee
    });
    
    // 下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // --- 4. 寵物費用 (全程一次性) ---
  const nights = dailyBreakdown.length;
  const petFee = (petLarge * settings.petLarge.weekday + petSmall * settings.petSmall.weekday) * nights;
  
  if (petFee > 0) {
      if (petLarge > 0) {
           priceDetails.push({
                label: `寵物清潔費 (大型犬)`,
                formula: `$${settings.petLarge.weekday} x ${petLarge}隻 x ${nights}晚`,
                subtotal: petLarge * settings.petLarge.weekday * nights
           });
      }
      if (petSmall > 0) {
           priceDetails.push({
                label: `寵物清潔費 (小型犬)`,
                formula: `$${settings.petSmall.weekday} x ${petSmall}隻 x ${nights}晚`,
                subtotal: petSmall * settings.petSmall.weekday * nights
           });
      }
  }
  
  const totalAmount = totalRoomPrice + totalExtraBedPrice + totalExtraPersonFee + petFee;
  
  return {
    totalAmount,
    breakdown: {
      roomPrice: totalRoomPrice,
      extraBedPrice: totalExtraBedPrice,
      extraPersonFee: totalExtraPersonFee,
      petFee,
      nights
    },
    dailyBreakdown,
    priceDetails, 
    capacityInfo: {
      baseCapacity: room.baseCapacity,
      finalCapacity,
      totalGuests,
      overflow: Math.max(0, totalGuests - finalCapacity)
    }
  };
}

/**
 * getDateType - 日期類型判定
 * 優先級：過年 > 國定假日 > 寒暑假規則 > 一般週規則
 */
function getDateType(date, holidayConfig) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  
  // 1. 檢查是否為過年
  for (let config of holidayConfig) {
    if (config.dateType === 'CNY') {
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      end.setHours(23, 59, 59, 999);
      
      if (date >= start && date <= end) {
        return DATE_TYPES.CNY;
      }
    }
  }
  
  // 2. 檢查是否為國定假日
  for (let config of holidayConfig) {
    if (config.dateType === 'HOLIDAY') {
      const holidayDate = new Date(config.startDate);
      if (date.toDateString() === holidayDate.toDateString()) {
        return DATE_TYPES.HOLIDAY;
      }
    }
  }
  
  // 3. 檢查寒暑假規則（1, 2, 7, 8 月）
  const isSummerWinter = [1, 2, 7, 8].includes(month);
  
  if (isSummerWinter) {
    // 寒暑假：週五、六、日為假日
    if ([5, 6, 0].includes(dayOfWeek)) {
      return DATE_TYPES.HOLIDAY;
    }
  } else {
    // 非寒暑假：週五、六為假日
    if ([5, 6].includes(dayOfWeek)) {
      return DATE_TYPES.HOLIDAY;
    }
  }
  
  // 4. 其他為平日
  return DATE_TYPES.WEEKDAY;
}

// ==================== SHEET 資料讀取 ====================

/**
 * getPriceList - 讀取房間價目表
 */
function getPriceList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PRICE_LIST);
  const data = sheet.getDataRange().getValues();
  
  const rooms = [];
  for (let i = 1; i < data.length; i++) { // 跳過標題列
    if (!data[i][0]) continue; // 跳過空行
    
    rooms.push({
      roomNumber: String(data[i][0]),
      roomType: data[i][1],
      baseCapacity: Number(data[i][2]),
      extraBeds: Number(data[i][3]),
      weekdayPrice: Number(data[i][4]),
      holidayPrice: Number(data[i][5]),
      cnyPrice: Number(data[i][6]),
      note: data[i][7] || ''
    });
  }
  
  return rooms;
}

/**
 * getRoomInfo - 取得單一房間資訊
 */
function getRoomInfo(roomNumber) {
  const rooms = getPriceList();
  return rooms.find(r => r.roomNumber === String(roomNumber));
}

/**
 * getGlobalSettings - 讀取全域設定
 */
function getGlobalSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.GLOBAL_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  const settings = {};
  
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    const key = data[i][0];
    settings[key] = {
      weekday: Number(data[i][2]),
      holiday: Number(data[i][3]),
      cny: Number(data[i][4])
    };
  }
  
  return {
    extraBed: settings.extra_bed || {},
    addPerson5Plus: settings.add_person_5plus || {},
    addPerson5Minus: settings.add_person_5minus || {},
    petLarge: settings.pet_large || {},
    petSmall: settings.pet_small || {}
  };
}

/**
 * getHolidayConfig - 讀取假日設定
 */
function getHolidayConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.HOLIDAY_CONFIG);
  const data = sheet.getDataRange().getValues();
  
  const holidays = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    holidays.push({
      dateType: data[i][0],
      startDate: data[i][1],
      endDate: data[i][2],
      description: data[i][3]
    });
  }
  
  return holidays;
}

/**
 * getBookings - 讀取現有訂單
 */
function getBookings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
  
  // 如果分頁不存在，返回空陣列
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // 只有標題列
  
  const bookings = [];
  // 欄位索引映射（假設按照標準順序，但為了安全讀取更多欄位）
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    // 簡單解析，實際與寫入順序有關
    // 這裡我們只需要用來檢查衝突的欄位：房號、入住、退房
    // 根據新的寫入順序，這些欄位在中間
    // 既然要讀取舊資料和新資料，可能存在格式差異
    // 為了相容，我們遍歷查找
    
    // 簡單起見，我們讀取固定欄位，假設資料格式已一致或透過欄位名判斷
    // 不過 GAS 讀取是透過索引
    // 我們可以根據寫入邏輯反推：
    // 舊格式：bookingId(0), roomNumber(1), checkIn(2), checkOut(3) ...
    // 新格式：createdAt(0), name(1), ..., roomNumber(5), checkIn(6), checkOut(7) ...
    
    // 為了安全，我們檢查欄位特徵或長度？
    // 或者我們直接讀取所有資料，並透過變數嘗試解析
    // 更好的方式是看標題列，但這裡先假設新格式為主，如果找不到再退回到舊格式
    
    let row = data[i];
    let roomNumber, checkIn, checkOut;
    
    // 判斷邏輯：檢查第 6 欄 (Index 5) 是否為房號
    // 房號可能是數字或字串，這裡假設房號通常較短
    // 並檢查 Index 6 和 7 是否有值 (日期)
    
    if (row[5] && (row[6] || row[7])) {
       // 新格式：Column F (5) = Room, G (6) = CheckIn, H (7) = CheckOut
       roomNumber = row[5];
       checkIn = row[6];
       checkOut = row[7];
    } else {
       // 舊格式：Column B (1) = Room, C (2) = CheckIn, D (3) = CheckOut
       // 根據截圖，舊資料可能不存在或格式不同。為了保險，保留這個fallback，
       // 但加入檢查以避免讀到空行
       if (row[1]) {
         roomNumber = row[1];
         checkIn = row[2];
         checkOut = row[3];
       }
    }
    
    if (roomNumber) {
      // 確保日期被正確轉換為 Date 物件
      const parseDate = (d) => {
        if (d instanceof Date) return d;
        if (typeof d === 'string') return new Date(d);
        return null;
      };
      
      const cIn = parseDate(checkIn);
      const cOut = parseDate(checkOut);
      
      if (cIn && cOut) {
        bookings.push({
          roomNumber: String(roomNumber),
          checkIn: cIn,
          checkOut: cOut
        });
      }
    }
  }
  
  return bookings;
}

// ==================== SHEET 資料寫入 ====================

/**
 * saveBooking - 寫入訂單（包含客戶資料）
 * 寫入順序：
 * 時間戳, 姓名, 電話, Line ID, Email, 房號, 入住日, 退房日, 
 * 成人, 5歲+, 未滿5歲, 加床數, 大小狗數, 
 * 基礎房價, 加床費, 加人費, 寵物費, 總金額, 訂單ID, 細項JSON
 */
function saveBooking(bookingData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
  
  // 如果分頁不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.BOOKINGS);
    sheet.appendRow([
      'createdAt', 'name', 'phone', 'lineId', 'email',
      'roomNumber', 'checkIn', 'checkOut',
      'adults', 'children5Plus', 'childrenUnder5', 'extraBeds',
      'petLarge', 'petSmall',
      'roomPrice', 'extraBedPrice', 'extraPersonFee', 'petFee', 'totalAmount',
      'bookingId', 'details'
    ]);
  } else {
    // 檢查是否有標題列，如果沒有或只有舊標題，建議重新加上標題（不覆蓋資料）
    // 為簡單起見，這裡假設使用者會手動處理或我們直接追加
  }
  
  // 生成訂單 ID
  const bookingId = 'BK' + new Date().getTime();
  
  // 寫入資料
  sheet.appendRow([
    bookingData.createdAt,
    bookingData.name,
    bookingData.phone,
    bookingData.lineId || '未填寫',
    bookingData.email || '未填寫',
    bookingData.roomNumber,
    bookingData.checkIn,
    bookingData.checkOut,
    bookingData.adults,
    bookingData.children5Plus,
    bookingData.childrenUnder5,
    bookingData.extraBeds,
    bookingData.petLarge || 0,
    bookingData.petSmall || 0,
    bookingData.breakdown.roomPrice,
    bookingData.breakdown.extraBedPrice,
    bookingData.breakdown.extraPersonFee,
    bookingData.breakdown.petFee,
    bookingData.totalAmount,
    bookingId,
    JSON.stringify(bookingData.breakdown)
  ]);
  
  return bookingId;
}

// ==================== 衝突檢查與輔助函數 ====================

/**
 * 檢查日期衝突
 * 核心邏輯：統一將日期轉換為 'YYYY-MM-DD' 字串進行比較，避免時區問題
 */
function checkDateConflict(roomNumber, checkInStr, checkOutStr) {
  const bookings = getBookings();
  
  // 輸入的日期應為 YYYY-MM-DD 字串
  // 為了保險，先轉 Date 再轉回標準字串
  const targetStart = formatDate(new Date(checkInStr));
  // 注意：退房日當天是可以被別人入住的，所以區間比較時通常是用 [start, end)
  // 但為了方便字串比較，我們比較 "晚數"。
  // 衝突定義：
  // 新訂單 (NS, NE) 與 舊訂單 (OS, OE)
  // 衝突若：NS < OE 且 NE > OS
  
  const targetEnd = formatDate(new Date(checkOutStr)); // 退房日
  
  return bookings.some(booking => {
    if (String(booking.roomNumber) !== String(roomNumber)) return false;
    
    // booking.checkIn 來自 Sheet，可能是 Date 物件
    const existStart = formatDate(new Date(booking.checkIn));
    const existEnd = formatDate(new Date(booking.checkOut));
    
    // 字串比較 (YYYY-MM-DD 格式下，字串比較等同於日期比較)
    // 衝突條件：新入住日 < 舊退房日 AND 新退房日 > 舊入住日
    // 舉例：舊單 25-27 (25晚, 26晚)
    // 新單 26-27 (26晚) -> 26 < 27 (True) AND 27 > 25 (True) -> 衝突！
    return (targetStart < existEnd && targetEnd > existStart);
  });
}

/**
 * 取得指定房號的已訂日期列表
 */
function getBookedDates(roomNumber) {
  const bookings = getBookings();
  const bookedDates = [];
  
  bookings
    .filter(b => String(b.roomNumber) === String(roomNumber))
    .forEach(booking => {
      // 處理日期物件
      let current = new Date(booking.checkIn);
      const end = new Date(booking.checkOut);
      
      // 迴圈產生每一晚的日期字串
      while (current < end) {
        bookedDates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
      }
    });
  
  return [...new Set(bookedDates)]; // 去重
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 取得指定範圍的房況與日期類型
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {number} days - 天數 (Default 30)
 */
function getAvailabilityWindow(startDateStr, days) {
  const rooms = getPriceList();
  const bookings = getBookings();
  const holidayConfig = getHolidayConfig();
  
  const calendar = [];
  const start = new Date(startDateStr);
  
  for (let i = 0; i < days; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    
    const dateStr = formatDate(current);
    const type = getDateType(current, holidayConfig);
    
    let typeLabel = '平日';
    if (type === DATE_TYPES.HOLIDAY) typeLabel = '假日';
    if (type === DATE_TYPES.CNY) typeLabel = '春節';
    
    calendar.push({
      date: dateStr,
      type: type,
      label: typeLabel
    });
  }
  
  // 為了效能，過濾只在範圍內的訂單 (Optional, 但傳輸量較小)
  // 這裡回傳完整 bookings 讓前端處理，或是稍微過濾
  // 簡單起見回傳全部 bookings，前端處理 mapping
  
  return {
    rooms: rooms.map(r => ({ roomNumber: r.roomNumber, roomType: r.roomType })),
    calendar,
    bookings // Array of { roomNumber, checkIn, checkOut }
  };
}
