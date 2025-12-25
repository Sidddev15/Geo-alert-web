export type GeoResult = { lat: number; lng: number; accuracyM: number };

export function getCurrentPositionAsync(opts?: PositionOptions): Promise<GeoResult> {
    const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 0,
        ...opts,
    };

    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation API not available in this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                // Deterministic numeric checks (prevents your Zod failures)
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    reject(new Error(`Invalid coordinates: lat=${String(lat)} lng=${String(lng)}`));
                    return;
                }

                resolve({ lat, lng, accuracyM: pos.coords.accuracy });
            },
            (err) => {
                // Normalize typical cases
                if (err.code === err.PERMISSION_DENIED) reject(new Error('Permission denied for location.'));
                else if (err.code === err.POSITION_UNAVAILABLE) reject(new Error('Position unavailable.'));
                else if (err.code === err.TIMEOUT) reject(new Error('Location request timed out.'));
                else reject(new Error(err.message || 'Unknown geolocation error.'));
            },
            options
        );
    });
}
