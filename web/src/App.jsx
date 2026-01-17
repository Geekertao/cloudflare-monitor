import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LanguageSwitch from './components/LanguageSwitch';
import ThemeSwitch from './components/ThemeSwitch';
import './App.css';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    // 检查 URL 参数中的时间范围 (?1day, ?3days, ?period=1day)
    const params = new URLSearchParams(window.location.search);
    if (params.has('1day') || params.get('period') === '1day') return '1day';
    if (params.has('3days') || params.get('period') === '3days') return '3days';
    if (params.has('7days') || params.get('period') === '7days') return '7days';
    if (params.has('30days') || params.get('period') === '30days') return '30days';
    return '1day';
  });

  useEffect(() => {
    // 使用相对路径，通过nginx反向代理访问
    axios
      .get('/data/analytics.json')
      .then((res) => {
        console.log('API Response:', res.data); // 添加调试日志
        setAccounts(res.data.accounts || []);
        setError(null);
      })
      .catch((error) => {
        console.error('API Error:', error);
        setError(t('loadError'));
        // 如果数据文件不存在，显示提示信息
        console.log('请确保后端API正在运行并已生成数据文件');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container error">
        <div className="error-content">
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="app-container empty">
        <div className="empty-content">
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <h2>{t('dashboardTitle')}</h2>
          <p>{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Dashboard 
        accounts={accounts}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />
    </div>
  );
}