import './Components.css';

export default function GuestCounter({ label, value, onChange, min = 0, max = 10, info }) {
    const increment = () => {
        if (value < max) onChange(value + 1);
    };

    const decrement = () => {
        if (value > min) onChange(value - 1);
    };

    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {info && <div className="field-info">ℹ️ {info}</div>}
            <div className="counter">
                <button
                    type="button"
                    className="counter-btn"
                    onClick={decrement}
                    disabled={value <= min}
                >
                    −
                </button>
                <span className="counter-value">{value}</span>
                <button
                    type="button"
                    className="counter-btn"
                    onClick={increment}
                    disabled={value >= max}
                >
                    +
                </button>
            </div>
        </div>
    );
}
