import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import "../styles/ConfirmModal.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "warning"
  onConfirm,
  onCancel,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onCancel();
  };

  const Icon = variant === "danger" ? AlertTriangle : CheckCircle;

  return (
    <div className="confirm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`confirm-card confirm-card--${variant}`}>
        <div className="confirm-icon">
          <Icon size={28} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className={`confirm-btn confirm-btn--${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
