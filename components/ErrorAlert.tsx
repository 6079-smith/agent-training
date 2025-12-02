import styles from '@/styles/components.module.css'
import * as Icons from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onDismiss?: () => void
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className={styles.errorAlert}>
      <div className={styles.errorAlertContent}>
        <Icons.AlertCircle size={20} />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={styles.errorAlertClose}>
          <Icons.X size={18} />
        </button>
      )}
    </div>
  )
}
