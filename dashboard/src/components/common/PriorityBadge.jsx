import { PRIORITY_CONFIG } from "../../utils/constants";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

export default function PriorityBadge({ priority, showIcon = true }) {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || "UNKNOWN",
    badgeClass: "priority-low"
  };

  const renderIcon = () => {
    switch (priority) {
      case "CRITICAL":
        return <AlertCircle size={12} strokeWidth={2.5} />;
      case "HIGH":
        return <AlertTriangle size={12} strokeWidth={2.5} />;
      case "MEDIUM":
        return <Info size={12} strokeWidth={2.5} />;
      case "LOW":
      default:
        return <CheckCircle size={12} strokeWidth={2.5} />;
    }
  };

  return (
    <span className={`badge ${config.badgeClass}`}>
      {showIcon && renderIcon()}
      <span>{config.label}</span>
    </span>
  );
}
