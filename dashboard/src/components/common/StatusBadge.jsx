import { STATUS_CONFIG } from "../../utils/constants";
import {
  Radio,
  Brain,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Navigation,
  CheckCircle2
} from "lucide-react";

const ICON_MAP = {
  Radio,
  Brain,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Navigation,
  CheckCircle2
};

export default function StatusBadge({ status, showIcon = true, size = "normal" }) {
  const config = STATUS_CONFIG[status] || {
    label: status || "UNKNOWN",
    badgeClass: "badge-detected",
    icon: "Radio"
  };

  const IconComponent = ICON_MAP[config.icon] || Radio;

  return (
    <span className={`badge ${config.badgeClass} ${size === "sm" ? "badge-sm" : ""}`} title={config.description}>
      {showIcon && <IconComponent size={12} strokeWidth={2.2} />}
      <span>{config.label}</span>
    </span>
  );
}
