#include <Servo.h>
#include <FastLED.h>

// Define servo 
Servo baseServo;
Servo shoulderServo;  
Servo elbowServo;
Servo wristServo;
Servo gripperServo;

// ESP8266 pins
const int LED_DATA_PIN = D3;
const int BASE_PIN = D1;
const int SHOULDER_PIN = D2;
const int ELBOW_PIN = D6;
const int WRIST_PIN = D0;
const int GRIPPER_PIN = D5;

// Servo limits for values
const int BASE_MIN = 0;
const int BASE_MAX = 180;
const int SHOULDER_MIN = 0;
const int SHOULDER_MAX = 180;
const int ELBOW_MIN = 0;
const int ELBOW_MAX = 180;
const int WRIST_MIN = 0;
const int WRIST_MAX = 180;
const int GRIPPER_OPEN = 50;
const int GRIPPER_CLOSE = 120;

void setup() {
  Serial.begin(921600);
  delay(1000);
  
  Serial.println();
  Serial.println(" MECHANICAL ARM CONTROL ");
  Serial.println("Initializing servos");
  
  baseServo.attach(BASE_PIN);
  shoulderServo.attach(SHOULDER_PIN);
  elbowServo.attach(ELBOW_PIN);
  wristServo.attach(WRIST_PIN);
  gripperServo.attach(GRIPPER_PIN);
  
  resetArm();
  delay(2000);
  
  Serial.println();
  Serial.println("=== SYSTEM READY ===");
  Serial.println("AUTONOMOUS: 1=Cube, 2=Cylinder, 3=Hat, 4=Boat, 5=All");
  Serial.println("MANUAL: B[angle], S[angle], E[angle], W[angle], G[angle]");
  Serial.println("ACTIONS: O=Open, C=Close, R=Reset, T=Test");
  Serial.println();
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() > 0) {
      processCommand(command);
    }
  }
}

void processCommand(String command) {
  char cmd = command.charAt(0);
  
  switch(cmd) {
    case 'w':
      Serial.println(">>> Starting withering sequence");
      wither();
      Serial.println(">>> withering sequence COMPLETED");
      break;

    case 'l':
      Serial.println(">>> Starting light");
      LEDTEST();
      delay(100000);
      Serial.println(">>> light COMPLETED");
      break;
      
      
    case 'B':
      setServoAngle(baseServo, command.substring(1).toInt(), BASE_MIN, BASE_MAX, "Base");
      break;
      
    case 'S':
      setServoAngle(shoulderServo, command.substring(1).toInt(), SHOULDER_MIN, SHOULDER_MAX, "Shoulder");
      break;
      
    case 'E':
      setServoAngle(elbowServo, command.substring(1).toInt(), ELBOW_MIN, ELBOW_MAX, "Elbow");
      break;
      
    case 'W':
      setServoAngle(wristServo, command.substring(1).toInt(), WRIST_MIN, WRIST_MAX, "Wrist");
      break;
      
    case 'G':
      setServoAngle(gripperServo, command.substring(1).toInt(), GRIPPER_OPEN, GRIPPER_CLOSE, "Gripper");
      break;
      
    case 'O':
      openGripper();
      break;
      
    case 'C':
      closeGripper();
      break;
      
    case 'R':
      resetArm();
      break;
      
    case 'T':
      testSequence();
      break;
      
    default:
      Serial.println("Unknown command. Send 1-5 for sequences");
      break;
  }
}

void setServoAngle(Servo &servo, int angle, int minAngle, int maxAngle, String name) {
  angle = constrain(angle, minAngle, maxAngle);
  servo.write(angle);
  Serial.println(name + " set to: " + String(angle));
  delay(500);
}

// sequences


// void moveToPosition(int base, int shoulder, int elbow, int wrist, int gripper)

    // GPIO4 (middle pin)
#define NUM_LEDS 30
#define LED_TYPE WS2812B
#define COLOR_ORDER GRB
CRGB leds[NUM_LEDS];

void LEDTEST() {
  FastLED.addLeds<LED_TYPE, LED_DATA_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(100);  // Low brightness for testing
  
  // Simple test: turn all LEDs red
  fill_solid(leds, NUM_LEDS, CRGB::Red);
  FastLED.show();
}



void wither() {
  // Light turns on

  LEDTEST();

  // Initial pose
  moveToPosition(0, 80, 100, 80, 50);
  delay(200);
  
  // Phase 1: Subtle initial movement (increments of 1)
  for(int i = 0; i <= 10; i++) {
    moveToPosition(0, 80 + i, 100 - i, 80 + i, 50);
    delay(20);
  }
  
  // Phase 2: Main withering motion with easing
  // Starting to collapse
  for(int i = 0; i <= 20; i++) {
    moveToPosition(0, 90 + i, 90 - i, 90 + i, 50);
    
    // Easing effect - slower at start, faster in middle
    if(i < 5) delay(30);
    else if(i < 15) delay(15);
    else delay(25);
  }
  
  // Phase 3: Accelerating collapse
  for(int i = 0; i <= 30; i++) {
    moveToPosition(0, 110 + i, 70 - i, 110 + i, 50);
    
    // Dynamic delay - creates natural acceleration
    delay(20 - (i/3));
  }
  
  // Phase 4: Final collapse with micro-movements for organic feel
  for(int i = 0; i <= 20; i++) {
    moveToPosition(0, 140 + i, 40 - i, 150 + i, 50);
    
    if(i % 3 == 0) {
      // Add tiny hesitation for natural robot movement
      delay(40);
    } else {
      delay(15);
    }
  }
  
  // Phase 5: Settling with subtle oscillations
  for(int j = 0; j < 3; j++) {
    for(int i = 0; i < 5; i++) {
      moveToPosition(0, 160 + i, 20 - i, 170 + i, 50);
      delay(15);
    }
    for(int i = 0; i < 5; i++) {
      moveToPosition(0, 165 - i, 15 + i, 175 - i, 50);
      delay(15);
    }
  }
  
  // Final rest position
  for(int i = 0; i <= 5; i++) {
    moveToPosition(0, 160 + i/2, 20 - i/2, 170 + i/2, 50);
    delay(30);
  }
  
  moveToPosition(0, 160, 20, 170, 50);
  delay(100);
}



// automated functions

void moveToPosition(int base, int shoulder, int elbow, int wrist, int gripper) {
  base = constrain(base, BASE_MIN, BASE_MAX);
  shoulder = constrain(shoulder, SHOULDER_MIN, SHOULDER_MAX);
  elbow = constrain(elbow, ELBOW_MIN, ELBOW_MAX);
  wrist = constrain(wrist, WRIST_MIN, WRIST_MAX);
  gripper = constrain(gripper, GRIPPER_OPEN, GRIPPER_CLOSE);
  
  baseServo.write(base);
  delay(300);
  shoulderServo.write(shoulder);
  delay(300);
  elbowServo.write(elbow);
  delay(300);
  wristServo.write(wrist);
  delay(300);
  gripperServo.write(gripper);
  delay(300);
}

void openGripper() {
  Serial.println("Opening gripper");
  gripperServo.write(GRIPPER_OPEN);
  delay(500);
}

void closeGripper() {
  Serial.println("Closing gripper");
  gripperServo.write(GRIPPER_CLOSE);
  delay(500);
}

void resetArm() {
  Serial.println("Resetting to home position");
  moveToPosition(90, 90, 90, 90, GRIPPER_OPEN);
  delay(1000);
}

void testSequence() {
  Serial.println(" TESTING SERVO MOVEMENT ");
  
 
  Serial.println("Testing base servo");
  baseServo.write(60);
  delay(1000);
  baseServo.write(120);
  delay(1000);
  baseServo.write(90);
  delay(1000);
  
  
  Serial.println("Testing shoulder servo");
  shoulderServo.write(120);  
  delay(1000);
  shoulderServo.write(60);  
  delay(1000);
  shoulderServo.write(90);   
  delay(1000);
  
  
  Serial.println("Testing elbow servo");
  elbowServo.write(60);     
  delay(1000);
  elbowServo.write(120);    
  delay(1000);
  elbowServo.write(90);    
  delay(1000);
  
 
  Serial.println("Testing gripper");
  openGripper();
  delay(1000);
  closeGripper();
  delay(1000);
  openGripper();
  delay(1000);
  
  resetArm();
  Serial.println(" TEST COMPLETE ");
}