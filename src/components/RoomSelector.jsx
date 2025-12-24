import './Components.css';

export default function RoomSelector({ rooms, loading, selectedRoom, onChange }) {
    if (loading) {
        return (
            <div className="form-group">
                <label className="form-label">選擇房間</label>
                <div className="loading-placeholder">載入房間列表中...</div>
            </div>
        );
    }

    return (
        <div className="form-group">
            <label className="form-label">選擇房間</label>
            <select
                className="form-select"
                value={selectedRoom}
                onChange={(e) => onChange(e.target.value)}
                required
            >
                <option value="">請選擇房間</option>
                {rooms.map((room) => (
                    <option key={room.roomNumber} value={room.roomNumber}>
                        {room.roomNumber} - {room.roomType}
                        (容量{room.baseCapacity}人，最多加{room.extraBeds}床)
                        - NT${room.weekdayPrice.toLocaleString()}起
                    </option>
                ))}
            </select>

            {selectedRoom && (
                <div className="room-details">
                    {rooms.filter(r => r.roomNumber === selectedRoom).map(room => (
                        <div key={room.roomNumber} className="room-info">
                            <div className="price-row">
                                <span className="price-label">💰 平日</span>
                                <span className="price-value">NT$ {room.weekdayPrice.toLocaleString()}</span>
                            </div>
                            <div className="price-row">
                                <span className="price-label">🎉 假日</span>
                                <span className="price-value">NT$ {room.holidayPrice.toLocaleString()}</span>
                            </div>
                            <div className="price-row">
                                <span className="price-label">🧧 過年</span>
                                <span className="price-value highlight">NT$ {room.cnyPrice.toLocaleString()}</span>
                            </div>
                            {room.note && (
                                <div className="room-note">📏 {room.note}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
