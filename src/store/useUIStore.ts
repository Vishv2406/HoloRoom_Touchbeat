// useUIStore.ts — UI state store: panels, modals, notifications
import { create } from 'zustand';
import { produce } from 'immer';
import type { Notification } from '../types';

interface UIState {
  isPanelOpen: boolean;
  panelType: 'device' | 'room' | null;
  isEnergyOpen: boolean;
  isAutomationOpen: boolean;
  isNotificationsOpen: boolean;
  isSettingsOpen: boolean;
  isCreateSceneOpen: boolean;
  is2DMode: boolean;
  isDarkMode: boolean;
  simulatorEnabled: boolean;
  notifications: Notification[];
  _notifCounter: number;

  openPanel: (type: 'device' | 'room') => void;
  closePanel: () => void;
  toggleEnergy: () => void;
  toggleAutomation: () => void;
  toggleNotifications: () => void;
  toggleSettings: () => void;
  toggleCreateScene: () => void;
  toggle2DMode: () => void;
  toggleDarkMode: () => void;
  toggleSimulator: () => void;
  closeAll: () => void;
  addNotification: (message: string, type: Notification['type']) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  deleteNotification: (id: number) => void;
  getUnreadCount: () => number;
}

export const useUIStore = create<UIState>((set, get) => ({
  isPanelOpen: false,
  panelType: null,
  isEnergyOpen: false,
  isAutomationOpen: false,
  isNotificationsOpen: false,
  isSettingsOpen: false,
  isCreateSceneOpen: false,
  is2DMode: false,
  isDarkMode: false,
  simulatorEnabled: true,
  _notifCounter: 3,
  notifications: [
    { id: 1, message: '💡 Energy tip: Fan uses 97% less energy than AC!', type: 'info', timestamp: Date.now() - 300000, isRead: false },
    { id: 2, message: '🌞 Good morning! Tap "Good Morning" scene to start your day', type: 'success', timestamp: Date.now() - 600000, isRead: false },
    { id: 3, message: '⚡ Set your AC to 26°C to save up to ₹240/month', type: 'warning', timestamp: Date.now() - 900000, isRead: false },
  ],

  openPanel: (type) => set({ isPanelOpen: true, panelType: type }),
  closePanel: () => set({ isPanelOpen: false, panelType: null }),
  toggleEnergy: () => set(s => ({ isEnergyOpen: !s.isEnergyOpen, isAutomationOpen: false, isSettingsOpen: false, isCreateSceneOpen: false })),
  toggleAutomation: () => set(s => ({ isAutomationOpen: !s.isAutomationOpen, isEnergyOpen: false, isSettingsOpen: false, isCreateSceneOpen: false })),
  toggleNotifications: () => set(s => ({ isNotificationsOpen: !s.isNotificationsOpen })),
  toggleSettings: () => set(s => ({ isSettingsOpen: !s.isSettingsOpen, isEnergyOpen: false, isAutomationOpen: false, isCreateSceneOpen: false })),
  toggleCreateScene: () => set(s => ({ isCreateSceneOpen: !s.isCreateSceneOpen, isEnergyOpen: false, isAutomationOpen: false, isSettingsOpen: false })),
  toggle2DMode: () => set(s => ({ is2DMode: !s.is2DMode })),
  toggleDarkMode: () => set(s => ({ isDarkMode: !s.isDarkMode })),
  toggleSimulator: () => set(s => ({ simulatorEnabled: !s.simulatorEnabled })),
  closeAll: () => set({ isEnergyOpen: false, isAutomationOpen: false, isSettingsOpen: false, isCreateSceneOpen: false, isNotificationsOpen: false }),

  addNotification: (message, type) => {
    set(produce<UIState>((s) => {
      s._notifCounter++;
      s.notifications.unshift({ id: s._notifCounter, message, type, timestamp: Date.now(), isRead: false });
      if (s.notifications.length > 50) s.notifications.pop();
    }));
  },

  markRead: (id) => {
    set(produce<UIState>((s) => {
      const n = s.notifications.find(n => n.id === id);
      if (n) n.isRead = true;
    }));
  },

  markAllRead: () => {
    set(produce<UIState>((s) => { s.notifications.forEach(n => { n.isRead = true; }); }));
  },

  deleteNotification: (id) => {
    set(produce<UIState>((s) => { s.notifications = s.notifications.filter(n => n.id !== id); }));
  },

  getUnreadCount: () => get().notifications.filter(n => !n.isRead).length,
}));
