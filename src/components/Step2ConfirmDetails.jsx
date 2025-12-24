import React from 'react';

export default function Step2ConfirmDetails({
    formData,
    customerInfo,
    updateCustomerInfo,
    priceResult,
    selectedRoom,
    onSubmit,
    onBack,
    loading
}) {
    // 計算總天數
    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)); // 簡單計算，實際以後端回傳為主
    // 這裡我們也可以直接用 priceResult.breakdown.nights 如果有的話

    const displayNights = priceResult?.breakdown?.nights || nights;

    return (
        <div className="step2-container fade-in">
            <h2 className="step-title">確認訂房明細 & 填寫資料</h2>

            <div className="card glass details-card">
                {/* A. 訂房資訊 */}
                <div className="section-block">
                    <h3 className="section-header">🏠 訂房資訊</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>房號</label>
                            <span>{formData.roomNumber} ({selectedRoom?.roomType})</span>
                        </div>
                        <div className="info-item">
                            <label>入住日期</label>
                            <span>{formData.checkIn}</span>
                        </div>
                        <div className="info-item">
                            <label>退房日期</label>
                            <span>{formData.checkOut}</span>
                        </div>
                        <div className="info-item">
                            <label>住宿天數</label>
                            <span>{displayNights} 晚</span>
                        </div>
                    </div>
                </div>

                {/* B. 費用明細 */}
                <div className="section-block">
                    <h3 className="section-header">💰 費用明細</h3>
                    <div className="price-breakdown-list">
                        {priceResult.priceDetails && priceResult.priceDetails.length > 0 ? (
                            priceResult.priceDetails.map((item, index) => (
                                <div key={index} className="price-detail-row">
                                    <div className="detail-info">
                                        <div className="detail-label">{item.label}</div>
                                        <div className="detail-formula">{item.formula}</div>
                                    </div>
                                    <div className="detail-amount">
                                        NT$ {item.subtotal.toLocaleString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Fallback if priceDetails is missing (legacy support)
                            <>
                                <div className="price-row">
                                    <span>基礎房價</span>
                                    <span>NT$ {priceResult.breakdown.roomPrice.toLocaleString()}</span>
                                </div>
                                {priceResult.breakdown.extraBedPrice > 0 && (
                                    <div className="price-row">
                                        <span>加床費</span>
                                        <span>NT$ {priceResult.breakdown.extraBedPrice.toLocaleString()}</span>
                                    </div>
                                )}
                                {priceResult.breakdown.extraPersonFee > 0 && (
                                    <div className="price-row">
                                        <span>加人費</span>
                                        <span>NT$ {priceResult.breakdown.extraPersonFee.toLocaleString()}</span>
                                    </div>
                                )}
                                {priceResult.breakdown.petFee > 0 && (
                                    <div className="price-row">
                                        <span>寵物費</span>
                                        <span>NT$ {priceResult.breakdown.petFee.toLocaleString()}</span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="price-divider"></div>

                        <div className="price-row total">
                            <span>應付總金額</span>
                            <span className="total-amount">NT$ {priceResult.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* C. 客戶資料表單 */}
                <div className="section-block">
                    <h3 className="section-header">👤 訂房人資料</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label required">訂房人姓名</label>
                            <input
                                type="text"
                                className="form-input"
                                value={customerInfo.name}
                                onChange={(e) => updateCustomerInfo('name', e.target.value)}
                                placeholder="請輸入真實姓名"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">聯絡電話</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={customerInfo.phone}
                                onChange={(e) => updateCustomerInfo('phone', e.target.value)}
                                placeholder="09xx-xxx-xxx"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Line ID (選填)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={customerInfo.lineId}
                                onChange={(e) => updateCustomerInfo('lineId', e.target.value)}
                                placeholder="方便聯繫確認"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email (選填)</label>
                            <input
                                type="email"
                                className="form-input"
                                value={customerInfo.email}
                                onChange={(e) => updateCustomerInfo('email', e.target.value)}
                                placeholder="接收訂房通知"
                            />
                        </div>
                    </div>
                </div>

                <div className="button-group">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onBack}
                        disabled={loading}
                    >
                        回上一頁
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onSubmit}
                        disabled={loading || !customerInfo.name || !customerInfo.phone}
                    >
                        {loading ? '送出中...' : '確認送出'}
                    </button>
                </div>
            </div>
        </div>
    );
}
