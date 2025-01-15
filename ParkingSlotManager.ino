#include <Arduino.h>

// Pin Definitions
const int TRIGGER_PIN_1 = 2;  // Ultrasonic sensor 1 trigger pin
const int ECHO_PIN_1 = 3;     // Ultrasonic sensor 1 echo pin
const int TRIGGER_PIN_2 = 4;  // Ultrasonic sensor 2 trigger pin
const int ECHO_PIN_2 = 5;     // Ultrasonic sensor 2 echo pin
const int TRIGGER_PIN_3 = 6;  // Ultrasonic sensor 3 trigger pin
const int ECHO_PIN_3 = 7;     // Ultrasonic sensor 3 echo pin
const int TRIGGER_PIN_4 = 8;  // Ultrasonic sensor 4 trigger pin
const int ECHO_PIN_4 = 9;     // Ultrasonic sensor 4 echo pin

const int LED_PIN_1 = 10;     // LED for parking slot 1
const int LED_PIN_2 = 11;     // LED for parking slot 2
const int LED_PIN_3 = 12;     // LED for parking slot 3
const int LED_PIN_4 = 13;     // LED for parking slot 4

// Constants
const int MAX_DISTANCE = 20;  // Maximum distance to detect a vehicle (in cm)
const int PING_INTERVAL = 100; // Time between sensor readings (ms)

// Parking slot states
bool parkingSlotOccupied[4] = {false, false, false, false};

void setup() {
  // Initialize Serial Communication
  Serial.begin(9600);

  // Configure Ultrasonic Sensor Pins
  pinMode(TRIGGER_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIGGER_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  pinMode(TRIGGER_PIN_3, OUTPUT);
  pinMode(ECHO_PIN_3, INPUT);
  pinMode(TRIGGER_PIN_4, OUTPUT);
  pinMode(ECHO_PIN_4, INPUT);

  // Configure LED Pins
  pinMode(LED_PIN_1, OUTPUT);
  pinMode(LED_PIN_2, OUTPUT);
  pinMode(LED_PIN_3, OUTPUT);
  pinMode(LED_PIN_4, OUTPUT);

  // Initial LED states (all off)
  digitalWrite(LED_PIN_1, LOW);
  digitalWrite(LED_PIN_2, LOW);
  digitalWrite(LED_PIN_3, LOW);
  digitalWrite(LED_PIN_4, LOW);
}

// Function to measure distance using ultrasonic sensor
int measureDistance(int triggerPin, int echoPin) {
  // Clear the trigger pin
  digitalWrite(triggerPin, LOW);
  delayMicroseconds(2);

  // Send a 10 microsecond pulse
  digitalWrite(triggerPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(triggerPin, LOW);

  // Measure the pulse duration and calculate distance
  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2; // Speed of sound is 340 m/s

  return distance;
}

// Function to check parking slot occupancy
void checkParkingSlotOccupancy() {
  // Slot 1
  int distance1 = measureDistance(TRIGGER_PIN_1, ECHO_PIN_1);
  bool isOccupied1 = distance1 < MAX_DISTANCE;
  if (isOccupied1 != parkingSlotOccupied[0]) {
    parkingSlotOccupied[0] = isOccupied1;
    digitalWrite(LED_PIN_1, isOccupied1 ? HIGH : LOW);
    sendParkingSlotStatus(1, isOccupied1);
  }

  // Slot 2
  int distance2 = measureDistance(TRIGGER_PIN_2, ECHO_PIN_2);
  bool isOccupied2 = distance2 < MAX_DISTANCE;
  if (isOccupied2 != parkingSlotOccupied[1]) {
    parkingSlotOccupied[1] = isOccupied2;
    digitalWrite(LED_PIN_2, isOccupied2 ? HIGH : LOW);
    sendParkingSlotStatus(2, isOccupied2);
  }

  // Slot 3
  int distance3 = measureDistance(TRIGGER_PIN_3, ECHO_PIN_3);
  bool isOccupied3 = distance3 < MAX_DISTANCE;
  if (isOccupied3 != parkingSlotOccupied[2]) {
    parkingSlotOccupied[2] = isOccupied3;
    digitalWrite(LED_PIN_3, isOccupied3 ? HIGH : LOW);
    sendParkingSlotStatus(3, isOccupied3);
  }

  // Slot 4
  int distance4 = measureDistance(TRIGGER_PIN_4, ECHO_PIN_4);
  bool isOccupied4 = distance4 < MAX_DISTANCE;
  if (isOccupied4 != parkingSlotOccupied[3]) {
    parkingSlotOccupied[3] = isOccupied4;
    digitalWrite(LED_PIN_4, isOccupied4 ? HIGH : LOW);
    sendParkingSlotStatus(4, isOccupied4);
  }
}

// Function to send parking slot status via Serial
void sendParkingSlotStatus(int slotNumber, bool isOccupied) {
  // Send status in a JSON-like format
  Serial.print("{\"slot\":");
  Serial.print(slotNumber);
  Serial.print(",\"occupied\":");
  Serial.print(isOccupied ? "true" : "false");
  Serial.println("}");
}

void loop() {
  // Check parking slot occupancy
  checkParkingSlotOccupancy();

  // Wait before next reading
  delay(PING_INTERVAL);
}
