import React, { useEffect } from 'react';
import RoomSelector from './RoomSelector';
import GuestCounter from './GuestCounter';

export default function Step1BookingInfo({
    formData,
    updateField,
    rooms,
    roomsLoading,
    onNext,
    loading,
    error,
    bookedDates = [],
    onOpenAvailability
}) {
    const selectedRoom = rooms.find(r => r.roomNumber === formData.roomNumber);

    const handleSubmit = (e) => {
        e.preventDefault();
        onNext(selectedRoom);
    };

    useEffect(() => {
        // 嚴格檢查：如果入住日期在已訂列表中，清空並警告
        if (formData.checkIn && bookedDates.includes(formData.checkIn)) {
            alert(`很抱歉，${formData.checkIn} 已被預訂，請重新選擇。`);
            updateField('checkIn', '');
        }

        // 嚴格檢查：如果退房日期在已訂列表中
        if (formData.checkIn && formData.checkOut) {
            const start = new Date(formData.checkIn);
            const end = new Date(formData.checkOut);

            // 檢查區間內的每一天是否被佔用
            let current = new Date(start);
            let hasConflict = false;

            // 簡單的本地日期格式化函數 (YYYY-MM-DD)，避免時區問題
            const formatDateLocal = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            while (current < end) {
                // 使用本地時間格式化，確保與 backend 回傳的格式一致
                const dateStr = formatDateLocal(current);

                if (bookedDates.includes(dateStr)) {
                    hasConflict = true;
                    break;
                }
                current.setDate(current.getDate() + 1);
            }

            if (hasConflict) {
                alert('您選擇的日期區間包含已售出日期，請重新選擇。');
                updateField('checkOut', '');
            }
        }
    }, [formData.checkIn, formData.checkOut, bookedDates, updateField]);

    return (
        <div className="booking-form-wrapper step1-container fade-in">
            <div className="booking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 className="booking-title">🏖️ 海景民宿線上訂房</h1>
                    <p className="booking-subtitle">Step 1: 選擇房型與日期</p>
                </div>
                <button
                    type="button"
                    className="btn view-availability-btn"
                    style={{
                        background: 'rgba(255,255,255,0.25)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.5)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backdropFilter: 'blur(5px)',
                        transition: 'all 0.3s'
                    }}
                    onClick={onOpenAvailability}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                >
                    📅 瀏覽訂房狀態
                </button>
            </div>

            <form className="booking-form" onSubmit={handleSubmit}>
                <div className="card glass">
                    {error && (
                        <div className="alert alert-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 房間選擇 */}
                    <RoomSelector
                        rooms={rooms}
                        loading={roomsLoading}
                        selectedRoom={formData.roomNumber}
                        onChange={(value) => updateField('roomNumber', value)}
                    />

                    {/* 日期選擇 */}
                    <div className="date-group">
                        <div className="form-group">
                            <label className="form-label">入住日期</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.checkIn}
                                onChange={(e) => updateField('checkIn', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                            {/* 簡單顯示已滿日期提示 (若有) */}
                            {bookedDates.length > 0 && formData.roomNumber && (
                                <small className="date-hint text-warning">
                                    此房號近期有已售出日期
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">退房日期</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.checkOut}
                                onChange={(e) => updateField('checkOut', e.target.value)}
                                min={formData.checkIn || new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </div>

                    {/* 人數選擇 */}
                    <div className="guests-section">
                        <h3 className="section-title">入住人數</h3>

                        <GuestCounter
                            label="成人"
                            value={formData.adults}
                            onChange={(value) => updateField('adults', value)}
                            min={0}
                            max={10}
                        />

                        <GuestCounter
                            label="5歲以上孩童"
                            value={formData.children5Plus}
                            onChange={(value) => updateField('children5Plus', value)}
                            min={0}
                            max={10}
                        />

                        <GuestCounter
                            label="未滿5歲孩童"
                            value={formData.childrenUnder5}
                            onChange={(value) => updateField('childrenUnder5', value)}
                            min={0}
                            max={10}
                            info="平日/假日前2人免費，過年前1人免費"
                        />
                    </div>

                    {/* 加床選項 */}
                    {selectedRoom && selectedRoom.extraBeds > 0 && (
                        <div className="extras-section">
                            <h3 className="section-title">加床服務</h3>

                            <div className="form-group">
                                <label className="form-label">
                                    加床數量 (最多 {selectedRoom.extraBeds} 床)
                                </label>
                                <select
                                    className="form-select"
                                    value={formData.extraBeds}
                                    onChange={(e) => updateField('extraBeds', parseInt(e.target.value))}
                                >
                                    {[...Array(selectedRoom.extraBeds + 1)].map((_, i) => (
                                        <option key={i} value={i}>
                                            {i === 0 ? '不需要' : `${i} 床`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {formData.extraBeds > 0 && (
                                <div className="alert alert-info">
                                    💡 加床會增加房間容納人數，只有超過容量才會計算加人費用
                                </div>
                            )}
                        </div>
                    )}

                    {/* 寵物選項 */}
                    <div className="pets-section">
                        <h3 className="section-title">🐾 寵物入住</h3>

                        <GuestCounter
                            label="大型犬 (>10kg 或肩高>40cm)"
                            value={formData.petLarge}
                            onChange={(value) => updateField('petLarge', value)}
                            min={0}
                            max={3}
                        />

                        <GuestCounter
                            label="小型犬 (≤10kg 或肩高≤40cm)"
                            value={formData.petSmall}
                            onChange={(value) => updateField('petSmall', value)}
                            min={0}
                            max={3}
                        />
                    </div>

                    {/* 容量資訊 */}
                    {selectedRoom && (
                        <div className="capacity-info">
                            <div className="capacity-card">
                                <div className="capacity-item">
                                    <span className="capacity-label">基礎容量</span>
                                    <span className="capacity-value">{selectedRoom.baseCapacity} 人</span>
                                </div>
                                <div className="capacity-item">
                                    <span className="capacity-label">最終容量</span>
                                    <span className="capacity-value highlight">
                                        {selectedRoom.baseCapacity + formData.extraBeds} 人
                                    </span>
                                </div>
                                <div className="capacity-item">
                                    <span className="capacity-label">總入住人數</span>
                                    <span className="capacity-value">
                                        {formData.adults + formData.children5Plus + formData.childrenUnder5} 人
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 提交按鈕 */}
                    <button
                        type="submit"
                        className="btn btn-primary submit-btn"
                        disabled={loading || !formData.roomNumber}
                    >
                        {loading ? (
                            <>
                                <span className="loading"></span>
                                <span>計算中...</span>
                            </>
                        ) : (
                            '立即訂房 (下一步)'
                        )}
                    </button>

                    <p className="price-note text-center mt-2">
                        * 點擊後將進行費用試算與確認
                    </p>
                </div>
            </form>
        </div>
    );
}
