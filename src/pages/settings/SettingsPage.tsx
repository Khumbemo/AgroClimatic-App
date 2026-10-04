import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Moon, Sun, User, Bell, Shield,
  Database, HelpCircle, LogOut, ChevronRight,
  Info, Globe, Sliders
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingItem {
  id: string;
  label: string;
  icon: LucideIcon;
  value?: string;
  onClick?: () => void;
  color: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const sections: SettingSection[] = [
    {
      title: 'Preference',
      items: [
        {
          id: 'theme',
          label: 'Theme Mode',
          icon: theme === 'light' ? Moon : Sun,
          value: theme.charAt(0).toUpperCase() + theme.slice(1),
          onClick: toggleTheme,
          color: 'text-green-500 bg-green-50'
        },
        {
          id: 'units',
          label: 'Metric Units',
          icon: Sliders,
          value: 'Metric (°C, kPa)',
          color: 'text-blue-500 bg-blue-50'
        },
        {
          id: 'lang',
          label: 'Language',
          icon: Globe,
          value: 'English',
          color: 'text-green-500 bg-green-50'
        },
      ]
    },
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile Settings',
          icon: User,
          color: 'text-amber-500 bg-amber-50'
        },
        {
          id: 'notif',
          label: 'Notifications',
          icon: Bell,
          color: 'text-red-500 bg-red-50'
        },
        {
          id: 'security',
          label: 'Security & Privacy',
          icon: Shield,
          color: 'text-green-500 bg-green-50'
        },
      ]
    },
    {
      title: 'App System',
      items: [
        {
          id: 'data',
          label: 'Data Management',
          icon: Database,
          color: 'text-blue-500 bg-blue-50'
        },
        {
          id: 'help',
          label: 'Help & Support',
          icon: HelpCircle,
          color: 'text-green-500 bg-green-50'
        },
        {
          id: 'about',
          label: 'About Lab v1.2',
          icon: Info,
          color: 'text-gray-500 bg-gray-50'
        },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-xl flex items-center gap-5"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-2xl font-semibold shadow-sm ">
          {user?.displayName?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-semibold leading-tight">{user?.displayName || 'Research User'}</h2>
          <p className="text-xs text-gray-500 font-medium">{user?.email || 'lab-user@forestry.org'}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-semibold text-green-600 uppercase tracking-widest">Active Scientist</span>
          </div>
        </div>
      </motion.div>

      {/* Settings Sections */}
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-3 px-1">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] ml-4">
            {section.title}
          </h3>
          <div className="glass-panel rounded-xl overflow-hidden divide-y divide-gray-100">
            {section.items.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                onClick={item.onClick}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {item.value && (
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{item.value}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {/* Logout Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => logout()}
        className="w-full p-5 flex items-center justify-center gap-3 bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold text-xs uppercase tracking-[0.2em] shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        Logout Session
      </motion.button>

      <div className="text-center pt-4">
        <p className="text-[8px] font-semibold text-gray-300 uppercase tracking-[0.3em]">
          AgroClimatic Lab Systems • Encryption Active
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
