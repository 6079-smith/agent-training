'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from '@/styles/components.module.css'
import layoutStyles from '@/styles/layout.module.css'
import * as Icons from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Icons.Home },
    { href: '/wizard', label: 'Wizard', icon: Icons.Wand2 },
    { href: '/prompts', label: 'Prompts', icon: Icons.FileText },
    { href: '/test-cases', label: 'Test Cases', icon: Icons.TestTube },
    { href: '/playground', label: 'Playground', icon: Icons.Play },
    { href: '/results', label: 'Results', icon: Icons.BarChart3 },
  ]

  return (
    <nav className={layoutStyles.sidebar}>
      <div className={layoutStyles.sidebarHeader}>
        <Icons.Sparkles size={24} />
        <span className={layoutStyles.sidebarTitle}>CS Agent Optimizer</span>
      </div>
      <div className={layoutStyles.sidebarNav}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${layoutStyles.sidebarLink} ${
                isActive(item.href) ? layoutStyles.sidebarLinkActive : ''
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
