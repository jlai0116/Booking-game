import { useState } from 'react';
import { calculatePrice, createBooking } from '../services/gasApi';

/**
 * useBooking Hook
 * 管理訂房邏輯與表單狀態 - 支援兩階段提交
 */
export function useBooking() {
    const [formData, setFormData] = useState({
        roomNumber: '',
        checkIn: '',
        checkOut: '',
        adults: 2,
        children5Plus: 0,
        childrenUnder5: 0,
        extraBeds: 0,
        petLarge: 0,
        petSmall: 0,
    });

    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        lineId: '',
        email: ''
    });

    const [priceResult, setPriceResult] = useState(null); // 第一階段結果
    const [bookingResult, setBookingResult] = useState(null); // 第二階段結果
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * 更新訂房條件欄位
     */
    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
        setPriceResult(null); // 變更條件需重新計價
    };

    /**
     * 更新客戶資料欄位
     */
    const updateCustomerInfo = (field, value) => {
        setCustomerInfo(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    /**
     * 驗證 Step 1 表單
     */
    const validateStep1 = () => {
        if (!formData.roomNumber) throw new Error('請選擇房間');
        if (!formData.checkIn || !formData.checkOut) throw new Error('請選擇入住與退房日期');

        const checkIn = new Date(formData.checkIn);
        const checkOut = new Date(formData.checkOut);
        if (checkIn >= checkOut) throw new Error('退房日期必須晚於入住日期');

        const totalGuests = formData.adults + formData.children5Plus + formData.childrenUnder5;
        if (totalGuests === 0) throw new Error('至少需要一位入住者');

        return true;
    };

    /**
     * 第一階段：執行計價
     */
    const handleCalculate = async (selectedRoom) => {
        try {
            setLoading(true);
            setError(null);

            validateStep1();

            if (formData.extraBeds > selectedRoom.extraBeds) {
                throw new Error(`此房型最多只能加 ${selectedRoom.extraBeds} 床`);
            }

            // 檢查可訂性 (簡易版)
            // 注意：實際的衝突檢查最好也在 Server 端再次確認，這裡做初步篩選
            // 但因為我們有鎖住日期，這裡主要是防止並發問題或漏網之魚
            // CALCULATE action 不會檢查衝突，所以我們可以在這裡先呼叫 checkAvailability (如果需要)
            // 不過既然我們有鎖日期，這裡主要依賴 CALCULATE 是否成功

            const result = await calculatePrice(formData);
            setPriceResult(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * 第二階段：提交訂單
     */
    const handleSubmitBooking = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!customerInfo.name || !customerInfo.phone) {
                throw new Error('請填寫姓名與電話');
            }

            // 再次確認有計價結果
            if (!priceResult) {
                throw new Error('請先完成費用試算');
            }

            const result = await createBooking(formData, customerInfo);
            setBookingResult(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * 重置表單
     */
    const resetForm = () => {
        setFormData({
            roomNumber: '',
            checkIn: '',
            checkOut: '',
            adults: 2,
            children5Plus: 0,
            childrenUnder5: 0,
            extraBeds: 0,
            petLarge: 0,
            petSmall: 0,
        });
        setCustomerInfo({
            name: '',
            phone: '',
            lineId: '',
            email: ''
        });
        setPriceResult(null);
        setBookingResult(null);
        setError(null);
    };

    return {
        formData,
        customerInfo,
        updateField,
        updateCustomerInfo,
        handleCalculate,
        handleSubmitBooking,
        resetForm,
        priceResult,
        bookingResult,
        loading,
        error
    };
}
