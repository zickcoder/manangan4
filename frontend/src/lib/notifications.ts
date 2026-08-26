// Interactive Notification Service for GOVSERVE Platform (Admin & Citizen)

export interface NotificationItem {
  id: string | number;
  title: string;
  text: string;
  time: string;
  unread: boolean;
  targetRole: 'Admin' | 'Citizen' | 'All';
  category?: 'reservation' | 'utility' | 'cemetery' | 'system';
  timestamp: number;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: 'Reservation Request Submitted',
    text: 'Juan Dela Cruz submitted booking for Civic Center on March 15.',
    time: '10m ago',
    unread: true,
    targetRole: 'Admin',
    category: 'reservation',
    timestamp: Date.now() - 10 * 60 * 1000,
  },
  {
    id: 2,
    title: 'High-Priority Utility Incident',
    text: 'Water leak and storm canal declogging ticket filed in Zone 4.',
    time: '25m ago',
    unread: true,
    targetRole: 'Admin',
    category: 'utility',
    timestamp: Date.now() - 25 * 60 * 1000,
  },
  {
    id: 3,
    title: 'Burial Permit Endorsed',
    text: 'Burial permit BP-2026-0091 registered in Columbarium Wall Alpha.',
    time: '1h ago',
    unread: false,
    targetRole: 'Admin',
    category: 'cemetery',
    timestamp: Date.now() - 60 * 60 * 1000,
  },
  {
    id: 4,
    title: 'Reservation Slot Approved',
    text: 'Your booking for Barangay Civic Center has been approved by LGU Admin.',
    time: '15m ago',
    unread: true,
    targetRole: 'Citizen',
    category: 'reservation',
    timestamp: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 5,
    title: 'Utility Response Dispatched',
    text: 'Municipal Drainage Crew Alpha has been assigned to your report.',
    time: '45m ago',
    unread: true,
    targetRole: 'Citizen',
    category: 'utility',
    timestamp: Date.now() - 45 * 60 * 1000,
  },
  {
    id: 6,
    title: 'Cemetery Plot Allocation Confirmed',
    text: 'Columbarium Niche COL-R01-C05 has been reserved for your application.',
    time: '2h ago',
    unread: false,
    targetRole: 'Citizen',
    category: 'cemetery',
    timestamp: Date.now() - 120 * 60 * 1000,
  },
];

export function getStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem('govserve_notifications');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }
  // Initialize default
  localStorage.setItem('govserve_notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
  return DEFAULT_NOTIFICATIONS;
}

export function saveStoredNotifications(items: NotificationItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('govserve_notifications', JSON.stringify(items));
    window.dispatchEvent(new Event('govserve_notifications_updated'));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export function getNotificationsForUser(role: string): NotificationItem[] {
  const all = getStoredNotifications();
  const targetRole = role === 'Citizen' ? 'Citizen' : 'Admin';
  return all.filter((n) => n.targetRole === targetRole || n.targetRole === 'All');
}

export function addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'time' | 'unread'>) {
  const current = getStoredNotifications();
  const newItem: NotificationItem = {
    ...notif,
    id: Date.now(),
    timestamp: Date.now(),
    time: 'Just now',
    unread: true,
  };
  current.unshift(newItem);
  saveStoredNotifications(current);
  return newItem;
}

export function markNotificationAsRead(id: string | number) {
  const current = getStoredNotifications();
  const item = current.find((n) => String(n.id) === String(id));
  if (item) {
    item.unread = false;
    saveStoredNotifications(current);
  }
}

export function markAllNotificationsAsRead(role: string) {
  const current = getStoredNotifications();
  const targetRole = role === 'Citizen' ? 'Citizen' : 'Admin';
  current.forEach((n) => {
    if (n.targetRole === targetRole || n.targetRole === 'All') {
      n.unread = false;
    }
  });
  saveStoredNotifications(current);
}
