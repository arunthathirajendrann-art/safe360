export const INCIDENT_STATUSES = [
  "DETECTED",
  "UNDERSTOOD",
  "ASSESSED",
  "ESCALATING",
  "ACKNOWLEDGED",
  "RESPONDER_ASSIGNED",
  "HELP_EN_ROUTE",
  "RESOLVED"
];

export const VALID_TRANSITIONS = {
  DETECTED: ["UNDERSTOOD"],
  UNDERSTOOD: ["ASSESSED"],
  ASSESSED: ["ESCALATING"],
  ESCALATING: ["ACKNOWLEDGED", "RESPONDER_ASSIGNED"],
  ACKNOWLEDGED: ["RESPONDER_ASSIGNED", "RESOLVED"],
  RESPONDER_ASSIGNED: ["HELP_EN_ROUTE", "RESOLVED"],
  HELP_EN_ROUTE: ["RESOLVED"],
  RESOLVED: []
};

export const STATUS_CONFIG = {
  DETECTED: {
    label: "Detected",
    badgeClass: "badge-detected",
    color: "#06B6D4",
    icon: "Radio",
    description: "Emergency condition identified by system sensors/inputs."
  },
  UNDERSTOOD: {
    label: "Understood",
    badgeClass: "badge-understood",
    color: "#3B82F6",
    icon: "Brain",
    description: "System AI has processed context & parsed payload."
  },
  ASSESSED: {
    label: "Assessed",
    badgeClass: "badge-assessed",
    color: "#8B5CF6",
    icon: "ShieldAlert",
    description: "Severity score calculated & priority assigned."
  },
  ESCALATING: {
    label: "Escalating",
    badgeClass: "badge-escalating",
    color: "#F59E0B",
    icon: "TrendingUp",
    description: "Multi-tier escalation active, contacting guardians."
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    badgeClass: "badge-acknowledged",
    color: "#10B981",
    icon: "CheckCircle",
    description: "Authorized guardian has acknowledged the emergency."
  },
  RESPONDER_ASSIGNED: {
    label: "Responder Assigned",
    badgeClass: "badge-assigned",
    color: "#6366F1",
    icon: "UserCheck",
    description: "Responder has accepted dispatch assignment."
  },
  HELP_EN_ROUTE: {
    label: "Help En Route",
    badgeClass: "badge-enroute",
    color: "#EAB308",
    icon: "Navigation",
    description: "Responder actively navigating to subject location."
  },
  RESOLVED: {
    label: "Resolved",
    badgeClass: "badge-resolved",
    color: "#10B981",
    icon: "CheckCircle2",
    description: "Subject safe & incident closed."
  }
};

export const PRIORITY_CONFIG = {
  CRITICAL: {
    label: "Critical",
    badgeClass: "priority-critical",
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)"
  },
  HIGH: {
    label: "High",
    badgeClass: "priority-high",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)"
  },
  MEDIUM: {
    label: "Medium",
    badgeClass: "priority-medium",
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.4)"
  },
  LOW: {
    label: "Low",
    badgeClass: "priority-low",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.4)"
  }
};

export const INCIDENT_TYPES = {
  SOS: {
    label: "Manual Panic SOS",
    icon: "Siren",
    color: "#EF4444",
    defaultPriority: "CRITICAL"
  },
  MANUAL_SOS: {
    label: "Manual Panic SOS",
    icon: "Siren",
    color: "#EF4444",
    defaultPriority: "CRITICAL"
  },
  STEALTH_SOS: {
    label: "Stealth SOS",
    icon: "ShieldAlert",
    color: "#F59E0B",
    defaultPriority: "CRITICAL"
  },
  VOICE_SOS: {
    label: "Voice Emergency",
    icon: "Mic",
    color: "#EC4899",
    defaultPriority: "HIGH"
  },
  FALL_DETECTION: {
    label: "Fall Detected",
    icon: "Activity",
    color: "#EF4444",
    defaultPriority: "HIGH"
  },
  ROUTE_DEVIATION: {
    label: "Route Deviation",
    icon: "Navigation",
    color: "#3B82F6",
    defaultPriority: "MEDIUM"
  },
  MISSED_CHECKIN: {
    label: "Missed Check-in",
    icon: "Clock",
    color: "#10B981",
    defaultPriority: "MEDIUM"
  }
};

export const DEFAULT_API_BASE = "http://localhost:5000/api";
