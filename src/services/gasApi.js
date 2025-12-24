/**
 * GAS API Service
 * 封裝所有與 Google Apps Script 後端的通訊
 */

// 排除佔位符文字，使用實際的 GAS API URL
const envUrl = import.meta.env.VITE_GAS_API_URL;
const API_URL = (envUrl && envUrl !== 'YOUR_DEPLOYMENT_URL_HERE')
    ? envUrl
    : ''; // [Security] Hardcoded URL removed. Please set VITE_GAS_API_URL in .env

if (!API_URL) {
    console.error("Configuration Error: VITE_GAS_API_URL is missing. Please check your .env file.");
}

/**
 * 獲取房間列表
 */
export async function fetchRooms() {
    try {
        const response = await fetch(`${API_URL}?action=getRooms`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || '無法獲取房間列表');
        }

        return data.data;
    } catch (error) {
        console.error('fetchRooms error:', error);
        throw error;
    }
}

/**
 * 獲取現有訂單
 */
export async function fetchBookings() {
    try {
        const response = await fetch(`${API_URL}?action=getBookings`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || '無法獲取訂單列表');
        }

        return data.data;
    } catch (error) {
        console.error('fetchBookings error:', error);
        throw error;
    }
}

/**
 * 獲取指定房間的已預訂日期
 * @param {string} roomNumber 
 * @returns {Promise<string[]>} 已訂日期列表 (YYYY-MM-DD)
 */
export async function getBookedDates(roomNumber) {
    try {
        const response = await fetch(`${API_URL}?action=getBookedDates&roomNumber=${roomNumber}&t=${new Date().getTime()}`);
        const data = await response.json();

        if (!data.success) {
            console.warn('無法獲取已訂日期:', data.error);
            return []; // 發錯錯誤時回傳空陣列，避免卡住
        }

        return data.data;
    } catch (error) {
        console.error('getBookedDates error:', error);
        return [];
    }
}

/**
 * 取得房況預覽資料 (30天)
 * @param {string} startDate - YYYY-MM-DD
 * @param {number} days - default 30
 */
export async function fetchAvailability(startDate, days = 30) {
    try {
        const response = await fetch(`${API_URL}?action=getAvailability&startDate=${startDate}&days=${days}&t=${new Date().getTime()}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        return data.data;
    } catch (error) {
        console.error("Fetch availability failed", error);
        throw error;
    }
}

/**
 * 第一階段：計算費用 (不寫入)
 * @param {Object} bookingData - 訂房資料
 * @param {Object} customerInfo - 客戶資料
 */
export async function calculatePrice(bookingData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: "follow", // 重要：處理 GAS 302 重定向
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // 改用 text/plain 避免 CORS 預檢請求失敗
            },
            body: JSON.stringify({
                ...bookingData,
                action: 'CALCULATE'
            }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || '計價失敗');
        }

        return data.data;
    } catch (error) {
        console.error('calculatePrice error:', error);
        throw error;
    }
}

/**
 * 第二階段：建立訂單 (寫入)
 * @param {Object} bookingData - 訂房資料
 * @param {Object} customerInfo - 客戶資料
 */
export async function createBooking(bookingData, customerInfo) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: "follow",
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                ...bookingData,
                ...customerInfo,
                action: 'BOOK'
            }),
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || '訂房失敗');
        }

        return data.data;
    } catch (error) {
        console.error('createBooking error:', error);
        throw error;
    }
}
