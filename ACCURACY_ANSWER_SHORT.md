# How We Ensure Accuracy of Real-Time Data Processing (Short Answer)

## Quick Summary

We ensure accuracy through **5 key mechanisms**:

1. **Data Validation** - All GPS coordinates, sensor readings, and date/time are validated before processing
2. **Retry Mechanism** - API transmissions retry up to 3 times with error handling
3. **Duplicate Detection** - Prevents processing the same SMS twice within 5 seconds
4. **Accurate Time Conversion** - Proper UTC to PHT conversion with leap year support
5. **Error Handling** - Invalid data is rejected, with visual feedback on OLED display

---

## Detailed Answer

### 1. Data Validation Layer
- **GPS Coordinates**: Validated to ensure latitude (-90° to 90°) and longitude (-180° to 180°)
- **Sensor Readings**: 
  - pH: 0.0 to 14.0
  - TDS: 0 to 10,000 ppm
  - Temperature: -10°C to 50°C
- **Date/Time**: Format and range validation (YYYY-MM-DD, HH:MM:SS)

### 2. Retry Mechanism
- Attempts API transmission up to **3 times** if it fails
- 2-second delay between retries
- 10-second timeout to prevent hanging
- Verifies HTTP response codes (200/201) for success

### 3. Duplicate Detection
- Tracks last processed message
- Prevents processing same SMS within 5 seconds
- Eliminates duplicate entries from GSM retransmissions

### 4. Time Conversion Accuracy
- Proper UTC to Philippine Time (UTC+8) conversion
- Handles day/month rollovers correctly
- **Leap year support** for accurate date calculations
- Returns validation flag to confirm successful conversion

### 5. Error Handling
- Invalid data is **rejected** before processing
- OLED display shows real-time status and errors
- Serial logging for debugging
- Timeout protection prevents infinite loops

---

## Result

**100% of data is validated** before processing, ensuring only accurate, verified data reaches the server. The retry mechanism handles network issues, and duplicate detection prevents data corruption from GSM module retransmissions.


