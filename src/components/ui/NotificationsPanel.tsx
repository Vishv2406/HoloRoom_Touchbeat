// NotificationsPanel.tsx — Slide-in notifications drawer
import { X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';
import { relativeTime } from '../../utils/formatters';

const TYPE_COLORS: Record<string, string> = { info: '#00D4FF', success: '#00F5A0', warning: '#FFB800', danger: '#FF4D6D' };
const TYPE_ICONS: Record<string, string> = { info: '💡', success: '✅', warning: '⚠️', danger: '🚨' };

export default function NotificationsPanel() {
  const isOpen = useUIStore(s => s.isNotificationsOpen);
  const notifications = useUIStore(s => s.notifications);
  const toggleNotifications = useUIStore(s => s.toggleNotifications);
  const markRead = useUIStore(s => s.markRead);
  const markAllRead = useUIStore(s => s.markAllRead);
  const deleteNotification = useUIStore(s => s.deleteNotification);
  const unreadCount = useUIStore(s => s.getUnreadCount());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[1000]" onClick={toggleNotifications} />
          <motion.div
            initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
            className="fixed top-0 right-0 h-full z-[1001] flex flex-col"
            style={{ width: 380, background: 'var(--bg-1)', borderLeft: '1px solid var(--border-bright)', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--red)', color: 'white' }}>{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs" style={{ color: 'var(--cyan)' }}>
                    <CheckCheck size={12} />All read
                  </button>
                )}
                <button onClick={toggleNotifications} className="p-1.5 rounded-lg hover:opacity-60">
                  <X size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="text-4xl">🎉</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>All caught up!</div>
                </div>
              ) : (
                notifications.map(notif => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 p-4 transition-all cursor-pointer group"
                    style={{
                      background: notif.isRead ? 'transparent' : `${TYPE_COLORS[notif.type]}08`,
                      borderLeft: `3px solid ${notif.isRead ? 'transparent' : TYPE_COLORS[notif.type]}`,
                      borderBottom: '1px solid var(--border)',
                    }}
                    onClick={() => markRead(notif.id)}
                  >
                    <span className="text-xl shrink-0">{TYPE_ICONS[notif.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-relaxed" style={{ color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {notif.message}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{relativeTime(notif.timestamp)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!notif.isRead && <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[notif.type] }} />}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
