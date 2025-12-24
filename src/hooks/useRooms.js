import { useState, useEffect } from 'react';
import { fetchRooms } from '../services/gasApi';

/**
 * useRooms Hook
 * 管理房間列表資料
 */
export function useRooms() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadRooms() {
            try {
                setLoading(true);
                const data = await fetchRooms();
                setRooms(data);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadRooms();
    }, []);

    return { rooms, loading, error };
}
