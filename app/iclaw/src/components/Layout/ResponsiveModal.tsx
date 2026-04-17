import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useIsMobile } from '../../hooks/useResponsive';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'max-w-[95vw] md:max-w-4xl',
};

/**
 * ResponsiveModal - A modal that adapts to mobile (bottom sheet) vs desktop (centered)
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  size = 'md',
  showCloseButton = true,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Mobile: Bottom sheet style
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={handleBackdropClick}
              aria-hidden="true"
            />
            {/* Bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-h-[85vh] flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)' }}
              onClick={handleContentClick}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-primary)' }} />
              </div>

              {title && (
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  {icon && (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      {icon}
                    </div>
                  )}
                  <h3
                    id="modal-title"
                    className="flex-1 font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </h3>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      aria-label="Close modal"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 pb-safe">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Centered modal
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'rounded-2xl border shadow-2xl w-full',
              sizeClasses[size],
              'max-h-[80vh] flex flex-col'
            )}
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
            onClick={handleContentClick}
          >
            {title && (
              <div
                className="flex items-center gap-3 px-4 py-3 border-b"
                style={{ borderColor: 'var(--border-primary)' }}
              >
                {icon && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {icon}
                  </div>
                )}
                <h3
                  id="modal-title"
                  className="flex-1 font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </h3>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

/**
 * ConfirmDialog - A simple confirmation dialog built on ResponsiveModal
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  const buttonClasses = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    default: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={clsx('px-4 py-2 rounded-lg font-medium transition-colors', buttonClasses[variant])}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
