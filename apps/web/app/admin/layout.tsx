'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArticleIcon from '@mui/icons-material/Article';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SettingsIcon from '@mui/icons-material/Settings';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import { useAuth } from '@/lib/auth';
import styles from './layout.module.css';

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, href: '/admin' },
  { label: 'Numbers', icon: <PhoneIcon fontSize="small" />, href: '/admin/numbers' },
  { label: 'Users', icon: <PeopleIcon fontSize="small" />, href: '/admin/users' },
  { label: 'Orders', icon: <ShoppingCartIcon fontSize="small" />, href: '/admin/orders' },
  { label: 'Payments', icon: <CreditCardIcon fontSize="small" />, href: '/admin/payments' },
  { label: 'Fulfillment', icon: <PublishedWithChangesIcon fontSize="small" />, href: '/admin/fulfillment' },
  { label: 'Broker Apps', icon: <AssignmentIndIcon fontSize="small" />, href: '/admin/brokers' },
  { label: 'Offers', icon: <LocalOfferIcon fontSize="small" />, href: '/admin/offers' },
  { label: 'Commissions', icon: <AccountBalanceWalletIcon fontSize="small" />, href: '/admin/commissions' },
  { label: 'Pricing', icon: <AttachMoneyIcon fontSize="small" />, href: '/admin/pricing' },
  { label: 'NumberBarn', icon: <StorefrontIcon fontSize="small" />, href: '/admin/numberbarn' },
  { label: 'Content', icon: <ArticleIcon fontSize="small" />, href: '/admin/content' },
  { label: 'Settings', icon: <SettingsIcon fontSize="small" />, href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  // Allow /admin/setup without auth
  const isSetupPage = pathname === '/admin/setup';

  useEffect(() => {
    if (!isSetupPage && !loading && (!user || !isAdmin)) {
      router.replace('/');
    }
  }, [loading, user, isAdmin, router, isSetupPage]);

  // Setup page renders without admin 
  if (isSetupPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress sx={{ color: '#002664' }} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'A';

  return (
    <div className={styles.container}>
      {/* Mobile overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <img src="/images/logo.png" alt="NumberDepot" className={styles.logoImg} />
          <div>
            <div className={styles.logoText}>NumberDepot</div>
            <span className={styles.logoSub}>Admin Panel</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>{initials}</div>
          <div>
            <div className={styles.userName}>
              {user.firstName} {user.lastName}
            </div>
            <div className={styles.userRole}>
              {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topBar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '\u2715' : '\u2630'}
          </button>
          <span className={styles.topBarTitle}>Admin Panel</span>
          <Box sx={{ width: 28 }} />
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
