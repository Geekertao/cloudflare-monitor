import React, { useState, useEffect, useMemo } from 'react';
import StatsCards from './StatsCards';
import CacheStats from './CacheStats';
import GeographyStats from './GeographyStats';
import LineChart from './LineChart';
import LanguageSwitch from './LanguageSwitch';
import ThemeSwitch from './ThemeSwitch';
import VersionChecker from './VersionChecker';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = ({ accounts, selectedPeriod, onPeriodChange }) => {
  const { t } = useLanguage();
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 当滚动超过dashboard-header的高度时显示浮动按钮
      const dashboardHeader = document.querySelector('.dashboard-header');
      if (dashboardHeader) {
        const headerBottom = dashboardHeader.offsetTop + dashboardHeader.offsetHeight;
        setShowFloatingButtons(window.scrollY > headerBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // 检查 URL 参数中的锚点并平滑滚动
    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain');
    const account = params.get('account');

    if (domain) {
      setTimeout(() => {
        const element = document.getElementById(domain.toLowerCase());
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // 延迟执行以确保组件渲染完成
    } else if (account) {
      setTimeout(() => {
        const element = document.getElementById(`account-${account.toLowerCase()}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
    // 处理 Hash 锚点 (保持原有的 #domain 支持)
    else if (window.location.hash) {
      const id = window.location.hash.substring(1).toLowerCase();
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 计算汇总数据
  const aggregatedData = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    let totalRequests = 0;
    let totalBytes = 0;
    let totalThreats = 0;
    let totalCachedRequests = 0;
    let totalCachedBytes = 0;
    let allZonesData = [];

    accounts.forEach(account => {
      account.zones?.forEach(zone => {
        // 根据时间范围选择数据源：1天和3天使用小时级数据，7天和30天使用天级数据
        const useHourlyData = selectedPeriod === '1day' || selectedPeriod === '3days';
        const rawData = useHourlyData ? (zone.rawHours || []) : (zone.raw || []);
        
        // 添加数据验证和错误处理
        if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
          console.warn(`Zone ${zone.domain}: 缺少${useHourlyData ? '小时级' : '天级'}数据`);
          allZonesData.push({
            ...zone,
            accountName: account.name,
            dataError: `缺少${useHourlyData ? '小时级' : '天级'}数据`
          });
          return;
        }
        
        if (rawData && Array.isArray(rawData)) {
          // 排序数据
          const sortedData = rawData
            .filter(d => d && d.dimensions && d.sum)
            .sort((a, b) => {
              if (useHourlyData) {
                return new Date(a.dimensions.datetime) - new Date(b.dimensions.datetime);
              } else {
                return new Date(a.dimensions.date) - new Date(b.dimensions.date);
              }
            });
          
          let periodData;
          if (useHourlyData) {
            // 小时级数据：1天=24小时，3天=72小时
            const periodHours = selectedPeriod === '1day' ? 24 : 72;
            periodData = sortedData.slice(-Math.min(sortedData.length, periodHours));
            
            /* ====== FORK用户专用功能：从今天00点开始的单日数据 ======
             * 如果您在后端启用了从今天00点开始的功能，
             * 请取消注释下面的代码块，并注释掉上面的默认代码。
             * 
             * 这将确保单日数据只显示从今天00:00开始的数据。
             */
            /*
            if (selectedPeriod === '1day') {
              // 从今天00点开始的单日数据过滤
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0); // 今天00:00:00
              
              console.log(`过滤单日数据，从 ${todayStart.toISOString()} 开始`);
              
              periodData = sortedData.filter(d => {
                const dataTime = new Date(d.dimensions.datetime);
                return dataTime >= todayStart;
              });
              
              console.log(`过滤后的单日数据: ${periodData.length} 条记录`);
            } else {
              // 3天数据保持原逻辑
              periodData = sortedData.slice(-72);
            }
            */
          } else {
            // 天级数据：7天或30天
            const periodDays = selectedPeriod === '7days' ? 7 : 30;
            periodData = sortedData.slice(-Math.min(sortedData.length, periodDays));
          }
          
          periodData.forEach(dataPoint => {
            if (dataPoint.sum) {
              totalRequests += parseInt(dataPoint.sum.requests) || 0;
              totalBytes += parseInt(dataPoint.sum.bytes) || 0;
              totalThreats += parseInt(dataPoint.sum.threats) || 0;
              totalCachedRequests += parseInt(dataPoint.sum.cachedRequests) || 0;
              totalCachedBytes += parseInt(dataPoint.sum.cachedBytes) || 0;
            }
          });
          
          allZonesData.push({
            ...zone,
            accountName: account.name
          });
        }
      });
    });

    return {
      totalRequests,
      totalBytes,
      totalThreats,
      totalCachedRequests,
      totalCachedBytes,
      allZonesData,
      cacheRequestsRatio: totalRequests > 0 ? ((totalCachedRequests / totalRequests) * 100).toFixed(1) : 0,
      cacheBytesRatio: totalBytes > 0 ? ((totalCachedBytes / totalBytes) * 100).toFixed(1) : 0
    };
  }, [accounts, selectedPeriod]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  if (!aggregatedData) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            <img src="/favicon.svg" alt="Cloudflare" className="dashboard-icon" />
            {t('dashboardTitle')}
          </h1>
          <div className="header-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <p className="no-data-message">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 浮动按钮组 */}
      {showFloatingButtons && (
        <div className="floating-period-selector">
          <div className="floating-controls">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
          <div className="floating-period-buttons">
            <button
              className={`floating-period-button ${selectedPeriod === '1day' ? 'active' : ''}`}
              onClick={() => onPeriodChange('1day')}
            >
              {t('singleDay')}
            </button>
            <button
              className={`floating-period-button ${selectedPeriod === '3days' ? 'active' : ''}`}
              onClick={() => onPeriodChange('3days')}
            >
              {t('threeDays')}
            </button>
            <button
              className={`floating-period-button ${selectedPeriod === '7days' ? 'active' : ''}`}
              onClick={() => onPeriodChange('7days')}
            >
              {t('sevenDays')}
            </button>
            <button
              className={`floating-period-button ${selectedPeriod === '30days' ? 'active' : ''}`}
              onClick={() => onPeriodChange('30days')}
            >
              {t('thirtyDays')}
            </button>
          </div>
        </div>
      )}

      {/* 标题区域 */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <img src="/favicon.svg" alt="Cloudflare" className="dashboard-icon" />
          {t('dashboardTitle')}
        </h1>
        
        {/* 主题和语言控制器 */}
        <div className="header-controls">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
        
        {/* 时间段选择器 */}
        <div className="period-selector">
          <button
            className={`period-button ${selectedPeriod === '1day' ? 'active' : ''}`}
            onClick={() => onPeriodChange('1day')}
          >
            {t('singleDay')}
          </button>
          <button
            className={`period-button ${selectedPeriod === '3days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('3days')}
          >
            {t('threeDays')}
          </button>
          <button
            className={`period-button ${selectedPeriod === '7days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('7days')}
          >
            {t('sevenDays')}
          </button>
          <button
            className={`period-button ${selectedPeriod === '30days' ? 'active' : ''}`}
            onClick={() => onPeriodChange('30days')}
          >
            {t('thirtyDays')}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <StatsCards 
        totalRequests={aggregatedData.totalRequests}
        totalBytes={aggregatedData.totalBytes}
        totalThreats={aggregatedData.totalThreats}
        formatNumber={formatNumber}
        formatBytes={formatBytes}
        accounts={accounts}
      />

      {/* 缓存统计 */}
      <CacheStats
        totalRequests={aggregatedData.totalRequests}
        totalCachedRequests={aggregatedData.totalCachedRequests}
        totalBytes={aggregatedData.totalBytes}
        totalCachedBytes={aggregatedData.totalCachedBytes}
        cacheRequestsRatio={aggregatedData.cacheRequestsRatio}
        cacheBytesRatio={aggregatedData.cacheBytesRatio}
        formatNumber={formatNumber}
        formatBytes={formatBytes}
      />

      {/* 地理位置统计 - 仅在单日数据时显示且有地理位置数据 */}
      {selectedPeriod === '1day' && accounts && accounts.some(account => 
        account.zones && account.zones.some(zone => zone.geography && zone.geography.length > 0)
      ) && (
        <GeographyStats
          data={accounts}
          formatNumber={formatNumber}
          formatBytes={formatBytes}
        />
      )}

      {/* 图表区域 */}
      <div className="charts-section">
        <h2 className="section-title">{t('webTrafficTrends')}</h2>
        {accounts.map((account) => (
          <div key={account.name} id={`account-${account.name.toLowerCase()}`} className="account-section">
            <div className="account-header">
              <h3 className="account-name">{t('account')}: {account.name}</h3>
            </div>
            <div className="zones-grid">
              {account.zones && account.zones.length > 0 ? (
                account.zones.map((zone) => (
                  <LineChart
                    key={zone.domain}
                    domain={zone.domain}
                    raw={zone.raw || []}
                    rawHours={zone.rawHours || []}
                    selectedPeriod={selectedPeriod}
                  />
                ))
              ) : (
                <div style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  {t('noZoneData')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 页面底部 Powered by */}
      <div className="powered-by-section">
        <div className="powered-by-content">
          <p className="powered-by-text">{t('poweredBy')}</p>
          <div className="powered-by-badges">
            <a href="https://developers.cloudflare.com/analytics/graphql-api/"><img src="https://img.shields.io/badge/Cloudflare%20GraphQL%20Analytics%20API-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare GraphQL Analytics API" />
            </a>
            <a href="https://github.com/Geekertao/Cloudflare-monitor">
              <img src="https://img.shields.io/badge/GitHub-Click%20to%20open-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository" />
            </a>
          </div>
          <VersionChecker />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;