export const INCIDENT_STATUSES = [
  "DETECTED",
  "UNDERSTOOD",
  "ASSESSED",
  "ESCALATING",
  "RESPONDER_ASSIGNED",
  "HELP_EN_ROUTE",
  "RESOLVED"
];

export const VALID_TRANSITIONS = {
  DETECTED: ["UNDERSTOOD"],
  UNDERSTOOD: ["ASSESSED"],
  ASSESSED: ["ESCALATING"],
  ESCALATING: ["RESPONDER_ASSIGNED"],
  RESPONDER_ASSIGNED: ["HELP_EN_ROUTE"],
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
    description: "Dispatch protocol active, searching for nearest responder."
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
    description: "Subject safe & incident closed by response team."
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
    label: "Panic SOS",
    icon: "Siren",
    color: "#EF4444",
    defaultPriority: "CRITICAL"
  },
  FALL: {
    label: "Fall Detection",
    icon: "Activity",
    color: "#F59E0B",
    defaultPriority: "HIGH"
  },
  VOICE: {
    label: "Voice Keyword",
    icon: "Mic",
    color: "#3B82F6",
    defaultPriority: "MEDIUM"
  }
};

export const DEFAULT_API_BASE = "http://localhost:5000/api";
