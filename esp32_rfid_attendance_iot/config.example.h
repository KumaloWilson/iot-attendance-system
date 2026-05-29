#ifndef CONFIG_H
#define CONFIG_H

// -------------------- WIFI --------------------
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// -------------------- BACKEND API --------------------
// Example: http://192.168.1.100:3000/api/iot/attendance
// For production: https://your-domain.com/api/iot/attendance
#define API_URL "http://YOUR_BACKEND_IP_OR_DOMAIN/api/iot/attendance"
#define ENROLLMENT_API_URL "http://YOUR_BACKEND_IP_OR_DOMAIN/api/iot/enrollment-scan"

// Per-device secret configured in the backend device record.
#define DEVICE_SECRET "CHANGE_ME_DEVICE_SECRET"

// -------------------- DEVICE INFO --------------------
#define DEVICE_CODE "ENTRANCE-01"
#define FIRMWARE_VERSION "1.0.0"

#endif
