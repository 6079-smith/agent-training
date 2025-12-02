import styles from '@/styles/components.module.css'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string
    positive: boolean
  }
}

export default function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className={styles.statsCard}>
      <div className={styles.statsCardHeader}>
        <span className={styles.statsCardTitle}>{title}</span>
        <Icon size={20} className={styles.statsCardIcon} />
      </div>
      <div className={styles.statsCardValue}>{value}</div>
      {trend && (
        <div className={`${styles.statsCardTrend} ${trend.positive ? styles.trendPositive : styles.trendNegative}`}>
          {trend.value}
        </div>
      )}
    </div>
  )
}
