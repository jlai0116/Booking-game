import { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useBooking } from '../hooks/useBooking';
import RoomSelector from './RoomSelector';
import GuestCounter from './GuestCounter';
import OrderSummary from './OrderSummary';
import './BookingForm.css';

export default function BookingForm() {
    const { rooms, loading: roomsLoading } = useRooms();
    const { formData, updateField, submitBooking, result, loading, error } = useBooking();
    const [showSummary, setShowSummary] = useState(false);

    const selectedRoom = rooms.find(r => r.roomNumber === formData.roomNumber);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await submitBooking(selectedRoom);
            setShowSummary(true);
        } catch (err) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleNewBooking = () => {
        setShowSummary(false);
        window.location.reload();
    };

    if (showSummary && result) {
        return <OrderSummary result={result} formData={formData} selectedRoom={selectedRoom} onNewBooking={handleNewBooking} />;
    }

    return (
        <div className="booking-form-wrapper">
            <div className="booking-header">
                <h1 className="booking-title">🏖️ 海景民宿線上訂房</h1>
                <p className="booking-subtitle">享受專屬的海岸假期</p>
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
                                <span>處理中...</span>
                            </>
                        ) : (
                            '立即訂房'
                        )}
                    </button>

                    <p className="price-note">
                        * 最終金額以系統計算為準，包含所有日期類型與費用
                    </p>
                </div>
            </form>
        </div>
    );
}
