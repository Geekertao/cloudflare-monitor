import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const CFLineChart = ({ domain, raw, rawHours, selectedPeriod }) => {
  const { t, isZh } = useLanguage();
  const { isDarkMode } = useTheme();
  
  // 主题相关的颜色配置
  const themeColors = {
    background: isDarkMode ? '#2d2d2d' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#333333',
    textSecondary: isDarkMode ? '#b0b0b0' : '#666666',
    textMuted: isDarkMode ? '#888888' : '#999999',
    border: isDarkMode ? '#404040' : '#e1e1e1',
    borderLight: isDarkMode ? '#353535' : '#f0f0f0',
    grid: isDarkMode ? '#404040' : '#f0f0f0',
    // 图表线条颜色
    lineColors: {
      requests: '#2563eb',     // 蓝色
      cachedRequests: '#4ec0e4', // 橙色
      bytes: '#10b981',        // 绿色
      threats: '#ef4444'       // 红色
    }
  };
  
  // 根据时间范围选择数据源：1天和3天使用小时级数据，7天和30天使用天级数据
  const useHourlyData = selectedPeriod === '1day' || selectedPeriod === '3days';
  const sourceData = useHourlyData ? rawHours : raw;
  
  console.log(`LineChart ${domain}: useHourlyData=${useHourlyData}, sourceData length:`, sourceData?.length);
  
  // 数据验证
  if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
    console.warn(`LineChart ${domain}: 缺少${useHourlyData ? '小时级' : '天级'}数据`);
    return (
      <div style={{ 
        background: themeColors.background,
        padding: '24px',
        borderRadius: '12px',
        boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px',
        border: `1px solid ${themeColors.border}`
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: themeColors.text,
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {domain}
        </h3>
        <p style={{ 
          color: themeColors.textMuted,
          margin: 0,
          textAlign: 'center',
          padding: '40px 0'
        }}>
          {useHourlyData ? t('noHourlyDataFallback') : t('noDailyDataFallback')}
          {useHourlyData && raw && raw.length > 0 && (
            <><br /><small>{t('useDailyDataInstead')}</small></>
          )}
        </p>
        {useHourlyData && raw && raw.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {t('useDailyDataButton')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 把API数据转成 Recharts 需要的数据格式
  /* ====== FORK用户注意 ======
   * 如果您在Dashboard.jsx中启用了从今天00点开始的功能，
   * 这里会自动接收到经过时间过滤的数据，无需修改此文件。
   * 数据过滤逻辑已在Dashboard组件中处理完成。
   */
  const data = sourceData
    .filter(d => d && d.dimensions && d.sum) // 过滤无效数据
    .map((d) => {
      let date, formattedDate, originalDate;
      
      if (useHourlyData) {
        // 小时级数据使用datetime
        date = d.dimensions.datetime;
        const dateObj = new Date(date);
        if (isZh) {
          formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:00`;
        } else {
          formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:00`;
        }
        originalDate = date;
      } else {
        // 天级数据使用date
        date = d.dimensions.date;
        const dateObj = new Date(date);
        if (isZh) {
          formattedDate = dateObj.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
          });
        } else {
          formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        }
        originalDate = date;
      }
      
      return {
        date: formattedDate,
        originalDate: originalDate,
        requests: parseInt(d.sum.requests) || 0,
        bytes: parseInt(d.sum.bytes) || 0,
        threats: parseInt(d.sum.threats) || 0,
        cachedRequests: parseInt(d.sum.cachedRequests) || 0,
        cachedBytes: parseInt(d.sum.cachedBytes) || 0
      };
    })
    .sort((a, b) => new Date(a.originalDate) - new Date(b.originalDate)) // 按日期排序
    .slice(-Math.min(sourceData.length, 
      useHourlyData ? 
        (selectedPeriod === '1day' ? 24 : 72) : // 1天=24小时，3天=72小时
        (selectedPeriod === '7days' ? 7 : 30))); // 7天或30天

  if (data.length === 0) {
    return (
      <div style={{ 
        background: themeColors.background,
        padding: '24px',
        borderRadius: '12px',
        boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px',
        border: `1px solid ${themeColors.border}`
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          color: themeColors.text,
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {domain}
        </h3>
        <p style={{ 
          color: themeColors.textMuted,
          margin: 0,
          textAlign: 'center',
          padding: '40px 0'
        }}>
          {t('invalidData')}
        </p>
      </div>
    );
  }

  // 数据单位转换
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

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: themeColors.background,
          padding: '12px',
          border: `1px solid ${themeColors.border}`,
          borderRadius: '8px',
          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: themeColors.text }}>
            {useHourlyData ? `${t('timeLabel')}: ${label}` : `${t('dateLabel')}: ${label}`}
          </p>
          {payload.map((entry, index) => {
            let value = entry.value;
            
            if (entry.dataKey === 'bytes' || entry.dataKey === 'cachedBytes') {
              value = formatBytes(entry.value);
            } else {
              value = formatNumber(entry.value);
            }
            
            return (
              <div key={index} style={{ 
                display: 'flex',
                alignItems: 'center',
                margin: '4px 0',
                fontSize: '14px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: entry.color,
                  borderRadius: '2px',
                  marginRight: '8px',
                  flexShrink: 0
                }}></div>
                <span style={{ color: themeColors.textSecondary }}>
                  {`${entry.name}: ${value}`}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // 计算总计数据
  const totalData = data.reduce((acc, curr) => {
    acc.requests += curr.requests;
    acc.bytes += curr.bytes;
    acc.threats += curr.threats;
    acc.cachedRequests += curr.cachedRequests;
    return acc;
  }, { requests: 0, bytes: 0, threats: 0, cachedRequests: 0 });

  const cacheRatio = totalData.requests > 0 ? 
    ((totalData.cachedRequests / totalData.requests) * 100).toFixed(1) : 0;

  return (
    <div 
      id={domain.toLowerCase()}
      style={{ 
      background: themeColors.background,
      padding: '24px',
      borderRadius: '12px',
      boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px',
      border: `1px solid ${themeColors.border}`
    }}>
      {/* 头部信息 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            color: themeColors.text,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {domain}
          </h3>
          <p style={{ 
            color: themeColors.textSecondary,
            margin: 0,
            fontSize: '14px'
          }}>
            {t('dataRangeLabel')}: {data.length > 0 ? 
              useHourlyData ? 
                `${new Date(data[0].originalDate).toLocaleString(isZh ? 'zh-CN' : 'en-US')} ${t('to')} ${new Date(data[data.length - 1].originalDate).toLocaleString(isZh ? 'zh-CN' : 'en-US')}` :
                `${data[0].originalDate} ${t('to')} ${data[data.length - 1].originalDate}` 
              : 'N/A'}
          </p>
        </div>
        
        {/* 快速统计 */}
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          fontSize: '12px',
          color: themeColors.textSecondary
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: themeColors.text }}>
              {formatNumber(totalData.requests)}
            </div>
            <div>{t('totalRequestsShort')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: themeColors.text }}>
              {formatBytes(totalData.bytes)}
            </div>
            <div>{t('totalTrafficShort')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#667eea' }}>
              {cacheRatio}%
            </div>
            <div>{t('cacheRatio')}</div>
          </div>
        </div>
      </div>
      
      {/* 图表 */}
      <ResponsiveContainer width="100%" height={350}>
        <LineChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: themeColors.textSecondary }}
            axisLine={{ stroke: themeColors.border }}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 12, fill: themeColors.textSecondary }}
            tickFormatter={formatNumber}
            axisLine={{ stroke: themeColors.border }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12, fill: themeColors.textSecondary }}
            tickFormatter={formatBytes}
            axisLine={{ stroke: themeColors.border }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="requests"
            stroke={themeColors.lineColors.requests}
            strokeWidth={3}
            name={t('requests')}
            connectNulls={false}
            dot={{ fill: themeColors.lineColors.requests, strokeWidth: 2, r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cachedRequests"
            stroke={themeColors.lineColors.cachedRequests}
            strokeWidth={2}
            strokeDasharray="5 5"
            name={t('cachedRequestsChart')}
            connectNulls={false}
            dot={{ fill: themeColors.lineColors.cachedRequests, strokeWidth: 2, r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bytes"
            stroke={themeColors.lineColors.bytes}
            strokeWidth={3}
            name={t('traffic')}
            connectNulls={false}
            dot={{ fill: themeColors.lineColors.bytes, strokeWidth: 2, r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="threats"
            stroke={themeColors.lineColors.threats}
            strokeWidth={2}
            name={t('threats')}
            connectNulls={false}
            dot={{ fill: themeColors.lineColors.threats, strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CFLineChart;