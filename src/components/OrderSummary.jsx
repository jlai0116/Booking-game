import './OrderSummary.css';

export default function OrderSummary({ result, formData, selectedRoom, onNewBooking }) {
    const totalGuests = formData.adults + formData.children5Plus + formData.childrenUnder5;

    return (
        <div className="order-summary-wrapper">
            <div className="success-animation">
                <div className="checkmark">✓</div>
            </div>

            <div className="order-summary">
                <div className="card glass">
                    <div className="summary-header">
                        <h2 className="summary-title">🎉 訂房成功！</h2>
                        <p className="summary-subtitle">您的訂單已確認</p>
                        <div className="booking-id">訂單編號：{result.bookingId}</div>
                    </div>

                    <div className="summary-section">
                        <h3 className="section-title">📋 訂房資訊</h3>

                        <div className="info-row">
                            <span className="info-label">房間</span>
                            <span className="info-value">
                                {formData.roomNumber} - {selectedRoom?.roomType}
                            </span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">入住日期</span>
                            <span className="info-value">{formData.checkIn}</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">退房日期</span>
                            <span className="info-value">{formData.checkOut}</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">住宿天數</span>
                            <span className="info-value">{result.breakdown.nights} 晚</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">入住人數</span>
                            <span className="info-value">
                                {totalGuests} 人
                                {formData.adults > 0 && ` (成人${formData.adults})`}
                                {formData.children5Plus > 0 && ` (5歲以上${formData.children5Plus})`}
                                {formData.childrenUnder5 > 0 && ` (未滿5歲${formData.childrenUnder5})`}
                            </span>
                        </div>

                        {formData.extraBeds > 0 && (
                            <div className="info-row">
                                <span className="info-label">加床</span>
                                <span className="info-value">{formData.extraBeds} 床</span>
                            </div>
                        )}

                        {(formData.petLarge > 0 || formData.petSmall > 0) && (
                            <div className="info-row">
                                <span className="info-label">寵物</span>
                                <span className="info-value">
                                    {formData.petLarge > 0 && `大型${formData.petLarge}隻 `}
                                    {formData.petSmall > 0 && `小型${formData.petSmall}隻`}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="summary-section">
                        <h3 className="section-title">💰 費用明細</h3>

                        <div className="fee-row">
                            <span className="fee-label">房價</span>
                            <span className="fee-value">NT$ {result.breakdown.roomPrice.toLocaleString()}</span>
                        </div>

                        {result.breakdown.extraBedPrice > 0 && (
                            <div className="fee-row">
                                <span className="fee-label">加床費用</span>
                                <span className="fee-value">NT$ {result.breakdown.extraBedPrice.toLocaleString()}</span>
                            </div>
                        )}

                        {result.breakdown.extraPersonFee > 0 && (
                            <div className="fee-row">
                                <span className="fee-label">加人費用</span>
                                <span className="fee-value">NT$ {result.breakdown.extraPersonFee.toLocaleString()}</span>
                            </div>
                        )}

                        {result.breakdown.petFee > 0 && (
                            <div className="fee-row">
                                <span className="fee-label">寵物費用</span>
                                <span className="fee-value">NT$ {result.breakdown.petFee.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="fee-total">
                            <span className="total-label">總金額</span>
                            <span className="total-value">NT$ {result.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="summary-section">
                        <h3 className="section-title">📅 每日計價明細</h3>
                        <div className="daily-breakdown">
                            {result.dailyBreakdown.map((day, index) => (
                                <div key={index} className="daily-row">
                                    <span className="daily-date">{day.date}</span>
                                    <span className={`daily-type ${day.dateType}`}>
                                        {day.dateType === 'weekday' && '平日'}
                                        {day.dateType === 'holiday' && '假日'}
                                        {day.dateType === 'cny' && '過年'}
                                    </span>
                                    <span className="daily-price">
                                        NT$ {(day.roomPrice + day.extraBedPrice + day.extraPersonFee).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {result.capacityInfo && result.capacityInfo.overflow > 0 && (
                        <div className="alert alert-info">
                            💡 您的入住人數超過房間容量 {result.capacityInfo.overflow} 人，已計算加人費用
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={onNewBooking}>
                        再訂一間
                    </button>
                </div>
            </div>
        </div>
    );
}
