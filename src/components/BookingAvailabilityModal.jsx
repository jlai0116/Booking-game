import React, { useState, useEffect, useCallback } from 'react';
import { fetchAvailability } from '../services/gasApi';
import './BookingAvailabilityModal.css';

const BookingAvailabilityModal = ({ isOpen, onClose, onSelectSlot }) => {
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    const [fetchedData, setFetchedData] = useState(null); // { rooms, calendar, bookings }
    const [loading, setLoading] = useState(false);

    // 初始化：讀取 URL 中的 startDate
    useEffect(() => {
        if (isOpen) {
            const params = new URLSearchParams(window.location.search);
            const urlDate = params.get('startDate');
            if (urlDate) {
                setViewDate(urlDate);
            } else {
                setViewDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen]);

    // 同步 URL
    useEffect(() => {
        if (isOpen) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('startDate') !== viewDate) {
                params.set('startDate', viewDate);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [viewDate, isOpen]);

    // 資料抓取與預取邏輯
    const refreshData = useCallback(async (forcerefresh = false) => {
        if (!isOpen) return;

        // 檢查是否需要重新抓取
        // 條件：強制刷新 OR 目前 viewDate 超出已抓取範圍 (簡單起見，每次切換都檢查，若在範圍內則不抓？？用戶要求 30 天 prefetch)
        // 使用者要求：翻頁超出 30 天範圍時才再次請求。
        // 這裡實作簡單版：如果 fetchedData 包含 viewDate 往後 7 天，就不抓。

        let shouldFetch = false;
        if (forcerefresh || !fetchedData) {
            shouldFetch = true;
        } else {
            // 檢查 viewDate + 6 是否在 fetchedData.calendar 中
            const lastViewDate = new Date(viewDate);
            lastViewDate.setDate(lastViewDate.getDate() + 6);
            const lastViewStr = lastViewDate.toISOString().split('T')[0];

            const lastFetchedStr = fetchedData.calendar[fetchedData.calendar.length - 1].date;

            if (lastViewStr > lastFetchedStr || viewDate < fetchedData.calendar[0].date) {
                shouldFetch = true;
            }
        }

        if (shouldFetch) {
            setLoading(true);
            try {
                // 抓取 35 天作為緩衝 (30天 + 少量 buffer)
                const data = await fetchAvailability(viewDate, 35);
                setFetchedData(data);
            } catch (error) {
                console.error("Failed to fetch availability", error);
                alert("無法載入房況，請稍後再試");
            } finally {
                setLoading(false);
            }
        }
    }, [isOpen, viewDate, fetchedData]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // 處理日期導航
    const handlePrevWeek = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() - 7);
        // 阻止回到過去 (比今天早)
        if (d < new Date(new Date().setHours(0, 0, 0, 0))) {
            alert("無法查詢過去的日期");
            return;
        }
        setViewDate(d.toISOString().split('T')[0]);
    };

    const handleNextWeek = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + 7);
        setViewDate(d.toISOString().split('T')[0]);
    };

    const handleDateChange = (e) => {
        setViewDate(e.target.value);
    };

    // 判斷格子狀態
    const getSlotStatus = (roomNumber, dateStr) => {
        if (!fetchedData) return 'loading';

        const isBooked = fetchedData.bookings.some(b =>
            String(b.roomNumber) === String(roomNumber) &&
            b.checkIn <= dateStr && b.checkOut > dateStr // checkOut 當天可訂，所以是用 [checkIn, checkOut)
        );

        return isBooked ? 'sold-out' : 'open';
    };

    if (!isOpen) return null;

    // 計算當前顯示的 7 天
    const displayedDays = [];
    if (fetchedData) {
        // 從 fetchedData.calendar 裡找
        const startIndex = fetchedData.calendar.findIndex(c => c.date === viewDate);
        if (startIndex >= 0) {
            for (let i = 0; i < 7; i++) {
                if (fetchedData.calendar[startIndex + i]) {
                    displayedDays.push(fetchedData.calendar[startIndex + i]);
                }
            }
        }
    }

    // 格式化日期顯示 (例如 02/16 週一)
    const formatHeaderDate = (dateStr) => {
        const d = new Date(dateStr);
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        return `${m}/${day} (${weekDay})`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>即時房況預覽</h2>
                    <div className="nav-controls">
                        <button onClick={handlePrevWeek}>&lt;</button>
                        <input
                            type="date"
                            value={viewDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={handleDateChange}
                        />
                        <button onClick={handleNextWeek}>&gt;</button>
                    </div>
                </header>

                <div className="table-container">
                    {loading && <div className="loading-mask">載入中...</div>}
                    <div className="status-grid">
                        <div className="header-row">
                            <div className="sticky-col header-cell">房號</div>
                            {displayedDays.map(day => (
                                <div key={day.date} className={`header-cell type-${day.type}`}>
                                    <div className="date-text">{formatHeaderDate(day.date)}</div>
                                    <div className="type-tag">{day.label}</div>
                                </div>
                            ))}
                        </div>

                        {fetchedData && fetchedData.rooms.map(room => (
                            <div key={room.roomNumber} className="room-row">
                                <div className="sticky-col room-cell">
                                    <div className="room-no">{room.roomNumber}</div>
                                    <div className="room-type">{room.roomType}</div>
                                </div>
                                {displayedDays.map(day => {
                                    const status = getSlotStatus(room.roomNumber, day.date);
                                    return (
                                        <div
                                            key={day.date}
                                            className={`slot-cell status-${status}`}
                                            onClick={() => {
                                                if (status === 'open') {
                                                    onSelectSlot(room.roomNumber, day.date);
                                                }
                                            }}
                                        >
                                            {status === 'open' ? '預訂' : '已滿'}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <button className="close-btn" onClick={onClose}>關閉</button>
            </div>
        </div>
    );
};

export default BookingAvailabilityModal;
