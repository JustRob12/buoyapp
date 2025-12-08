#include <HardwareSerial.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Struct for PH time conversion result
struct DateTimePH {
  String date;
  String time;
};

// Wi-Fi credentials
const char* ssid = "GlobeAtHome_8AC73_2.4";
const char* password = "YGgs26xB";

// OLED display (I2C: SDA=21, SCL=22)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// SIM900 on UART2 (RX=16, TX=17)
HardwareSerial SIM900(2); 

const int buzzerPin = 13;
bool simReady = false;
String lastMessage = "";
String senderNumber = "";

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
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  drawText("WiFi connected");
  delay(1000);

  // Initialize SIM900 and check SIM status
  drawText("Initializing SIM900...");
  Serial.println("Initializing SIM900...");
  while (!simReady) {
    drawText("Checking SIM...");
    SIM900.println("AT+CPIN?");
    delay(1000);
    checkSIMStatus();
  }

  // Configure SMS text mode and notifications
  SIM900.println("AT+CMGF=1");
  delay(500);
  delay(500);
  SIM900.println("AT+CNMI=1,2,0,0,0");

  drawText("Ready to receive SMS");
  Serial.println("Ready to receive SMS...");
}

void loop() {
  // Check if SIM900 received data
  if (SIM900.available()) {
    String response = SIM900.readString();
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

      // Buzz to notify new message
      tone(buzzerPin, 2500);
      delay(300);
      noTone(buzzerPin);

      // Display parsed SMS data
      drawSMS();
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

void drawSMS() {
  // Count commas
  int numCommas = 0;
  for (int i = 0; i < lastMessage.length(); i++) {
    if (lastMessage.charAt(i) == ',') numCommas++;
  }

  if (numCommas == 3) {
    // Format: buoy_id,datetime,lat,lon
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);

    String buoy_id = lastMessage.substring(0, i1);
    String dateTime = lastMessage.substring(i1 + 1, i2);
    String lat = lastMessage.substring(i2 + 1, i3);
    String lon = lastMessage.substring(i3 + 1);

    String date = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1); // remove Z
    DateTimePH dtph = convertToPHT(date, timeUTC);

    drawBasicDisplay(buoy_id, dtph.date, dtph.time, lat, lon, "No pH/TDS/Temp");
    sendToAPI(buoy_id, dtph.date, dtph.time, lat, lon, "0", "0", "0");

  } else if (numCommas == 4) {
    // Format: buoy_id,buoy_type,datetime,lat,lon
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);

    String buoy_id = lastMessage.substring(0, i1);
    String buoy_type = lastMessage.substring(i1 + 1, i2);
    String dateTime = lastMessage.substring(i2 + 1, i3);
    String lat = lastMessage.substring(i3 + 1, i4);
    String lon = lastMessage.substring(i4 + 1);

    String date = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1);
    DateTimePH dtph = convertToPHT(date, timeUTC);

    drawBasicDisplay(buoy_id, dtph.date, dtph.time, lat, lon, ("Type: " + buoy_type));
    sendToAPI(buoy_id, dtph.date, dtph.time, lat, lon, "0", "0", "0");

  } else if (numCommas == 6) {
    // Format: buoy_id,datetime,lat,lon,ph,tds,temp
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);
    int i5 = lastMessage.indexOf(',', i4 + 1);
    int i6 = lastMessage.indexOf(',', i5 + 1);

    String buoy_id = lastMessage.substring(0, i1);
    String dateTime = lastMessage.substring(i1 + 1, i2);
    String lat = lastMessage.substring(i2 + 1, i3);
    String lon = lastMessage.substring(i3 + 1, i4);
    String ph = lastMessage.substring(i4 + 1, i5);
    String tds = lastMessage.substring(i5 + 1, i6);
    String temp = lastMessage.substring(i6 + 1);

    String date = dateTime.substring(0, dateTime.indexOf('T'));
    String timeUTC = dateTime.substring(dateTime.indexOf('T') + 1, dateTime.length() - 1);
    DateTimePH dtph = convertToPHT(date, timeUTC);

    drawBasicDisplay(buoy_id, dtph.date, dtph.time, lat, lon, ("pH:" + ph + " TDS:" + tds + " Temp:" + temp));
    sendToAPI(buoy_id, dtph.date, dtph.time, lat, lon, ph, tds, temp);

  } else if (numCommas == 7) {
    // Format: buoy_id,date,time,lat,lon,ph,tds,temp
    int i1 = lastMessage.indexOf(',');
    int i2 = lastMessage.indexOf(',', i1 + 1);
    int i3 = lastMessage.indexOf(',', i2 + 1);
    int i4 = lastMessage.indexOf(',', i3 + 1);
    int i5 = lastMessage.indexOf(',', i4 + 1);
    int i6 = lastMessage.indexOf(',', i5 + 1);
    int i7 = lastMessage.indexOf(',', i6 + 1);

    String buoy_id = lastMessage.substring(0, i1);
    String date = lastMessage.substring(i1 + 1, i2);
    String time = lastMessage.substring(i2 + 1, i3);
    String lat = lastMessage.substring(i3 + 1, i4);
    String lon = lastMessage.substring(i4 + 1, i5);
    String ph = lastMessage.substring(i5 + 1, i6);
    String tds = lastMessage.substring(i6 + 1, i7);
    String temp = lastMessage.substring(i7 + 1);

    drawBasicDisplay(buoy_id, date, time, lat, lon, ("pH:" + ph + " TDS:" + tds + " Temp:" + temp));
    sendToAPI(buoy_id, date, time, lat, lon, ph, tds, temp);

  } else {
    drawText("Invalid SMS format!");
  }
}


DateTimePH convertToPHT(String date, String utcTime) {
  int hour = utcTime.substring(0, 2).toInt();
  int minute = utcTime.substring(3, 5).toInt();
  int second = utcTime.substring(6, 8).toInt();

  hour += 8;
  int y = date.substring(0, 4).toInt();
  int m = date.substring(5, 7).toInt();
  int d = date.substring(8, 10).toInt();

  if (hour >= 24) {
    hour -= 24;
    d += 1;
    // Handle month-end (very basic, won't handle leap years or month-specific lengths accurately)
    if ((m == 1 || m == 3 || m == 5 || m == 7 || m == 8 || m == 10 || m == 12) && d > 31) {
      d = 1;
      m += 1;
    } else if ((m == 4 || m == 6 || m == 9 || m == 11) && d > 30) {
      d = 1;
      m += 1;
    } else if (m == 2 && d > 28) { // Not accounting for leap years
      d = 1;
      m += 1;
    }
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  char newDate[11];
  sprintf(newDate, "%04d-%02d-%02d", y, m, d);
  char formatted[9];
  sprintf(formatted, "%02d:%02d:%02d", hour, minute, second);

  DateTimePH result;
  result.date = String(newDate);
  result.time = String(formatted);
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



void sendToAPI(String buoy, String date, String time, String lat, String lon, String ph, String tds, String temp) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    String url = "https://dorsu.edu.ph/buoy/insert_buoy_data.php";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

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
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi not connected. Cannot send data.");
  }
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

  if (response.indexOf("READY") != -1) {
    simReady = true;
    drawText("SIM Ready!");
    delay(1000);
  }
}
