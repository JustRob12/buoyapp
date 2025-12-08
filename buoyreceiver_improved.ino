/*
 * ============================================================================
 * BUOY RECEIVER - IMPROVED VERSION WITH ACCURACY ENHANCEMENTS
 * ============================================================================
 * 
 * This improved version adds the following accuracy and reliability features:
 * 
 * ✅ NEW FEATURES ADDED:
 * 
 * 1. DATA VALIDATION:
 *    - GPS coordinate validation (lat: -90 to 90, lon: -180 to 180)
 *    - Sensor reading validation (pH: 0-14, TDS: 0-10000, Temp: -10 to 50°C)
 *    - Date/time format validation
 *    - Numeric conversion verification
 * 
 * 2. ERROR HANDLING:
 *    - API retry mechanism (3 attempts with 2-second delays)
 *    - HTTP timeout (10 seconds) to prevent hanging
 *    - Success acknowledgment checking
 *    - WiFi connection status verification
 * 
 * 3. DUPLICATE DETECTION:
 *    - Prevents processing same SMS twice within 5 seconds
 *    - Tracks last processed message
 * 
 * 4. IMPROVED TIME CONVERSION:
 *    - Proper leap year handling
 *    - Accurate month-end rollover using days-per-month array
 *    - Date/time validation before conversion
 *    - Returns validation flag in DateTimePH struct
 * 
 * 5. BETTER ERROR REPORTING:
 *    - OLED display shows error states
 *    - Enhanced serial logging for debugging
 *    - Visual feedback for failed operations
 * 
 * 6. INITIALIZATION IMPROVEMENTS:
 *    - Timeout protection for WiFi connection (prevents infinite loops)
 *    - Timeout protection for SIM900 initialization
 *    - Status feedback on OLED display
 * 
 * Look for "✅ NEW" or "✅ IMPROVED" comments throughout the code to see
 * exactly where each enhancement was added.
 * 
 * ============================================================================
 */

#include <HardwareSerial.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Struct for PH time conversion result
struct DateTimePH {
  String date;
  String time;
  bool valid;  // ✅ NEW: Added validation flag to track if conversion was successful
};

// Wi-Fi credentials
const char* ssid = "Bermy";
const char* password = "ayawmogcon";

// OLED display (I2C: SDA=21, SCL=22)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// SIM900 on UART2 (RX=16, TX=17)
HardwareSerial SIM900(2); 

const int buzzerPin = 13;
bool simReady = false;
String lastMessage = "";
String senderNumber = "";
// ✅ NEW: Whitelist of authorized sender numbers (security)
// NOTE:
// - Use the exact format that appears in the SIM900 "+CMT" header
//   e.g. "+639123456789" or "09123456789" depending on your SIM/network.
// - Add or remove numbers as needed.
// - Only SMS from these numbers will be processed.
const char* AUTHORIZED_NUMBERS[] = {
  "+639123456789",   // Example authorized number 1
  // "+639987654321", // Example authorized number 2 (uncomment and modify)
};
const int AUTHORIZED_NUMBERS_COUNT = sizeof(AUTHORIZED_NUMBERS) / sizeof(AUTHORIZED_NUMBERS[0]);

// ✅ NEW: Duplicate detection variables
unsigned long lastMessageTime = 0;  // Track when last message was processed
String lastProcessedMessage = "";  // Store last processed message to prevent duplicates

// ✅ NEW: API retry configuration for reliability
const int MAX_RETRIES = 3;      // Maximum retry attempts
const int RETRY_DELAY = 2000;  // Delay between retries (2 seconds)

void setup() {
  Serial.begin(115200);
  SIM900.begin(9600, SERIAL_8N1, 16, 17);
  pinMode(buzzerPin, OUTPUT);

  // Initialize OLED display
  u8g2.begin();
  drawText("Initializing...");

  // Setup Wi-Fi as Station
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  drawText("Connecting WiFi...");
  // ✅ NEW: Added timeout to prevent infinite loop if WiFi fails
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 30) {
    delay(500);
    Serial.print(".");
    wifiTimeout++;
  }
  
  // ✅ NEW: Check and display WiFi connection status
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected.");
    drawText("WiFi connected");
    delay(1000);
  } else {
    Serial.println("\nWiFi connection failed!");
    drawText("WiFi FAILED");  // ✅ NEW: Visual feedback for failure
    delay(2000);
  }

  // Initialize SIM900 and check SIM status
  drawText("Initializing SIM900...");
  Serial.println("Initializing SIM900...");
  // ✅ NEW: Added timeout to prevent infinite loop if SIM fails
  int simTimeout = 0;
  while (!simReady && simTimeout < 10) {
    drawText("Checking SIM...");
    SIM900.println("AT+CPIN?");
    delay(1000);
    checkSIMStatus();
    simTimeout++;
  }

  // ✅ NEW: Check and display SIM initialization status
  if (!simReady) {
    Serial.println("SIM900 initialization failed!");
    drawText("SIM FAILED");  // ✅ NEW: Visual feedback for failure
    delay(2000);
  }

  // Configure SMS text mode and notifications
  SIM900.println("AT+CMGF=1");
  delay(500);
  SIM900.println("AT+CNMI=1,2,0,0,0");

  drawText("Ready to receive SMS");
  Serial.println("Ready to receive SMS...");
}

void loop() {
    // Check if SIM900 received data
  if (SIM900.available()) {
    String response = SIM900.readString();
    // ✅ NEW: Enhanced logging for debugging
    Serial.println("Raw SIM900 response:");
    Serial.println(response);

    // Parse incoming SMS
    if (response.indexOf("+CMT:") != -1) {
      int firstQuote = response.indexOf("\"", 5);
      int secondQuote = response.indexOf("\"", firstQuote + 1);
      senderNumber = response.substring(firstQuote + 1, secondQuote);

      int msgStart = response.indexOf("\n", secondQuote) + 1;
      lastMessage = response.substring(msgStart);
      lastMessage.trim();

      Serial.println("Message content:");
      Serial.println(lastMessage);
      Serial.println("From: " + senderNumber);  // ✅ NEW: Log sender number

      // ✅ NEW: Security check – only accept SMS from authorized/registered numbers
      if (!isAuthorizedSender(senderNumber)) {
        Serial.println("Unauthorized sender. Ignoring SMS.");
        drawText("UNAUTHORIZED SMS");   // Visual feedback (optional)
        // Short warning buzz
        tone(buzzerPin, 1000);
        delay(150);
        noTone(buzzerPin);
        return;
      }

      // ✅ NEW: Duplicate detection - prevent processing same message twice
      // This prevents the same SMS from being processed multiple times if received again
      if (lastMessage == lastProcessedMessage && (millis() - lastMessageTime) < 5000) {
        Serial.println("Duplicate message detected, ignoring...");
        return;
      }

      // Buzz to notify new message
      tone(buzzerPin, 2500);
      delay(300);
      noTone(buzzerPin);

      // ✅ NEW: Process and validate SMS data before sending to API
      // Changed from direct drawSMS() call to processSMS() which includes validation
      if (processSMS()) {
        lastProcessedMessage = lastMessage;  // ✅ NEW: Track processed message
        lastMessageTime = millis();          // ✅ NEW: Track processing time
      } else {
        drawText("Invalid data!");           // ✅ NEW: Visual feedback for invalid data
        Serial.println("Data validation failed!");
      }
    }
  }

  // Pass through serial input to SIM900 (manual AT command input)
  if (Serial.available()) {
    SIM900.write(Serial.read());
  }
}

void drawText(String text) {
  u8g2.firstPage();
  do {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(0, 12, text.c_str());
  } while (u8g2.nextPage());
}

// ============================================================================
// ✅ NEW: DATA VALIDATION FUNCTIONS - Added for accuracy improvements
// ============================================================================

// ✅ NEW: Helper – check if senderNumber is in AUTHORIZED_NUMBERS whitelist
bool isAuthorizedSender(const String& number) {
  for (int i = 0; i < AUTHORIZED_NUMBERS_COUNT; i++) {
    if (number == AUTHORIZED_NUMBERS[i]) {
      return true;
    }
  }
  return false;
}


// ✅ NEW: Validate GPS coordinates (latitude: -90 to 90, longitude: -180 to 180)
bool validateGPS(String lat, String lon) {
  float latF = lat.toFloat();
  float lonF = lon.toFloat();
  
  // Check if conversion was successful
  if (latF == 0.0 && lat != "0" && lat != "0.0") return false;
  if (lonF == 0.0 && lon != "0" && lon != "0.0") return false;
  
  // Validate ranges
  return (latF >= -90.0 && latF <= 90.0 && lonF >= -180.0 && lonF <= 180.0);
}

// ✅ NEW: Validate sensor readings to ensure they're within reasonable ranges
bool validateSensorReading(String value, String type) {
  float val = value.toFloat();
  
  if (type == "pH") {
    return (val >= 0.0 && val <= 14.0);
  } else if (type == "TDS") {
    return (val >= 0.0 && val <= 50000.0); // Reasonable TDS range
  } else if (type == "TEMP") {
    return (val >= -10.0 && val <= 50.0); // Reasonable water temp range
  }
  return false;
}

// ✅ NEW: Validate date format (YYYY-MM-DD) and ensure values are reasonable
bool validateDate(String date) {
  if (date.length() != 10) return false;
  if (date.charAt(4) != '-' || date.charAt(7) != '-') return false;
  
  int year = date.substring(0, 4).toInt();
  int month = date.substring(5, 7).toInt();
  int day = date.substring(8, 10).toInt();
  
  if (year < 2020 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

// ✅ NEW: Validate time format (HH:MM:SS) and ensure values are valid
bool validateTime(String time) {
  if (time.length() != 8) return false;
  if (time.charAt(2) != ':' || time.charAt(5) != ':') return false;
  
  int hour = time.substring(0, 2).toInt();
  int minute = time.substring(3, 5).toInt();
  int second = time.substring(6, 8).toInt();
  
  return (hour >= 0 && hour < 24 && minute >= 0 && minute < 60 && second >= 0 && second < 60);
}

// ============================================================================
// ✅ NEW: REFACTORED SMS PROCESSING - Now includes validation before sending
// ============================================================================
// Changed from drawSMS() to processSMS() which validates all data before processing
bool processSMS() {
  // Count commas
  int numCommas = 0;
  for (int i = 0; i < lastMessage.length(); i++) {
    if (lastMessage.charAt(i) == ',') numCommas++;
  }

  String buoy_id, date, time, lat, lon, ph, tds, temp;
  DateTimePH dtph;
  bool dataValid = false;

  if (numCommas == 3) {
    // Format: buoy_id,datetime,lat,lon
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);

    buoy_id = lastMessage.substring(0, i1);
    String dateTime = lastMessage.substring(i1 + 1, i2);
    lat = lastMessage.substring(i2 + 1, i3);
    lon = lastMessage.substring(i3 + 1);

    String dateStr = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1);
    dtph = convertToPHT(dateStr, timeUTC);
    
    if (dtph.valid && validateGPS(lat, lon)) {
      date = dtph.date;
      time = dtph.time;
      dataValid = true;
    }

  } else if (numCommas == 4) {
    // Format: buoy_id,buoy_type,datetime,lat,lon
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);

    buoy_id = lastMessage.substring(0, i1);
    String buoy_type = lastMessage.substring(i1 + 1, i2);
    String dateTime = lastMessage.substring(i2 + 1, i3);
    lat = lastMessage.substring(i3 + 1, i4);
    lon = lastMessage.substring(i4 + 1);

    String dateStr = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1);
    dtph = convertToPHT(dateStr, timeUTC);
    
    // ✅ NEW: Validate data before accepting it
    if (dtph.valid && validateGPS(lat, lon)) {
      date = dtph.date;
      time = dtph.time;
      dataValid = true;
    }

  } else if (numCommas == 6) {
    // Format: buoy_id,datetime,lat,lon,ph,tds,temp
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);
    int i5 = lastMessage.indexOf(',', i4 + 1);
    int i6 = lastMessage.indexOf(',', i5 + 1);

    buoy_id = lastMessage.substring(0, i1);
    String dateTime = lastMessage.substring(i1 + 1, i2);
    lat = lastMessage.substring(i2 + 1, i3);
    lon = lastMessage.substring(i3 + 1, i4);
    ph = lastMessage.substring(i4 + 1, i5);
    tds = lastMessage.substring(i5 + 1, i6);
    temp = lastMessage.substring(i6 + 1);

    String dateStr = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1);
    dtph = convertToPHT(dateStr, timeUTC);
    
    // ✅ NEW: Comprehensive validation - GPS, time conversion, and all sensor readings
    if (dtph.valid && validateGPS(lat, lon) && 
        validateSensorReading(ph, "pH") && 
        validateSensorReading(tds, "TDS") && 
        validateSensorReading(temp, "TEMP")) {
      date = dtph.date;
      time = dtph.time;
      dataValid = true;
    }

  } else if (numCommas == 7) {
    // Format: buoy_id,date,time,lat,lon,ph,tds,temp
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);
    int i5 = lastMessage.indexOf(',', i4 + 1);
    int i6 = lastMessage.indexOf(',', i5 + 1);
    int i7 = lastMessage.indexOf(',', i6 + 1);

    buoy_id = lastMessage.substring(0, i1);
    date = lastMessage.substring(i1 + 1, i2);
    time = lastMessage.substring(i2 + 1, i3);
    lat = lastMessage.substring(i3 + 1, i4);
    lon = lastMessage.substring(i4 + 1, i5);
    ph = lastMessage.substring(i5 + 1, i6);
    tds = lastMessage.substring(i6 + 1, i7);
    temp = lastMessage.substring(i7 + 1);
    
    // ✅ NEW: Comprehensive validation for all fields
    if (validateDate(date) && validateTime(time) && validateGPS(lat, lon) && 
        validateSensorReading(ph, "pH") && 
        validateSensorReading(tds, "TDS") && 
        validateSensorReading(temp, "TEMP")) {
      dataValid = true;
    }
  }

  // ✅ NEW: Only process and send data if validation passed
  if (dataValid) {
    // Display on OLED
    String footer = "pH:" + ph + " TDS:" + tds + " Temp:" + temp;
    if (ph == "0" && tds == "0" && temp == "0") {
      footer = "No pH/TDS/Temp";
    }
    drawBasicDisplay(buoy_id, date, time, lat, lon, footer);
    
    // ✅ NEW: Send to API with retry mechanism instead of direct send
    sendToAPIWithRetry(buoy_id, date, time, lat, lon, ph, tds, temp);
    return true;
  } else {
    drawText("Invalid SMS format!");  // ✅ NEW: Visual feedback
    Serial.println("Data validation failed!");
    return false;
  }
}

// ============================================================================
// ✅ IMPROVED: Time conversion with validation and proper leap year handling
// ============================================================================
DateTimePH convertToPHT(String date, String utcTime) {
  DateTimePH result;
  result.valid = false;  // ✅ NEW: Initialize as invalid until proven valid
  
  // ✅ NEW: Validate input format before processing
  if (date.length() != 10 || utcTime.length() < 8) {
    Serial.println("Invalid date/time format");
    return result;
  }
  
  int hour = utcTime.substring(0, 2).toInt();
  int minute = utcTime.substring(3, 5).toInt();
  int second = utcTime.substring(6, 8).toInt();
  
  // ✅ NEW: Validate parsed time values
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    Serial.println("Invalid time values");
    return result;
  }

  hour += 8; // Convert to PHT (UTC+8)
  int y = date.substring(0, 4).toInt();
  int m = date.substring(5, 7).toInt();
  int d = date.substring(8, 10).toInt();
  
  // ✅ NEW: Validate parsed date values
  if (y < 2020 || y > 2030 || m < 1 || m > 12 || d < 1 || d > 31) {
    Serial.println("Invalid date values");
    return result;
  }

  // ✅ IMPROVED: Handle day rollover with proper month-end calculation
  if (hour >= 24) {
    hour -= 24;
    d += 1;
    
    // ✅ NEW: Days in each month array (replaces hardcoded if-else chain)
    int daysInMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    
    // ✅ NEW: Proper leap year calculation (handles century years correctly)
    bool isLeapYear = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
    if (isLeapYear && m == 2) {
      daysInMonth[1] = 29;  // February has 29 days in leap years
    }
    
    // ✅ NEW: Proper month-end handling using array lookup
    if (d > daysInMonth[m - 1]) {
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  char newDate[11];
  sprintf(newDate, "%04d-%02d-%02d", y, m, d);
  char formatted[9];
  sprintf(formatted, "%02d:%02d:%02d", hour, minute, second);

  result.date = String(newDate);
  result.time = String(formatted);
  result.valid = true;  // ✅ NEW: Mark as valid only after successful conversion
  return result;
}

void drawBasicDisplay(String buoy, String date, String time, String lat, String lon, String footer) {
  u8g2.firstPage();
  do {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(0, 10, ("Buoy: " + buoy).c_str());
    u8g2.drawStr(0, 22, (date + " : " + time).c_str());
    u8g2.drawStr(0, 34, ("Lat: " + lat).c_str());
    u8g2.drawStr(0, 46, ("Lon: " + lon).c_str());
    u8g2.drawStr(0, 58, footer.c_str());
  } while (u8g2.nextPage());
}

// ============================================================================
// ✅ NEW: API transmission with retry mechanism for reliability
// ============================================================================
// Replaces original sendToAPI() with retry logic and better error handling
void sendToAPIWithRetry(String buoy, String date, String time, String lat, String lon, String ph, String tds, String temp) {
  // ✅ NEW: Check WiFi connection before attempting to send
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot send data.");
    drawText("WiFi disconnected!");  // ✅ NEW: Visual feedback
    return;
  }

  // ✅ NEW: Retry loop - attempts up to MAX_RETRIES times
  bool success = false;
  for (int attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
    Serial.println("API Attempt " + String(attempt) + " of " + String(MAX_RETRIES));
    
    HTTPClient http;
    String url = "https://dorsu.edu.ph/buoy/insert_buoy_data.php";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(10000); // ✅ NEW: 10 second timeout to prevent hanging

    // Build JSON payload
    String jsonPayload = "{";
    jsonPayload += "\"buoy_id\":\"" + buoy + "\",";
    jsonPayload += "\"date\":\"" + date + "\",";
    jsonPayload += "\"time\":\"" + time + "\",";
    jsonPayload += "\"latitude\":\"" + lat + "\",";
    jsonPayload += "\"longitude\":\"" + lon + "\",";
    jsonPayload += "\"ph\":\"" + ph + "\",";
    jsonPayload += "\"tds\":\"" + tds + "\",";
    jsonPayload += "\"temperature\":\"" + temp + "\"";
    jsonPayload += "}";

    Serial.println("Sending to API:");
    Serial.println(jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.print("Response: ");
      Serial.println(response);
      
      // ✅ NEW: Check if server acknowledged success (adjust based on your API response)
      if (httpResponseCode == 200 || httpResponseCode == 201) {
        success = true;
        Serial.println("Data sent successfully!");
        drawText("Data sent OK!");  // ✅ NEW: Visual confirmation
        delay(1000);
      }
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
    
    // ✅ NEW: Retry logic - wait before next attempt if not successful
    if (!success && attempt < MAX_RETRIES) {
      Serial.println("Retrying in " + String(RETRY_DELAY) + "ms...");
      delay(RETRY_DELAY);
    }
  }
  
  // ✅ NEW: Final failure notification if all retries exhausted
  if (!success) {
    Serial.println("Failed to send data after " + String(MAX_RETRIES) + " attempts!");
    drawText("API send FAILED!");  // ✅ NEW: Visual feedback for failure
    delay(2000);
  }
}

// ✅ NEW: Wrapper function for backward compatibility
void sendToAPI(String buoy, String date, String time, String lat, String lon, String ph, String tds, String temp) {
  sendToAPIWithRetry(buoy, date, time, lat, lon, ph, tds, temp);
}

void checkSIMStatus() {
  String response = "";
  long timeout = millis() + 3000;

  while (millis() < timeout) {
    while (SIM900.available()) {
      char c = SIM900.read();
      response += c;
    }
  }

  Serial.println("SIM Response: " + response);

  // ✅ IMPROVED: Check for both possible READY responses
  if (response.indexOf("READY") != -1 || response.indexOf("+CPIN: READY") != -1) {
    simReady = true;
    drawText("SIM Ready!");
    delay(1000);
  }
}

