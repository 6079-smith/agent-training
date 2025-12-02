import styles from '@/styles/components.module.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

export default function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={`${styles.spinner} ${styles[`spinner${size.charAt(0).toUpperCase() + size.slice(1)}`]}`} />
      {message && <p className={styles.loadingMessage}>{message}</p>}
    </div>
  )
}
