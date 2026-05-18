# ESP32 RFID Attendance IoT Terminal

ESP32 firmware for an RC522 RFID attendance terminal that posts card taps to the Next.js backend.

## What it does

- Connects ESP32 to WiFi
- Reads RFID card UIDs with RC522
- Sends taps to `POST /api/iot/attendance`
- Authenticates using `x-device-secret`
- Sends telemetry such as firmware version, IP address, RSSI, source, and idempotency key
- Shows LCD, LED, and buzzer feedback
- Persists offline queue entries across reboot and retries later without duplicating attendance events
- Supports enrollment mode for capturing new RFID cards into the backend

## Backend Contract

Request:

```http
POST /api/iot/attendance
Content-Type: application/json
x-device-secret: <device-secret>
```

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

Success response:

```json
{
  "ok": true,
  "code": "CHECK_IN_RECORDED",
  "action": "CHECK_IN",
  "employee": {
    "employeeNo": "EMP-001",
    "name": "Wilson Kumalo"
  },
  "message": "Checked in"
}
```

Unknown card response:

```json
{
  "ok": true,
  "code": "DUPLICATE_TAP",
  "message": "Duplicate tap ignored after check-in"
}
```

Unknown card response:

```json
{
  "ok": false,
  "code": "UNKNOWN_CARD",
  "message": "Unknown or inactive card"
}
```

## Setup

1. Open [esp32_rfid_attendance_iot.ino](/home/watkay/ReactProjects/AttendanceSystem/esp32-rfid-attendance-iot/esp32_rfid_attendance_iot.ino).
2. Edit [config.h](/home/watkay/ReactProjects/AttendanceSystem/esp32-rfid-attendance-iot/config.h) with WiFi, backend URL, device code, firmware version, and secret.
3. Install Arduino libraries:
   - `MFRC522`
   - `ArduinoJson`
   - `hd44780`
4. Install the `esp32` board package from Espressif.
5. Upload the sketch to the board.

## Demo Backend Values

For the seeded backend:

- `DEVICE_CODE`: `ENTRANCE-01`
- `DEVICE_SECRET`: `entrance-demo-01`
- `FIRMWARE_VERSION`: `1.3.2`

Example backend URL on local network:

```text
http://192.168.1.100:3000/api/iot/attendance
```

Enrollment backend URL:

```text
http://192.168.1.100:3000/api/iot/enrollment-scan
```

## Enrollment Mode

Use the serial monitor to switch the terminal into enrollment mode:

```text
enroll
```

The next scanned card is posted to `/api/iot/enrollment-scan`. To return to normal attendance mode manually:

```text
attendance
```

## Hardware Pin Map

| Component | ESP32 GPIO |
|---|---:|
| RC522 SDA/SS | 5 |
| RC522 RST | 4 |
| RC522 SCK | 18 |
| RC522 MOSI | 23 |
| RC522 MISO | 19 |
| LCD SDA | 21 |
| LCD SCL | 22 |
| LED | 2 |
| Buzzer | 25 |

RC522 must use `3.3V`, not `5V`.
