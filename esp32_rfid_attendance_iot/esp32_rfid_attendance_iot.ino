#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include <time.h>
#include "config.h"

/*
  ESP32 RFID Attendance IoT Terminal
  ----------------------------------
  Contract aligned to:
  POST /api/iot/attendance

  Header:
  - x-device-secret: <per-device secret>

  Request body:
  {
    "uid": "46 14 33 07",
    "deviceCode": "ENTRANCE-01",
    "firmwareVersion": "1.0.0",
    "ipAddress": "192.168.1.41",
    "signalStrength": -55,
    "source": "LIVE",
    "idempotencyKey": "ENTRANCE-01-12345-46143307"
  }
*/

#define RFID_SS_PIN 5
#define RFID_RST_PIN 4
#define LED_PIN 2
#define BUZZER_PIN 25
#define LCD_SDA_PIN 21
#define LCD_SCL_PIN 22

#define CARD_DEBOUNCE_MS 2500
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define API_TIMEOUT_MS 8000
#define OFFLINE_QUEUE_SIZE 20
#define PREFERENCES_NAMESPACE "attendance"

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
hd44780_I2Cexp lcd;
Preferences preferences;

String lastUid = "";
unsigned long lastScanTime = 0;
bool lcdReady = false;
bool enrollmentMode = false;
unsigned long enrollmentModeStartMs = 0;
unsigned long lastSyncAttemptMs = 0;
unsigned long deviceBootEpoch = 0;  // epoch seconds at boot (0 if NTP unavailable)

#define ENROLLMENT_TIMEOUT_MS 30000
#define SYNC_INTERVAL_MS 30000

struct OfflineEvent {
  String uid;
  String idempotencyKey;
  String syncBatchId;
  unsigned long occurredAtEpoch;  // Unix epoch seconds (from NTP or 0 if unavailable)
  String occurredAtIso;           // ISO-8601 string built at scan time
};

OfflineEvent offlineQueue[OFFLINE_QUEUE_SIZE];
int offlineQueueCount = 0;

void syncNtp() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 5000)) {
    deviceBootEpoch = mktime(&timeinfo) - (millis() / 1000);
    Serial.println("NTP sync OK.");
  } else {
    Serial.println("NTP sync failed — timestamps will be approximate.");
  }
}

String nowIso() {
  if (deviceBootEpoch == 0) return "";
  unsigned long epochNow = deviceBootEpoch + (millis() / 1000);
  struct tm *t = gmtime((time_t *)&epochNow);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", t);
  return String(buf);
}

String serializeOfflineEvent(const OfflineEvent &event) {
  return event.uid + "|" + event.idempotencyKey + "|" + event.syncBatchId + "|" + event.occurredAtIso;
}

OfflineEvent deserializeOfflineEvent(const String &value) {
  OfflineEvent event;
  int sep1 = value.indexOf('|');
  int sep2 = value.indexOf('|', sep1 + 1);
  int sep3 = value.indexOf('|', sep2 + 1);

  if (sep1 < 0 || sep2 < 0) {
    event.uid = value;
    return event;
  }

  event.uid = value.substring(0, sep1);
  event.idempotencyKey = value.substring(sep1 + 1, sep2);
  event.syncBatchId = sep3 >= 0 ? value.substring(sep2 + 1, sep3) : value.substring(sep2 + 1);
  event.occurredAtIso = sep3 >= 0 ? value.substring(sep3 + 1) : "";
  return event;
}

void persistOfflineQueue() {
  preferences.putInt("queueCount", offlineQueueCount);
  for (int i = 0; i < OFFLINE_QUEUE_SIZE; i++) {
    String key = "queue" + String(i);
    if (i < offlineQueueCount) {
      preferences.putString(key.c_str(), serializeOfflineEvent(offlineQueue[i]));
    } else {
      preferences.remove(key.c_str());
    }
  }
}

void loadOfflineQueue() {
  offlineQueueCount = preferences.getInt("queueCount", 0);
  if (offlineQueueCount < 0) offlineQueueCount = 0;
  if (offlineQueueCount > OFFLINE_QUEUE_SIZE) offlineQueueCount = OFFLINE_QUEUE_SIZE;
  for (int i = 0; i < offlineQueueCount; i++) {
    String key = "queue" + String(i);
    offlineQueue[i] = deserializeOfflineEvent(preferences.getString(key.c_str(), ""));
  }
}

void showMessage(const String &line1, const String &line2) {
  if (!lcdReady) return;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void beep(int times, int durationMs = 120, int gapMs = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
    delay(gapMs);
  }
}

void blinkLed(int times, int durationMs = 120, int gapMs = 120) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(durationMs);
    digitalWrite(LED_PIN, LOW);
    delay(gapMs);
  }
}

void successFeedback() {
  digitalWrite(LED_PIN, HIGH);
  beep(1, 180);
  delay(250);
  digitalWrite(LED_PIN, LOW);
}

void checkoutFeedback() {
  digitalWrite(LED_PIN, HIGH);
  beep(2, 120);
  delay(250);
  digitalWrite(LED_PIN, LOW);
}

void softFeedback() {
  blinkLed(1, 80, 80);
  beep(1, 70, 70);
}

void errorFeedback() {
  blinkLed(3, 100, 100);
  beep(3, 100, 100);
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  showMessage("Connecting WiFi", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_CONNECT_TIMEOUT_MS) {
    delay(300);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    showMessage("WiFi Connected", WiFi.localIP().toString());
    delay(1000);
    return true;
  }

  Serial.println("WiFi connection failed.");
  showMessage("WiFi Failed", "Offline mode");
  delay(1000);
  return false;
}

String readUidAsString() {
  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uid += " ";
  }

  uid.toUpperCase();
  return uid;
}

bool isDuplicateScan(const String &uid) {
  unsigned long now = millis();
  if (uid == lastUid && (now - lastScanTime) < CARD_DEBOUNCE_MS) {
    return true;
  }

  lastUid = uid;
  lastScanTime = now;
  return false;
}

String compactUid(const String &uid) {
  String value = uid;
  value.replace(" ", "");
  value.toUpperCase();
  return value;
}

String buildIdempotencyKey(const String &uid) {
  return String(DEVICE_CODE) + "-" + String(millis()) + "-" + compactUid(uid);
}

String buildSyncBatchId() {
  return String(DEVICE_CODE) + "-sync-" + String(millis());
}

void queueOfflineEvent(const OfflineEvent &event) {
  if (offlineQueueCount >= OFFLINE_QUEUE_SIZE) {
    Serial.println("Offline queue full. Dropping oldest event.");

    for (int i = 1; i < OFFLINE_QUEUE_SIZE; i++) {
      offlineQueue[i - 1] = offlineQueue[i];
    }

    offlineQueueCount = OFFLINE_QUEUE_SIZE - 1;
  }

  offlineQueue[offlineQueueCount] = event;
  offlineQueueCount++;

  Serial.print("Queued offline event. Queue size: ");
  Serial.println(offlineQueueCount);
  persistOfflineQueue();
}

bool shouldParseHandledResponse(int httpCode) {
  return (httpCode >= 200 && httpCode < 300) || httpCode == 404 || httpCode == 409;
}

bool postAttendanceTap(const OfflineEvent &event, bool isOfflineSync, DynamicJsonDocument &responseDoc, int &httpCode) {
  if (!connectWiFi()) {
    httpCode = 0;
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.setTimeout(API_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", IOT_API_KEY);
  http.addHeader("x-device-secret", DEVICE_SECRET);

  StaticJsonDocument<512> requestDoc;
  requestDoc["uid"] = event.uid;
  requestDoc["deviceCode"] = DEVICE_CODE;
  requestDoc["firmwareVersion"] = FIRMWARE_VERSION;
  requestDoc["ipAddress"] = WiFi.localIP().toString();
  requestDoc["signalStrength"] = WiFi.RSSI();
  requestDoc["source"] = isOfflineSync ? "OFFLINE_SYNC" : "LIVE";
  requestDoc["idempotencyKey"] = event.idempotencyKey;

  // Send exact scan time so the server uses it instead of receipt time
  if (event.occurredAtIso.length() > 0) {
    requestDoc["occurredAt"] = event.occurredAtIso;
  }

  // Send device boot time for telemetry
  if (deviceBootEpoch > 0) {
    unsigned long bootEpoch = deviceBootEpoch;
    struct tm *bt = gmtime((time_t *)&bootEpoch);
    char bootBuf[25];
    strftime(bootBuf, sizeof(bootBuf), "%Y-%m-%dT%H:%M:%SZ", bt);
    requestDoc["bootedAt"] = String(bootBuf);
  }

  if (isOfflineSync && event.syncBatchId.length() > 0) {
    requestDoc["syncBatchId"] = event.syncBatchId;
  }

  String requestBody;
  serializeJson(requestDoc, requestBody);

  Serial.print("POST ");
  Serial.println(API_URL);
  Serial.print("Payload: ");
  Serial.println(requestBody);

  httpCode = http.POST(requestBody);
  String responseBody = http.getString();
  http.end();

  Serial.print("HTTP Code: ");
  Serial.println(httpCode);
  Serial.print("Response: ");
  Serial.println(responseBody);

  if (!shouldParseHandledResponse(httpCode)) {
    return false;
  }

  DeserializationError error = deserializeJson(responseDoc, responseBody);
  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return false;
  }

  return true;
}

void syncOfflineQueue() {
  if (offlineQueueCount == 0) return;
  if (WiFi.status() != WL_CONNECTED && !connectWiFi()) return;

  Serial.print("Attempting offline sync. Queue size: ");
  Serial.println(offlineQueueCount);

  const String syncBatchId = buildSyncBatchId();
  int syncedCount = 0;

  for (int i = 0; i < offlineQueueCount; i++) {
    OfflineEvent event = offlineQueue[i];
    event.syncBatchId = syncBatchId;

    DynamicJsonDocument responseDoc(768);
    int httpCode = 0;
    bool handled = postAttendanceTap(event, true, responseDoc, httpCode);

    if (!handled) {
      break;
    }

    syncedCount++;
  }

  if (syncedCount > 0) {
    for (int i = syncedCount; i < offlineQueueCount; i++) {
      offlineQueue[i - syncedCount] = offlineQueue[i];
    }
    offlineQueueCount -= syncedCount;

    Serial.print("Offline sync complete. Remaining: ");
    Serial.println(offlineQueueCount);
    persistOfflineQueue();
  }
}

bool postEnrollmentScan(const String &uid, DynamicJsonDocument &responseDoc, int &httpCode) {
  if (!connectWiFi()) {
    httpCode = 0;
    return false;
  }

  HTTPClient http;
  http.begin(ENROLLMENT_API_URL);
  http.setTimeout(API_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", IOT_API_KEY);
  http.addHeader("x-device-secret", DEVICE_SECRET);

  StaticJsonDocument<256> requestDoc;
  requestDoc["uid"] = uid;
  requestDoc["deviceCode"] = DEVICE_CODE;
  requestDoc["notes"] = "Captured from ESP32 enrollment mode";

  String requestBody;
  serializeJson(requestDoc, requestBody);

  httpCode = http.POST(requestBody);
  String responseBody = http.getString();
  http.end();

  if (httpCode < 200 || httpCode >= 300) {
    return false;
  }

  return deserializeJson(responseDoc, responseBody) == DeserializationError::Ok;
}

void handleEnrollmentResponse(const String &uid, DynamicJsonDocument &doc) {
  bool ok = doc["ok"] | false;
  if (!ok) {
    showMessage("Enroll Failed", uid);
    errorFeedback();
    return;
  }

  showMessage("Card Captured", uid);
  blinkLed(2, 100, 80);
  beep(2, 90, 80);
}

void checkSerialCommands() {
  if (!Serial.available()) return;

  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toLowerCase();

  if (command == "enroll") {
    enrollmentMode = true;
    enrollmentModeStartMs = millis();
    Serial.println("Enrollment mode enabled for the next card (30s timeout).");
    showMessage("Enrollment Mode", "Scan new card");
    return;
  }

  if (command == "attendance") {
    enrollmentMode = false;
    Serial.println("Attendance mode restored.");
    showMessage("Scan Your Card", "Ready...");
  }
}

void handleBackendResponse(const String &uid, DynamicJsonDocument &doc) {
  bool ok = doc["ok"] | false;
  const char *action = doc["action"] | "";
  const char *message = doc["message"] | "Processed";
  const char *employeeName = doc["employee"]["name"] | "Unknown";
  const char *code = doc["code"] | "";

  if (!ok) {
    String codeText = String(code);
    if (codeText == "UNKNOWN_CARD") {
      showMessage("Unknown Card", uid);
    } else {
      showMessage("Tap Rejected", message);
    }
    errorFeedback();
    return;
  }

  Serial.print("Employee: ");
  Serial.println(employeeName);
  Serial.print("Action: ");
  Serial.println(action);

  String codeText = String(code);
  String actionText = String(action);

  if (codeText == "DUPLICATE_TAP") {
    showMessage(employeeName, "Already logged");
    softFeedback();
    return;
  }

  if (codeText == "ALREADY_CHECKED_IN") {
    showMessage(employeeName, "Already inside");
    softFeedback();
    return;
  }

  if (codeText == "MISSING_CHECK_IN") {
    showMessage(employeeName, "Need check-in");
    errorFeedback();
    return;
  }

  if (actionText == "CHECK_IN") {
    showMessage(String("Welcome ") + employeeName, "Checked In");
    successFeedback();
    return;
  }

  if (actionText == "CHECK_OUT") {
    showMessage(String("Goodbye ") + employeeName, "Checked Out");
    checkoutFeedback();
    return;
  }

  showMessage(employeeName, message);
  softFeedback();
}

void handlePostFailure(const OfflineEvent &event, int httpCode) {
  if (httpCode == 401) {
    showMessage("Unauthorized", "Check secret");
    errorFeedback();
    return;
  }

  if (httpCode == 429) {
    showMessage("Rate Limited", "Wait and retry");
    errorFeedback();
    return;
  }

  if (httpCode >= 400 && httpCode < 500) {
    showMessage("Request Failed", String("HTTP ") + String(httpCode));
    errorFeedback();
    return;
  }

  Serial.println("API unavailable. Event saved in offline queue.");
  queueOfflineEvent(event);
  showMessage("Saved Offline", "Will sync later");
  blinkLed(2, 120, 120);
  beep(2, 120, 120);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);
  int lcdStatus = lcd.begin(16, 2);
  if (lcdStatus) {
    lcdReady = false;
    Serial.print("LCD init failed. Status: ");
    Serial.println(lcdStatus);
  } else {
    lcdReady = true;
    lcd.backlight();
    showMessage("Attendance IoT", "Booting...");
  }

  SPI.begin();
  rfid.PCD_Init();

  Serial.println("--------------------------------");
  Serial.println("ESP32 RFID Attendance IoT Ready");
  Serial.print("Device code: ");
  Serial.println(DEVICE_CODE);
  Serial.print("Firmware: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.println("--------------------------------");

  preferences.begin(PREFERENCES_NAMESPACE, false);
  loadOfflineQueue();

  if (connectWiFi()) {
    syncNtp();
  }

  showMessage("Scan Your Card", "Ready...");
  beep(2, 80, 80);
}

void loop() {
  checkSerialCommands();

  // Throttle offline sync to avoid hammering the server every loop tick
  unsigned long now = millis();
  if (offlineQueueCount > 0 && (now - lastSyncAttemptMs) >= SYNC_INTERVAL_MS) {
    lastSyncAttemptMs = now;
    syncOfflineQueue();
  }

  // Enrollment mode auto-cancel after timeout
  if (enrollmentMode && (now - enrollmentModeStartMs) >= ENROLLMENT_TIMEOUT_MS) {
    enrollmentMode = false;
    Serial.println("Enrollment mode timed out — reverting to attendance mode.");
    showMessage("Enroll Timeout", "Attendance Mode");
    delay(1200);
    showMessage("Scan Your Card", "Ready...");
  }

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = readUidAsString();

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (isDuplicateScan(uid)) {
    Serial.println("Duplicate scan ignored on device.");
    return;
  }

  Serial.println();
  Serial.println("--------------------------------");
  Serial.print("Card scanned: ");
  Serial.println(uid);

  showMessage("Card Scanned", uid);
  beep(1, 80, 80);

  OfflineEvent event;
  event.uid = uid;
  event.idempotencyKey = buildIdempotencyKey(uid);
  event.syncBatchId = "";
  event.occurredAtIso = nowIso();  // capture exact scan timestamp

  if (enrollmentMode) {
    DynamicJsonDocument enrollmentDoc(512);
    int enrollmentHttpCode = 0;
    bool enrolled = postEnrollmentScan(uid, enrollmentDoc, enrollmentHttpCode);
    if (enrolled) {
      handleEnrollmentResponse(uid, enrollmentDoc);
      enrollmentMode = false;
    } else {
      showMessage("Enroll Failed", String("HTTP ") + String(enrollmentHttpCode));
      errorFeedback();
    }
    delay(1800);
    showMessage("Scan Your Card", "Ready...");
    return;
  }

  DynamicJsonDocument responseDoc(768);
  int httpCode = 0;
  bool handled = postAttendanceTap(event, false, responseDoc, httpCode);

  if (handled) {
    handleBackendResponse(uid, responseDoc);
  } else {
    handlePostFailure(event, httpCode);
  }

  delay(1800);
  showMessage("Scan Your Card", "Ready...");
}
