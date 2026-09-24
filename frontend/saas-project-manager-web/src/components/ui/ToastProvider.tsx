import { Toast } from 'react-bootstrap';
import { useToastStore } from '../../store/toastStore';

export default function ToastProvider() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="sm-toasts" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} bg={t.variant} onClose={() => dismiss(t.id)} autohide>
          <Toast.Body className={t.variant === 'success' || t.variant === 'danger' ? 'text-white' : undefined}>
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </div>
  );
}
