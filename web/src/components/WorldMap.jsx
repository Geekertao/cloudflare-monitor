import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, useMap } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

// 使用本地 GeoJSON 数据源
const GEO_URL = "/world.json";

// 常见国家代码到名称的映射
const countryNameMap = {
  "CN": "China",
  "US": "United States",
  "GB": "United Kingdom",
  "DE": "Germany",
  "FR": "France",
  "JP": "Japan",
  "KR": "South Korea",
  "RU": "Russia",
  "IN": "India",
  "BR": "Brazil",
  "CA": "Canada",
  "AU": "Australia",
  "SG": "Singapore",
  "HK": "Hong Kong",
  "TW": "Taiwan",
  "MY": "Malaysia",
  "TH": "Thailand",
  "VN": "Vietnam",
  "ID": "Indonesia",
  "PH": "Philippines",
  "NL": "Netherlands",
  "IT": "Italy",
  "ES": "Spain",
  "PL": "Poland",
  "UA": "Ukraine",
  "TR": "Turkey",
  "IR": "Iran",
  "ZA": "South Africa",
  "MX": "Mexico",
  "AR": "Argentina",
  "CL": "Chile",
  "CO": "Colombia",
  "PE": "Peru",
  "EG": "Egypt",
  "SA": "Saudi Arabia",
  "AE": "United Arab Emirates",
  "IL": "Israel",
  "SE": "Sweden",
  "NO": "Norway",
  "FI": "Finland",
  "DK": "Denmark",
  "CH": "Switzerland",
  "AT": "Austria",
  "BE": "Belgium",
  "PT": "Portugal",
  "CZ": "Czech Republic",
  "HU": "Hungary",
  "RO": "Romania",
  "GR": "Greece",
  "IE": "Ireland",
  "NZ": "New Zealand"
};

// 缩放控件组件
const ZoomControls = ({ setZoom, setCenter }) => {
  const { isDarkMode } = useTheme();
  
  const buttonStyle = {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#404040' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#333333',
    border: `1px solid ${isDarkMode ? '#505050' : '#e1e1e1'}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    padding: 0,
    outline: 'none'
  };

  return (
    <div style={{
      position: 'absolute',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10
    }}>
      <button 
        style={buttonStyle}
        onClick={() => setZoom(z => Math.min(z * 1.5, 4))}
        title="Zoom In"
      >
        +
      </button>
      <button 
        style={buttonStyle}
        onClick={() => setZoom(z => Math.max(z / 1.5, 1))}
        title="Zoom Out"
      >
        -
      </button>
      <button 
        style={buttonStyle}
        onClick={() => {
          setZoom(1);
          setCenter([0, 0]);
        }}
        title="Reset"
      >
        ⟲
      </button>
    </div>
  );
};

// 颜色图例组件
const Legend = ({ maxRequests, colorScale, formatNumber, isMobile }) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();

  const legendWidth = isMobile ? 120 : 200;
  const legendHeight = 10;
  
  const startColor = colorScale(0);
  const endColor = colorScale(maxRequests);

  return (
    <div style={{
      position: 'absolute',
      left: isMobile ? '10px' : '20px',
      bottom: isMobile ? '10px' : '20px',
      backgroundColor: isDarkMode ? 'rgba(45, 45, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      padding: isMobile ? '8px' : '10px',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#404040' : '#e1e1e1'}`,
      zIndex: 10,
      backdropFilter: 'blur(4px)',
      maxWidth: isMobile ? '140px' : 'auto'
    }}>
      <div style={{ 
        fontSize: isMobile ? '10px' : '12px', 
        marginBottom: '5px', 
        color: isDarkMode ? '#fff' : '#333',
        fontWeight: 'bold'
      }}>
        {t('requests')}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <div style={{
          width: legendWidth,
          height: legendHeight,
          background: `linear-gradient(to right, ${startColor}, ${endColor})`,
          borderRadius: '2px'
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: legendWidth,
        fontSize: isMobile ? '9px' : '10px',
        color: isDarkMode ? '#b0b0b0' : '#666'
      }}>
        <span>0</span>
        <span>{formatNumber(maxRequests)}</span>
      </div>
    </div>
  );
};

const WorldMap = ({ data, formatNumber, formatBytes, isMobile }) => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

  // 预处理数据，转为 Map 方便查找
  const dataMap = useMemo(() => {
    const map = {};
    if (data && Array.isArray(data)) {
      data.forEach(item => {
        // 规范化国家代码
        let code = item.country;
        // 处理特殊情况
        if (code === 'UK') code = 'GB'; // Cloudflare 有时可能返回 UK，标准 ISO 是 GB
        
        map[code] = item;
      });
    }
    return map;
  }, [data]);

  // 计算最大请求数，用于颜色比例尺
  const maxRequests = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(d => d.requests));
  }, [data]);

  // 优化颜色比例尺：使用平方根比例尺，使得低流量国家也能有明显的颜色区分
  // 线性比例尺在数据差异巨大（如第一名远超第二名）时会导致大部分国家颜色过浅
  // 保持与 GeographyStats.jsx 一致的颜色范围，但映射方式改为更平滑的
  const colorScale = useMemo(() => {
    // 线性比例尺作为基础
    return scaleLinear()
      .domain([0, maxRequests > 0 ? maxRequests : 1])
      .range(isDarkMode ? ["#2d2d2d", "#3b82f6"] : ["#f1f5f9", "#2563eb"]);
  }, [maxRequests, isDarkMode]);
  
  // 为了让低流量国家也能显色，我们使用一个更“激进”的颜色计算函数
  // 实际渲染时，如果 requests > 0，即使很小，也给一个基础的可见色
  const getFillColor = (requests) => {
     if (requests === 0 || !requests) return isDarkMode ? "#404040" : "#D6D6DA";
     
     // 如果有请求但量很小，强制给一个最小的蓝色，避免看起来像无数据
     // 使用 log 比例或者简单的阈值判断
     // 这里简单处理：只要有数据，就至少显示一点点蓝色
     const minColorRequest = maxRequests * 0.05; // 假设最小可见度对应 5% 的最大值
     const effectiveRequests = Math.max(requests, minColorRequest);
     return colorScale(effectiveRequests);
  };

  const themeColors = {
    default: isDarkMode ? "#404040" : "#D6D6DA",
    hover: isDarkMode ? "#505050" : "#F53",
    stroke: isDarkMode ? "#1a1a1a" : "#FFFFFF",
    tooltipBg: isDarkMode ? '#2d2d2d' : '#ffffff',
    tooltipText: isDarkMode ? '#ffffff' : '#333333',
    tooltipBorder: isDarkMode ? '#404040' : '#e1e1e1',
  };

  const handleMouseEnter = (geo, current = { x: 0, y: 0 }) => {
    // 获取 ISO Alpha-2 代码，尝试多个字段以提高兼容性
    let isoCode = geo.properties["Alpha-2"] || geo.properties["ISO_A2"] || geo.id;
    
    // 规范化代码
    if (isoCode === 'UK') isoCode = 'GB';

    // Cloudflare 数据直接是 ISO 代码，所以直接匹配
    let stats = dataMap[isoCode];
    
    // 获取显示名称：优先用映射表，否则用 ISO 代码
    const displayName = countryNameMap[isoCode] || geo.properties.name || isoCode || "Unknown";

    if (stats) {
      setTooltipContent({
        name: displayName,
        requests: stats.requests,
        bytes: stats.bytes
      });
    } else {
      setTooltipContent({
        name: displayName,
        requests: 0,
        bytes: 0
      });
    }
  };

  const handleMouseMove = (event) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setTooltipContent('');
  };

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position) => {
    setPosition(position);
  };
  
  const handleReset = () => {
     setPosition({ coordinates: [0, 0], zoom: 1 });
  };

  return (
    <div className="world-map-container" style={{ 
      position: 'relative', 
      width: '100%', 
      height: '400px', // 固定高度，确保在移动端和桌面端都有一致的显示区域
      background: isDarkMode ? '#252525' : '#f8fafc', 
      borderRadius: '8px', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ padding: '1rem 1rem 0', margin: 0, fontSize: '1.1rem', color: isDarkMode ? '#fff' : '#333' }}>{t('trafficDistribution')}</h3>
      
      {/* 颜色图例 */}
      <Legend maxRequests={maxRequests} colorScale={colorScale} formatNumber={formatNumber} isMobile={isMobile} />

      {/* 缩放控件 */}
      <div style={{
          position: 'absolute',
          right: '20px',
          bottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          gap: '5px'
        }}>
          <button 
            onClick={handleZoomIn}
            style={{
              width: '30px', height: '30px', cursor: 'pointer',
              background: isDarkMode ? '#404040' : '#fff',
              color: isDarkMode ? '#fff' : '#333',
              border: `1px solid ${isDarkMode ? '#505050' : '#ccc'}`,
              borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Zoom In"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            style={{
              width: '30px', height: '30px', cursor: 'pointer',
              background: isDarkMode ? '#404040' : '#fff',
              color: isDarkMode ? '#fff' : '#333',
              border: `1px solid ${isDarkMode ? '#505050' : '#ccc'}`,
              borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Zoom Out"
          >
            -
          </button>
           <button 
            onClick={handleReset}
            style={{
              width: '30px', height: '30px', cursor: 'pointer',
              background: isDarkMode ? '#404040' : '#fff',
              color: isDarkMode ? '#fff' : '#333',
              border: `1px solid ${isDarkMode ? '#505050' : '#ccc'}`,
              borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Reset"
          >
            ⟲
          </button>
      </div>

      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        <ComposableMap 
          projection="geoMercator" 
          projectionConfig={{ scale: 140 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup 
            zoom={position.zoom} 
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={10}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // 获取 ISO Alpha-2 代码，尝试多个字段以提高兼容性
                  let isoCode = geo.properties["Alpha-2"] || geo.properties["ISO_A2"] || geo.id;
                  
                  // 规范化代码
                  if (isoCode === 'UK') isoCode = 'GB';

                  // 查找对应数据
                  let stats = dataMap[isoCode];
                  
                  // 计算颜色
                  const fillColor = stats ? getFillColor(stats.requests) : themeColors.default;

                  // 获取显示名称：优先用映射表，否则用 ISO 代码
                  const displayName = countryNameMap[isoCode] || geo.properties.name || isoCode || "Unknown";
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e) => handleMouseEnter(geo)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      fill={fillColor}
                      stroke={themeColors.stroke}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none", transition: "all 250ms" },
                        hover: { fill: themeColors.hover, outline: "none", cursor: "pointer" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      
      {/* 自定义 Tooltip */}
      {tooltipContent && (
        <div style={{
          position: 'fixed',
          top: tooltipPosition.y - 80,
          left: tooltipPosition.x - 60,
          backgroundColor: themeColors.tooltipBg,
          padding: '12px',
          border: `1px solid ${themeColors.tooltipBorder}`,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: '150px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: themeColors.tooltipText }}>
            {tooltipContent.name}
          </p>
          {tooltipContent.requests > 0 ? (
            <>
              <div style={{ fontSize: '12px', color: themeColors.tooltipText, marginBottom: '4px' }}>
                {t('requests')}: {formatNumber(tooltipContent.requests)}
              </div>
              <div style={{ fontSize: '12px', color: themeColors.tooltipText }}>
                {t('bandwidth')}: {formatBytes(tooltipContent.bytes)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#999' }}>
              {t('notInTop5')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorldMap;
