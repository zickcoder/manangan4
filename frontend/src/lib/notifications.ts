// Interactive Notification Service for GOVSERVE Platform (Admin & Citizen)

export interface NotificationItem {
  id: string | number;
  title: string;
  text: string;
  time: string;
  unread: boolean;
  targetRole: 'Admin' | 'Citizen' | 'All';
  targetEmail?: string; // If set, only the citizen with this email receives this notification
  category?: 'reservation' | 'utility' | 'cemetery' | 'system' | 'facility';
  timestamp: number;
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('govserve_notifications');
    if (raw) {
      const parsed: NotificationItem[] = JSON.parse(raw);
      // Clean up legacy mock/ghost notifications from previous tests
      const cleaned = parsed.filter((n) => {
        const idNum = Number(n.id);
        if (idNum >= 1 && idNum <= 10) return false;
        if (n.text?.includes('Juan Dela Cruz')) return false;
        if (n.text?.includes('Juan M. Dela Cruz')) return false;
        if (n.text?.includes('Columbarium Niche COL-R01-C05')) return false;
        if (n.text?.includes('Barangay Civic Center has been approved')) return false;
        if (n.text?.includes('Resident booked Barangay 178')) return false;
        if (n.text?.includes('Resident booked')) return false;
        // Strip out citizen notifications that don't have a valid targetEmail
        if (n.targetRole === 'Citizen' && (!n.targetEmail || !n.targetEmail.includes('@'))) return false;
        return true;
      });

      if (cleaned.length !== parsed.length) {
        localStorage.setItem('govserve_notifications', JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (e) {
    console.error('Failed to load notifications:', e);
  }

  return [];
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

/**
 * Filter notifications specifically for the logged-in user:
 * - Citizens ONLY see broadcasts ('All') or notifications specifically tagged with their targetEmail
 * - Admins/Staff ONLY see staff alerts ('Admin') and broadcasts ('All')
 */
export function getNotificationsForUser(role: string, userEmail?: string): NotificationItem[] {
  const all = getStoredNotifications();
  const isCitizen = role === 'Citizen';
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  const filtered = all.filter((n) => {
    if (isCitizen) {
      // Broadcast alerts for all users (system only)
      if (n.targetRole === 'All') return true;

      // Citizen-targeted notification: Must match this specific citizen's email
      if (n.targetRole === 'Citizen') {
        return Boolean(n.targetEmail && cleanEmail && n.targetEmail.trim().toLowerCase() === cleanEmail);
      }
      return false;
    }

    // Admin / Super Admin / Staff view: Only Admin alerts and general broadcasts
    return n.targetRole === 'Admin' || n.targetRole === 'All';
  });

  // Dynamically compute relative time based on timestamp
  return filtered.map((n) => ({
    ...n,
    time: formatRelativeTime(n.timestamp),
  }));
}

export function addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'time' | 'unread'> & { unread?: boolean }) {
  const current = getStoredNotifications();
  const now = Date.now();
  const newItem: NotificationItem = {
    ...notif,
    id: `notif-${now}-${Math.floor(Math.random() * 10000)}`,
    timestamp: now,
    time: 'Just now',
    unread: notif.unread !== undefined ? notif.unread : true,
  };
  current.unshift(newItem);
  if (current.length > 50) current.length = 50;
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

export function markAllNotificationsAsRead(role: string, userEmail?: string) {
  const current = getStoredNotifications();
  const isCitizen = role === 'Citizen';
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  current.forEach((n) => {
    if (isCitizen) {
      if (n.targetRole === 'All' || (n.targetRole === 'Citizen' && n.targetEmail?.trim().toLowerCase() === cleanEmail)) {
        n.unread = false;
      }
    } else {
      if (n.targetRole === 'Admin' || n.targetRole === 'All') {
        n.unread = false;
      }
    }
  });
  saveStoredNotifications(current);
}

export function clearUserNotifications(role: string, userEmail?: string) {
  const current = getStoredNotifications();
  const isCitizen = role === 'Citizen';
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  const remaining = current.filter((n) => {
    if (isCitizen) {
      if (n.targetRole === 'Citizen' && n.targetEmail?.trim().toLowerCase() === cleanEmail) return false;
      return true;
    } else {
      if (n.targetRole === 'Admin') return false;
      return true;
    }
  });
  saveStoredNotifications(remaining);
}
