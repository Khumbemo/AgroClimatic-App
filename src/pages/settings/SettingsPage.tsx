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
          color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
        },
        {
          id: 'units',
          label: 'Metric Units',
          icon: Sliders,
          value: 'Metric (°C, kPa)',
          color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
        },
        {
          id: 'lang',
          label: 'Language',
          icon: Globe,
          value: 'English',
          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
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
          color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
        },
        {
          id: 'notif',
          label: 'Notifications',
          icon: Bell,
          color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
        },
        {
          id: 'security',
          label: 'Security & Privacy',
          icon: Shield,
          color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
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
          color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
        },
        {
          id: 'help',
          label: 'Help & Support',
          icon: HelpCircle,
          color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20'
        },
        {
          id: 'about',
          label: 'About Lab v1.2',
          icon: Info,
          color: 'text-slate-500 bg-slate-50 dark:bg-slate-900/20'
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
        className="glass-panel p-6 rounded-[2.5rem] flex items-center gap-5"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
          {user?.displayName?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-black dark:text-white leading-tight">{user?.displayName || 'Research User'}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user?.email || 'lab-user@forestry.org'}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Scientist</span>
          </div>
        </div>
      </motion.div>

      {/* Settings Sections */}
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-3 px-1">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-4">
            {section.title}
          </h3>
          <div className="glass-panel rounded-[2rem] overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {section.items.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                onClick={item.onClick}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-gray-200">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {item.value && (
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.value}</span>
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
        className="w-full p-5 flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-[2rem] border border-red-100 dark:border-red-900/20 font-black text-xs uppercase tracking-[0.2em] shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        Logout Session
      </motion.button>

      <div className="text-center pt-4">
        <p className="text-[8px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">
          AgroClimatic Lab Systems • Encryption Active
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
