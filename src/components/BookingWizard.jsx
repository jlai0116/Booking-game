import { useState, useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useBooking } from '../hooks/useBooking';
import { getBookedDates } from '../services/gasApi';
import Step1BookingInfo from './Step1BookingInfo';
import Step2ConfirmDetails from './Step2ConfirmDetails';
import SuccessPage from './SuccessPage';
import BookingAvailabilityModal from './BookingAvailabilityModal';
import './BookingForm.css'; // Reuse styles

export default function BookingWizard() {
    const { rooms, loading: roomsLoading } = useRooms();
    const {
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
    } = useBooking();

    const [step, setStep] = useState(1); // 1: Info, 2: Confirm, 3: Success
    const [bookedDates, setBookedDates] = useState([]);
    const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

    // 當房號改變時，獲取已訂日期
    useEffect(() => {
        if (formData.roomNumber) {
            getBookedDates(formData.roomNumber).then(dates => {
                setBookedDates(dates);
            });
        } else {
            setBookedDates([]);
        }
    }, [formData.roomNumber]);

    const handleStep1Submit = async (selectedRoom) => {
        try {
            await handleCalculate(selectedRoom);
            setStep(2);
            window.scrollTo(0, 0);
        } catch (e) {
            // Error handled in hook
            console.error(e);
        }
    };

    const handleStep2Submit = async () => {
        try {
            await handleSubmitBooking();
            setStep(3);
            window.scrollTo(0, 0);
        } catch (e) {
            console.error(e);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleReset = () => {
        resetForm();
        setStep(1);
    };

    // 處理從看板點擊格子的動作
    const handleQuickConvert = (roomNumber, dateStr) => {
        updateField('roomNumber', roomNumber);
        updateField('checkIn', dateStr);
        // 清空退房日，讓使用者重新選擇
        updateField('checkOut', '');
        setIsAvailabilityOpen(false);
    };

    // Render Steps
    if (step === 3 && bookingResult) {
        const selectedRoom = rooms.find(r => r.roomNumber === formData.roomNumber);
        return (
            <SuccessPage
                bookingResult={bookingResult}
                onReset={handleReset}
                roomInfo={{
                    roomNumber: formData.roomNumber,
                    roomType: selectedRoom?.roomType
                }}
            />
        );
    }

    if (step === 2 && priceResult) {
        return (
            <Step2ConfirmDetails
                formData={formData}
                customerInfo={customerInfo}
                updateCustomerInfo={updateCustomerInfo}
                priceResult={priceResult}
                selectedRoom={rooms.find(r => r.roomNumber === formData.roomNumber)}
                onSubmit={handleStep2Submit}
                onBack={handleBack}
                loading={loading}
            />
        );
    }

    return (
        <>
            <Step1BookingInfo
                formData={formData}
                updateField={updateField}
                rooms={rooms}
                roomsLoading={roomsLoading}
                onNext={handleStep1Submit}
                loading={loading}
                error={error}
                bookedDates={bookedDates}
                onOpenAvailability={() => setIsAvailabilityOpen(true)}
            />

            <BookingAvailabilityModal
                isOpen={isAvailabilityOpen}
                onClose={() => setIsAvailabilityOpen(false)}
                onSelectSlot={handleQuickConvert}
            />
        </>
    );
}
