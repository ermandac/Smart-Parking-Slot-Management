# Smart Parking System - Arduino Sensor Schematic

## Ultrasonic Sensor Connections

```
                    Arduino Uno
                   +-------------------+
                   |                   |
                   |   5V    GND        |
                   |    |     |         |
                   |    |     |         |
    +-------------+----+------+---------+
    |             |           |         |
    |   HC-SR04   |           |         |
    |   Sensor 1  |           |         |
    |             |           |         |
    | VCC   GND   | Trigger   | Echo    |
    |  |     |    |    |      |   |     |
    |  +-----+----+----+------+---+     |
    |             |           |         |
    |  5V    GND  | D2        | D3      |
    |             |           |         |
    +-------------+---+-------+---------+
                      |
    +-------------+---+-------+---------+
    |   HC-SR04   |           |         |
    |   Sensor 2  |           |         |
    |             |           |         |
    | VCC   GND   | Trigger   | Echo    |
    |  |     |    |    |      |   |     |
    |  +-----+----+----+------+---+     |
    |             |           |         |
    |  5V    GND  | D4        | D5      |
    |             |           |         |
    +-------------+---+-------+---------+
                      |
    (Similar connection pattern for Slots 3-6)
    Slots 3: D6/D7
    Slots 4: D8/D9
    Slots 5: D10/D11
    Slots 6: D12/D13

## Sensor Pinout Details
- VCC: Connected to 5V
- GND: Connected to GND
- Trigger Pin: Digital Output Pin
- Echo Pin: Digital Input Pin

## Wiring Guidelines
1. Use short jumper wires
2. Ensure solid connections
3. Avoid signal interference
4. Use pull-up/pull-down resistors if needed
```

## Sensor Connection Notes
- Each HC-SR04 sensor requires 4 connections
- Trigger pin sends ultrasonic pulse
- Echo pin receives reflected pulse
- Distance calculated by pulse travel time

## Power Considerations
- Arduino 5V can power multiple sensors
- Use external power supply for large installations
- Check total current draw

## Recommended Components
- Breadboard for prototyping
- Jumper wires (Male-to-Male)
- Wire strippers
- Multimeter for testing

## Troubleshooting
- Check physical connections
- Verify pin assignments
- Test each sensor individually
- Monitor serial output for anomalies
