# GSM Data Loss Handling - Complete Guide

## System Architecture Overview

Your system has the following data flow:
```
ESP32 (with sensors) → GSM Module → Internet → Database → PHP API → Mobile App
```

## Where Data Loss Can Occur

### 1. **GSM Transmission Layer** (Most Critical)
- **Signal loss**: Weak or no cellular signal
- **Network congestion**: High traffic periods
- **Connection drops**: Intermittent connectivity
- **Timeout errors**: Slow response from server
- **Packet corruption**: Data corruption during transmission

### 2. **Server/Database Layer**
- **Database connection failures**
- **Server overload**
- **Network issues between GSM network and server**

### 3. **App Layer** (Already Handled)
- **Network connectivity issues** ✅ (Your app handles this)
- **API request failures** ✅ (Your app has retry mechanism)

---

## Current System: What You Already Have

### ✅ **Mobile App Side** (React Native)

Your app already implements several data loss prevention strategies:

1. **Retry Mechanism** (`buoyService.ts`)
   - 3 automatic retries with exponential backoff
   - Handles transient network failures
   - Location: `app/services/buoyService.ts` lines 28-49

2. **Network Connectivity Checking**
   - Checks internet connection before API calls
   - Prevents unnecessary failed requests
   - Location: `app/services/networkService.ts`

3. **Offline Caching**
   - Stores data locally for offline access
   - 24-hour cache expiration
   - Location: `app/services/offlineService.ts`

4. **Timeout Handling**
   - 10-second timeout on API requests
   - Prevents hanging requests

---

## What's Missing: ESP32 Side Implementation

The **critical gap** is on the ESP32/GSM side. Here's what needs to be implemented:

### 1. **Local Data Storage (ESP32)**

**Problem**: If GSM transmission fails, data is lost forever.

**Solution**: Store data locally on ESP32 before transmission.

```cpp
// Pseudo-code for ESP32 implementation

#include <SPIFFS.h>  // or EEPROM/SD card
#include <ArduinoJson.h>

// Structure to store sensor data
struct SensorData {
  String buoy_id;
  String timestamp;
  float latitude;
  float longitude;
  float pH;
  float temperature;
  float tds;
  bool transmitted;  // Flag to track if sent successfully
  int retry_count;
};

// Save data to local storage before transmission
void saveDataLocally(SensorData data) {
  // Save to SPIFFS (flash memory) or SD card
  // Format: JSON file or binary file
  // Include timestamp and transmission status
}

// Load unsent data from storage
std::vector<SensorData> loadUnsentData() {
  // Read all data where transmitted == false
  // Return list of unsent records
}
```

### 2. **Retry Mechanism (ESP32)**

**Problem**: Single transmission attempt may fail.

**Solution**: Retry failed transmissions with exponential backoff.

```cpp
// Pseudo-code for retry logic

#define MAX_RETRIES 5
#define INITIAL_DELAY 1000  // 1 second
#define MAX_DELAY 60000     // 60 seconds

bool transmitData(SensorData data) {
  int retry_count = 0;
  int delay_ms = INITIAL_DELAY;
  
  while (retry_count < MAX_RETRIES) {
    // Attempt HTTP POST to your server
    HTTPClient http;
    http.begin("https://dorsu.edu.ph/buoy/receive_data.php");
    http.addHeader("Content-Type", "application/json");
    
    // Convert data to JSON
    String jsonData = serializeToJSON(data);
    
    int httpCode = http.POST(jsonData);
    
    if (httpCode == 200 || httpCode == 201) {
      // Success! Mark as transmitted
      data.transmitted = true;
      updateLocalStorage(data);
      http.end();
      return true;
    } else {
      // Failed - increment retry
      retry_count++;
      delay_ms = min(delay_ms * 2, MAX_DELAY);  // Exponential backoff
      delay(delay_ms);
    }
    
    http.end();
  }
  
  // All retries failed - keep in local storage for later
  return false;
}
```

### 3. **Periodic Retry of Failed Transmissions**

**Problem**: Data that failed to transmit stays in local storage forever.

**Solution**: Periodically attempt to resend failed data.

```cpp
void periodicRetryTask() {
  // Run this every 5-10 minutes
  std::vector<SensorData> unsentData = loadUnsentData();
  
  for (auto& data : unsentData) {
    // Check if data is too old (e.g., > 7 days)
    if (isDataTooOld(data.timestamp)) {
      // Delete old data to prevent storage overflow
      deleteData(data);
      continue;
    }
    
    // Attempt retransmission
    if (transmitData(data)) {
      Serial.println("Successfully retransmitted old data");
    }
  }
}
```

### 4. **Data Acknowledgment System**

**Problem**: No confirmation that server received data.

**Solution**: Server sends acknowledgment, ESP32 verifies.

```cpp
bool transmitWithAck(SensorData data) {
  HTTPClient http;
  http.begin("https://dorsu.edu.ph/buoy/receive_data.php");
  http.addHeader("Content-Type", "application/json");
  
  // Include unique message ID
  data.message_id = generateUniqueID();
  String jsonData = serializeToJSON(data);
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode == 200) {
    String response = http.getString();
    
    // Parse response - should contain acknowledgment
    // Example: {"status": "success", "message_id": "abc123"}
    if (response.indexOf(data.message_id) != -1) {
      // Server confirmed receipt
      data.transmitted = true;
      updateLocalStorage(data);
      return true;
    }
  }
  
  return false;
}
```

### 5. **Data Compression**

**Problem**: Large data packets more likely to fail.

**Solution**: Compress data before transmission.

```cpp
String compressData(SensorData data) {
  // Use simple compression or JSON minification
  // Reduces transmission time and failure probability
  return minifyJSON(serializeToJSON(data));
}
```

---

## Server/Database Side Recommendations

### 1. **Idempotency (Prevent Duplicates)**

**Problem**: Retries may send duplicate data.

**Solution**: Use unique message IDs to detect and ignore duplicates.

```php
// PHP example for your server

<?php
// receive_data.php

$data = json_decode(file_get_contents('php://input'), true);
$message_id = $data['message_id'] ?? null;

// Check if this message_id already exists
$stmt = $pdo->prepare("SELECT id FROM buoy_data WHERE message_id = ?");
$stmt->execute([$message_id]);

if ($stmt->fetch()) {
    // Duplicate - return success but don't insert
    echo json_encode(["status" => "success", "message" => "duplicate"]);
    exit;
}

// Insert new data
$stmt = $pdo->prepare("
    INSERT INTO buoy_data (message_id, buoy_id, timestamp, latitude, longitude, pH, temperature, tds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $message_id,
    $data['buoy_id'],
    $data['timestamp'],
    $data['latitude'],
    $data['longitude'],
    $data['pH'],
    $data['temperature'],
    $data['tds']
]);

// Return acknowledgment with message_id
echo json_encode([
    "status" => "success",
    "message_id" => $message_id
]);
?>
```

### 2. **Database Schema Update**

Add fields to track transmission:

```sql
ALTER TABLE buoy_data ADD COLUMN message_id VARCHAR(255) UNIQUE;
ALTER TABLE buoy_data ADD COLUMN received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE buoy_data ADD COLUMN transmission_attempts INT DEFAULT 1;
```

### 3. **Data Validation**

Validate data before storing:

```php
function validateSensorData($data) {
    // Check ranges
    if ($data['pH'] < 0 || $data['pH'] > 14) return false;
    if ($data['temperature'] < -10 || $data['temperature'] > 50) return false;
    if ($data['tds'] < 0 || $data['tds'] > 10000) return false;
    
    // Check required fields
    if (empty($data['buoy_id']) || empty($data['timestamp'])) return false;
    
    return true;
}
```

---

## Complete Data Flow with Error Handling

### **Normal Flow** (Success)
```
1. ESP32 reads sensors → 2. Save to local storage → 3. Transmit via GSM → 
4. Server receives → 5. Database stores → 6. API serves → 7. App displays
```

### **Error Flow** (Transmission Failure)
```
1. ESP32 reads sensors → 2. Save to local storage → 3. Transmit via GSM → 
4. ❌ Transmission fails → 5. Mark as unsent → 6. Retry later → 
7. Success on retry → 8. Mark as sent → 9. Delete from local storage
```

### **Critical Error Flow** (Extended Failure)
```
1. ESP32 reads sensors → 2. Save to local storage → 3. Multiple transmission failures → 
4. Keep in local storage → 5. Periodic retry attempts → 6. Eventually succeeds OR
7. Data expires (too old) → 8. Delete to prevent storage overflow
```

---

## Storage Capacity Planning

### **ESP32 Storage Options**

1. **SPIFFS (Flash Memory)**
   - Typical: 1-4 MB
   - Can store ~1000-4000 records (depending on data size)
   - Example: 100 bytes per record = 10,000 records in 1MB

2. **SD Card** (External)
   - Can store millions of records
   - More reliable for long-term storage
   - Recommended for production systems

3. **EEPROM**
   - Limited capacity (few KB)
   - Only for critical metadata

### **Storage Management Strategy**

```cpp
// Pseudo-code for storage management

#define MAX_STORAGE_RECORDS 1000
#define MAX_DATA_AGE_DAYS 7

void manageStorage() {
    int recordCount = countStoredRecords();
    
    if (recordCount > MAX_STORAGE_RECORDS * 0.9) {
        // Storage nearly full - delete oldest unsent data
        deleteOldestUnsentData(MAX_STORAGE_RECORDS * 0.1);
    }
    
    // Delete data older than 7 days
    deleteExpiredData(MAX_DATA_AGE_DAYS);
}
```

---

## Monitoring and Debugging

### **ESP32 Logging**

```cpp
void logTransmissionStatus(SensorData data, bool success) {
    Serial.print("Data ID: ");
    Serial.print(data.message_id);
    Serial.print(" | Status: ");
    Serial.print(success ? "SUCCESS" : "FAILED");
    Serial.print(" | Retry: ");
    Serial.println(data.retry_count);
    
    // Optional: Send to serial monitor or log file
}
```

### **Server-Side Monitoring**

Track transmission statistics:

```sql
-- View transmission success rate
SELECT 
    DATE(received_at) as date,
    COUNT(*) as total_received,
    COUNT(DISTINCT message_id) as unique_messages,
    COUNT(*) - COUNT(DISTINCT message_id) as duplicates
FROM buoy_data
GROUP BY DATE(received_at);

-- Find missing data (gaps in timestamps)
SELECT 
    buoy_id,
    timestamp,
    LAG(timestamp) OVER (PARTITION BY buoy_id ORDER BY timestamp) as prev_timestamp,
    TIMESTAMPDIFF(MINUTE, LAG(timestamp) OVER (...), timestamp) as gap_minutes
FROM buoy_data
WHERE gap_minutes > 60;  -- Gaps > 1 hour
```

---

## Best Practices Summary

### ✅ **ESP32 Side**
1. **Always save locally first** - Never rely on single transmission
2. **Implement retry with backoff** - 3-5 retries with exponential delay
3. **Use unique message IDs** - Prevent duplicate processing
4. **Periodic retry task** - Resend failed data every 5-10 minutes
5. **Storage management** - Delete old/expired data to prevent overflow
6. **Data compression** - Reduce transmission size and time
7. **Connection quality check** - Verify GSM signal before transmission

### ✅ **Server Side**
1. **Idempotency** - Handle duplicate messages gracefully
2. **Acknowledgment** - Confirm receipt with message_id
3. **Data validation** - Validate before storing
4. **Error logging** - Log all transmission attempts
5. **Monitoring** - Track success rates and gaps

### ✅ **App Side** (Already Implemented)
1. ✅ Retry mechanism
2. ✅ Offline caching
3. ✅ Network checking
4. ✅ Timeout handling

---

## Implementation Priority

### **High Priority** (Critical for Data Integrity)
1. Local storage on ESP32
2. Retry mechanism on ESP32
3. Unique message IDs
4. Server-side idempotency

### **Medium Priority** (Improves Reliability)
5. Periodic retry task
6. Data acknowledgment
7. Storage management
8. Data validation

### **Low Priority** (Nice to Have)
9. Data compression
10. Advanced monitoring
11. Predictive retry scheduling

---

## Example ESP32 Code Structure

```cpp
// main.ino structure

#include <WiFi.h>  // or GSM library
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// Configuration
#define SENSOR_READ_INTERVAL 60000  // 1 minute
#define RETRY_INTERVAL 300000       // 5 minutes
#define MAX_RETRIES 5

void setup() {
    Serial.begin(115200);
    SPIFFS.begin();
    
    // Initialize GSM module
    initGSM();
    
    // Initialize sensors
    initSensors();
    
    // Start periodic tasks
    setupPeriodicTasks();
}

void loop() {
    // Read sensors
    SensorData data = readSensors();
    
    // Save locally first
    saveDataLocally(data);
    
    // Attempt transmission
    if (!transmitData(data)) {
        Serial.println("Initial transmission failed, will retry later");
    }
    
    // Process unsent data
    processUnsentData();
    
    delay(SENSOR_READ_INTERVAL);
}

void processUnsentData() {
    std::vector<SensorData> unsent = loadUnsentData();
    
    for (auto& data : unsent) {
        if (data.retry_count < MAX_RETRIES) {
            if (transmitData(data)) {
                markAsSent(data);
            } else {
                incrementRetryCount(data);
            }
        } else {
            // Max retries reached - log and keep for manual review
            logFailedTransmission(data);
        }
    }
}
```

---

## Testing Strategy

### **Test Scenarios**

1. **Normal Operation**
   - ESP32 sends data successfully
   - Verify data appears in database
   - Verify app can fetch data

2. **GSM Signal Loss**
   - Disable GSM signal
   - Verify data saved locally
   - Re-enable signal
   - Verify data retransmitted

3. **Server Downtime**
   - Stop server
   - ESP32 attempts transmission
   - Verify retry mechanism works
   - Restart server
   - Verify data eventually received

4. **Duplicate Prevention**
   - Send same message_id twice
   - Verify only one record in database

5. **Storage Overflow**
   - Fill storage to capacity
   - Verify old data deleted
   - Verify new data still saved

---

## Conclusion

Your **mobile app already handles data loss** on the client side with retries and offline caching. However, the **critical gap is on the ESP32 side** - if data fails to transmit from the ESP32, it's lost forever.

**Key Takeaway**: Implement local storage and retry mechanisms on the ESP32 to ensure no sensor data is lost, even during GSM transmission failures.

