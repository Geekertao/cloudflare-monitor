import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { scaleLinear } from 'd3-scale';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import WorldMap from './WorldMap';

const GeographyStats = ({ data, formatNumber, formatBytes }) => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  
  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 主题相关的颜色配置
  const themeColors = {
    background: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#333333',
    textSecondary: isDarkMode ? '#b0b0b0' : '#666666',
    border: isDarkMode ? '#404040' : '#e1e1e1',
    grid: isDarkMode ? '#404040' : undefined, // 深色模式使用更明显的网格
    // 图表颜色与折线图保持一致
    chartColors: {
      requests: '#2563eb',    // 蓝色 - 与折线图requests颜色一致
      bandwidth: '#10b981'    // 绿色 - 与折线图bytes颜色一致
    }
  };
  
  // 聚合所有Zone的地理位置数据
  const allCountryStats = useMemo(() => {
    const countryStats = {};
    
    if (!data || !Array.isArray(data)) {
      console.warn('GeographyStats: data is not an array or is null');
      return [];
    }
    
    data.forEach(account => {
      if (account.zones && Array.isArray(account.zones)) {
        account.zones.forEach(zone => {
          if (zone.geography && Array.isArray(zone.geography)) {
            zone.geography.forEach(geo => {
              const countryName = geo.dimensions?.clientCountryName;
              if (countryName && countryName !== 'Unknown' && countryName !== '') {
                if (!countryStats[countryName]) {
                  countryStats[countryName] = {
                    country: countryName,
                    requests: 0,
                    bytes: 0,
                    threats: 0
                  };
                }
                // 兼容新旧数据格式
                countryStats[countryName].requests += geo.sum?.requests || geo.count || 0;
                countryStats[countryName].bytes += geo.sum?.bytes || 0;
                countryStats[countryName].threats += geo.sum?.threats || 0;
              }
            });
          }
        });
      }
    });
    
    return Object.values(countryStats).sort((a, b) => b.requests - a.requests);
  }, [data]);

  // 取前5名用于柱状图和列表
  const topCountries = useMemo(() => {
    return allCountryStats.slice(0, 5);
  }, [allCountryStats]);

  // 计算最大请求数，用于颜色比例尺
  const maxRequests = useMemo(() => {
    if (!allCountryStats || allCountryStats.length === 0) return 0;
    return allCountryStats[0].requests; // 已经是降序排列
  }, [allCountryStats]);

  // 列表颜色比例尺 - 与地图保持一致
  const listColorScale = scaleLinear()
    .domain([0, maxRequests > 0 ? maxRequests : 1])
    .range(isDarkMode ? ["#2d2d2d", "#3b82f6"] : ["#f1f5f9", "#2563eb"]);

  // 计算总请求数用于百分比计算
  const totalRequests = useMemo(() => {
    return topCountries.reduce((sum, country) => sum + country.requests, 0);
  }, [topCountries]);

  // 自定义Tooltip - 双柱状图
  const CombinedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '12px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '8px',
          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: themeColors.text }}>
            {data.country}
          </p>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '0 0 4px 0', 
            color: themeColors.textSecondary 
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: themeColors.chartColors.requests,
              borderRadius: '2px',
              marginRight: '8px',
              flexShrink: 0
            }}></div>
            <span>{t('requests')}: {formatNumber(data.requests)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '0', 
            color: themeColors.textSecondary 
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: themeColors.chartColors.bandwidth,
              borderRadius: '2px',
              marginRight: '8px',
              flexShrink: 0
            }}></div>
            <span>{t('bandwidth')}: {formatBytes(data.bytes)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!topCountries || topCountries.length === 0) {
    return (
      <div className="geography-stats">
        <div className="section-header">
          <h2>{t('geographyStats')}</h2>
          <p className="section-subtitle">{t('topCountriesRegions')}</p>
        </div>
        <div className="no-data">
          <p>{t('noGeographyData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geography-stats">
      <div className="section-header">
        <h2>{t('geographyStats')}</h2>
        <p className="section-subtitle">{t('topCountriesRegions')}</p>
      </div>
      
      {/* 布局容器：统一为上下布局 */}
      <div className="charts-layout" style={{ 
          display: 'flex', 
          flexDirection: 'column', // 始终保持上下布局
          gap: '24px',
          marginBottom: '24px'
      }}>
        {/* 合并的双柱状图 */}
        <div className="chart-container" style={{ 
            width: '100%', 
            minWidth: 0,
            marginTop: 0 
        }}>
          <h3>{t('trafficByCountry')}</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={topCountries}
              margin={{
                top: 15,
                right: 30,
                left: 20,
                bottom: 30
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={0.3}
                stroke={themeColors.grid}
              />
              <XAxis 
                dataKey="country" 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12, fill: themeColors.textSecondary }}
              />
              <YAxis 
                yAxisId="requests"
                orientation="left"
                tick={{ fontSize: 12, fill: themeColors.textSecondary }}
                label={{ value: t('requests'), angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: themeColors.textSecondary } }}
              />
              <YAxis 
                yAxisId="bandwidth"
                orientation="right"
                tick={false}
                axisLine={false}
                label={{ value: t('bandwidth'), angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: themeColors.textSecondary } }}
              />
              <Tooltip content={<CombinedTooltip />} />
              <Bar 
                yAxisId="requests"
                dataKey="requests" 
                fill={themeColors.chartColors.requests}
                radius={[4, 4, 0, 0]}
                name={t('requests')}
                maxBarSize={60}
              />
              <Bar 
                yAxisId="bandwidth"
                dataKey="bytes" 
                fill={themeColors.chartColors.bandwidth}
                radius={[4, 4, 0, 0]}
                name={t('bandwidth')}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 世界地图 */}
        <div className="map-container" style={{ 
            width: '100%',
            minWidth: 0
        }}>
           <WorldMap 
              data={allCountryStats} 
              formatNumber={formatNumber} 
              formatBytes={formatBytes}
              isMobile={isMobile}
           />
        </div>
      </div>

      {/* 统计列表 */}
      <div className="geography-list">
        <h3>{t('detailedStats')}</h3>
        <div className="stats-table">
          <div className="table-header">
            <div className="col-rank">#</div>
            <div className="col-country">{isMobile ? t('countryShort') : t('countryRegion')}</div>
            <div className="col-requests">{isMobile ? t('requestsShort') : t('requests')}</div>
            <div className="col-bandwidth">{isMobile ? t('bandwidthShort') : t('bandwidth')}</div>
          </div>
          {topCountries.map((country, index) => {
            const percentage = totalRequests > 0 ? ((country.requests / totalRequests) * 100).toFixed(1) : '0.0';
            const rowColor = listColorScale(country.requests);
            
            // 判断背景色深浅来决定文字颜色
            // 简单的亮度判断：(R*299 + G*587 + B*114) / 1000
            // 这里我们知道 scale 的范围，深色是蓝色系，浅色是白色系
            // 当请求量较少时（浅色），用深色文字；请求量大时（深色），用白色文字
            // 这是一个近似判断
            const isDarkBackground = country.requests > maxRequests * 0.5;
            const rankBadgeColor = isDarkBackground ? '#fff' : (isDarkMode ? '#fff' : '#333');

            return (
              <div key={country.country} className="table-row">
                <div className="col-rank">
                  <span 
                    className="rank-badge" 
                    style={{
                      backgroundColor: rowColor,
                      color: rankBadgeColor,
                      border: isDarkBackground ? 'none' : `1px solid ${themeColors.border}`
                    }}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="col-country">
                  <span className="country-name">{country.country}</span>
                  <span className="country-percentage">({percentage}%)</span>
                </div>
                <div className="col-requests">
                  {formatNumber(country.requests)}
                </div>
                <div className="col-bandwidth">
                  {formatBytes(country.bytes)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GeographyStats;
