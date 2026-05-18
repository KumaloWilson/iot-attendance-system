/*
  ESP32 RFID -> Next.js API example snippet.
  Merge this POST logic into your working ESP32 RFID firmware.
*/
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* API_URL = "http://YOUR_SERVER_IP:3000/api/iot/attendance";
const char* DEVICE_CODE = "ENTRANCE-01";
const char* DEVICE_SECRET = "entrance-demo-01";
const char* FIRMWARE_VERSION = "1.3.2";

String compactUid(String uid) {
  uid.replace(" ", "");
  uid.toUpperCase();
  return uid;
}

void postAttendance(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
      delay(300);
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi unavailable. Queue locally if needed.");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SECRET);

  StaticJsonDocument<256> body;
  body["uid"] = uid;
  body["deviceCode"] = DEVICE_CODE;
  body["firmwareVersion"] = FIRMWARE_VERSION;
  body["ipAddress"] = WiFi.localIP().toString();
  body["signalStrength"] = WiFi.RSSI();
  body["source"] = "LIVE";
  body["idempotencyKey"] = String(DEVICE_CODE) + "-" + String(millis()) + "-" + compactUid(uid);

  String payload;
  serializeJson(body, payload);

  int status = http.POST(payload);
  String response = http.getString();

  Serial.print("HTTP status: ");
  Serial.println(status);
  Serial.println(response);
  http.end();
}
