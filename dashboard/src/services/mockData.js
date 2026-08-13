export const MOCK_RESPONDERS = [
  {
    id: "RESP-001",
    name: "Demo Responder 1",
    status: "AVAILABLE",
    distanceKm: 1.2,
    role: "Tactical First Responder",
    badge: "Unit Alpha",
    lastActive: "1 min ago"
  },
  {
    id: "RESP-002",
    name: "Demo Responder 2",
    status: "AVAILABLE",
    distanceKm: 2.4,
    role: "Paramedic Lead",
    badge: "Unit Bravo",
    lastActive: "3 mins ago"
  },
  {
    id: "RESP-003",
    name: "Demo Responder 3",
    status: "BUSY",
    distanceKm: 0.8,
    role: "Rapid Emergency Patrol",
    badge: "Unit Delta",
    lastActive: "Active dispatch"
  }
];

export const MOCK_INCIDENTS = [
  {
    _id: "66b1a2f9c40001001e000001",
    type: "SOS",
    userId: "USR-9482",
    status: "ESCALATING",
    priority: "CRITICAL",
    location: {
      latitude: 37.7749,
      longitude: -122.4194
    },
    context: "User pressed panic SOS button 3 times in rapid succession. High heart rate (142 BPM) reported by wearable.",
    detectionEvidence: {
      critical: true,
      heartRateBpm: 142,
      triggerType: "HARDWARE_BUTTON_PANIC",
      batteryPercent: 88,
      cellularSignal: "STRONG_5G"
    },
    currentResponder: "RESP-001",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString()
  },
  {
    _id: "66b1a2f9c40001001e000002",
    type: "FALL",
    userId: "USR-3819",
    status: "RESPONDER_ASSIGNED",
    priority: "HIGH",
    location: {
      latitude: 37.7833,
      longitude: -122.4167
    },
    context: "Hard fall impact detected on accelerometer (4.2G force). Subject unresponsive to prompt for 30s.",
    detectionEvidence: {
      injury: true,
      unresponsive: true,
      impactGForce: 4.2,
      orientationChangeDeg: 84
    },
    currentResponder: "RESP-002",
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60000).toISOString()
  },
  {
    _id: "66b1a2f9c40001001e000003",
    type: "VOICE",
    userId: "USR-7201",
    status: "ASSESSED",
    priority: "MEDIUM",
    location: {
      latitude: 37.7651,
      longitude: -122.4241
    },
    context: "Voice trigger audio parsed distress keyword 'help emergency' with 94% confidence score.",
    detectionEvidence: {
      speechConfidence: 0.94,
      keywordsDetected: ["help", "emergency"],
      ambientDb: 78
    },
    currentResponder: null,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString()
  },
  {
    _id: "66b1a2f9c40001001e000004",
    type: "SOS",
    userId: "USR-1104",
    status: "HELP_EN_ROUTE",
    priority: "CRITICAL",
    location: {
      latitude: 37.7912,
      longitude: -122.4012
    },
    context: "Direct emergency SOS signal sent from mobile application with live GPS tracking stream.",
    detectionEvidence: {
      critical: true,
      appVersion: "v2.4.1",
      locationAccuracyMeters: 3.5
    },
    currentResponder: "RESP-001",
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    _id: "66b1a2f9c40001001e000005",
    type: "FALL",
    userId: "USR-5520",
    status: "RESOLVED",
    priority: "HIGH",
    location: {
      latitude: 37.7599,
      longitude: -122.4148
    },
    context: "Fall detected during outdoor run. Paramedic Unit Bravo dispatched, subject verified conscious & safe.",
    detectionEvidence: {
      injury: false,
      unresponsive: false,
      resolutionNotes: "Dispatched unit confirmed subject okay. Accidental phone drop on pavement."
    },
    currentResponder: "RESP-002",
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    _id: "66b1a2f9c40001001e000006",
    type: "VOICE",
    userId: "USR-8833",
    status: "UNDERSTOOD",
    priority: "MEDIUM",
    location: {
      latitude: 37.7701,
      longitude: -122.4312
    },
    context: "Voice trigger identified word 'assistance needed' in noisy ambient audio.",
    detectionEvidence: {
      speechConfidence: 0.81,
      keywordsDetected: ["assistance"]
    },
    currentResponder: null,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 60000).toISOString()
  }
];
