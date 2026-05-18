# Backend Contract for ESP32 Device

## Endpoint

`POST /api/iot/attendance`

## Headers

```http
Content-Type: application/json
x-device-secret: ENTRANCE_DEVICE_SECRET
```

Fallback shared-secret mode also exists, but device-secret auth is preferred for demos and production:

```http
x-api-key: IOT_API_KEY
```

## Request Body

```json
{
  "uid": "46 14 33 07",
  "deviceCode": "ENTRANCE-01",
  "firmwareVersion": "1.3.2",
  "ipAddress": "192.168.1.41",
  "signalStrength": -55,
  "source": "LIVE",
  "idempotencyKey": "ENTRANCE-01-1715580000-46143307"
}
```

Optional fields:

```json
{
  "occurredAt": "2026-05-13T08:00:00.000Z",
  "bootedAt": "2026-05-13T06:00:00.000Z",
  "syncBatchId": "ENTRANCE-01-sync-1715580000"
}
```

## Successful Response

```json
{
  "ok": true,
  "code": "CHECK_IN_RECORDED",
  "action": "CHECK_IN",
  "authMode": "device",
  "employee": {
    "id": "cm...",
    "employeeNo": "EMP-001",
    "name": "Wilson Kumalo"
  },
  "message": "Checked in"
}
```

## Duplicate Or Already-Handled Response

These responses are intentionally non-fatal so the terminal does not requeue them:

```json
{
  "ok": true,
  "code": "DUPLICATE_TAP",
  "action": "CHECK_IN",
  "message": "Duplicate tap ignored after check-in"
}
```

## Unknown Card Response

```json
{
  "ok": false,
  "code": "UNKNOWN_CARD",
  "message": "Unknown or inactive card",
  "uid": "46 14 33 07"
}
```

## Unauthorized Device Response

```json
{
  "ok": false,
  "error": "Unauthorized device"
}
```

## Rate Limited Response

```json
{
  "ok": false,
  "error": "Rate limit exceeded",
  "retryAfterMs": 12000
}
```
