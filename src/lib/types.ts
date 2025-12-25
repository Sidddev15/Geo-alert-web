export type EventType = 'manual' | 'night' | 'emergency' | 'auto' | 'stopped_confirmed';

export type EventPayload = {
    lat: number;
    lng: number;
    eventType: EventType;
};
