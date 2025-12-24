import './SuccessPage.css';

export default function SuccessPage({ bookingResult, onReset, roomInfo }) {
    if (!bookingResult) return null;

    return (
        <div className="success-page">
            <div className="success-card glass">
                <div className="success-icon">🎉</div>
                <h2 className="success-title">您的訂單已送出！</h2>

                <div className="success-content">
                    <p className="order-id">訂單編號：{bookingResult.bookingId}</p>

                    <div className="contact-info-panel">
                        <div className="contact-simple-list">
                            <p className="contact-action">請致電並確認此預訂是否成功</p>
                            <p className="contact-phone">0925-095153 / 0939-980470 陳小姐</p>
                            <p className="contact-time">(訂房時間 10:30~21:00)</p>
                            <p className="contact-line">或加 Line ID: 0925095153 聯繫</p>
                        </div>
                    </div>

                    <div className="booking-summary-mini">
                        {roomInfo && (
                            <p className="room-summary">
                                房號{roomInfo.roomNumber} ({roomInfo.roomType})
                            </p>
                        )}
                        <p><strong>入住日期：</strong>{bookingResult.dailyBreakdown?.[0]?.date} ({bookingResult.capacityInfo?.nights || bookingResult.breakdown?.nights} 晚)</p>
                        <p><strong>總金額：</strong>NT$ {bookingResult.totalAmount?.toLocaleString()}</p>
                    </div>
                </div>

                <div className="action-buttons">
                    <button onClick={onReset} className="btn btn-secondary">
                        說明：回到訂房首頁
                    </button>

                    {/* Line QRCode placeholder - 實際上可能需要圖片 */}
                    <div className="line-section">
                        <p>我要加 Line</p>
                        {/* 這裡假設有一個 QRCode 圖片，先用文字代替或預留位置 */}
                        <div className="qr-placeholder">Line QR Code</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
