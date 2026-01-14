import React, { createContext, useContext, useState, useEffect } from 'react';

// 语言配置
const languages = {
    zh: {
        // Dashboard
        dashboardTitle: 'Cloudflare流量分析仪表盘',
        noData: '暂无数据，请检查配置或稍后再试。',

        // Period Selector
        singleDay: '单日数据',
        threeDays: '近3天',
        sevenDays: '近7天',
        thirtyDays: '近30天',

        // Stats Cards
        totalRequests: '总请求数',
        totalTraffic: '总流量',
        totalThreats: '总威胁数',
        activeZones: '活跃Zone数',

        // Cache Stats
        requestCacheStats: '请求缓存统计',
        bandwidthCacheStats: '带宽缓存统计',
        cachedRequests: '已缓存请求',
        uncachedRequests: '未缓存请求',
        cachedBandwidth: '已缓存带宽',
        uncachedBandwidth: '未缓存带宽',

        // Chart
        webTrafficTrends: 'Web 流量趋势',
        account: '账户',
        noZoneData: '该账户暂无Zone数据',
        dataRange: '数据范围',
        totalRequestsShort: '总请求',
        totalTrafficShort: '总流量',
        cacheRatio: '缓存率',
        noHourlyData: '暂无小时级数据或数据格式错误',
        noDailyData: '暂无天级数据或数据格式错误',
        invalidData: '数据格式错误或无有效数据',

        // Chart Labels
        requests: '请求数',
        cachedRequestsChart: '缓存请求数',
        traffic: '流量',
        threats: '威胁数',
        date: '日期',
        time: '时间',
        hour: '小时',
        day: '天',
        dateFormat: '月/日',
        timeFormat: '月/日 时:00',
        dataRangeLabel: '数据范围',
        timeLabel: '时间',
        dateLabel: '日期',
        noHourlyDataFallback: '暂无小时级数据',
        noDailyDataFallback: '暂无天级数据',
        useDailyDataInstead: '使用天级数据代替',
        useDailyDataButton: '使用天级数据显示',
        to: '至',

        // Loading & Error
        loading: '正在加载数据...',
        loadError: '无法加载数据，请确保后端API正在运行并已生成数据文件',
        retry: '重新加载',

        // Footer
        poweredBy: 'Powered by',

        // Language Switch
        language: '语言',
        chinese: '中文',
        english: 'English',

        // Geography Stats
        geographyStats: '地理位置统计',
        topCountriesRegions: '访问量前5的国家和地区',
        requestsByCountry: '各国家/地区请求数量',
        bandwidthByCountry: '各国家/地区带宽使用量',
        trafficByCountry: '各国家/地区流量统计',
        trafficDistribution: '全球流量分布',
        requestDistribution: '请求数分布',
        detailedStats: '详细统计',
        countryRegion: '国家/地区',
        bandwidth: '带宽',
        noGeographyData: '暂无地理位置数据',
        notInTop5: '未进入前5名',

        // 移动端简化标签(保持准确性)
        countryShort: '国家/地区',
        requestsShort: '请求',
        bandwidthShort: '流量',

        // Version Checker
        newVersionAvailable: '发现新版本',
        currentVersion: '当前版本',
        latestVersion: '最新版本',
        updateNow: '立即更新',
        isLatestVersion: '已是最新版本',
        checkError: '检查更新失败',
        checkingUpdate: '正在检查更新...',
        viewChangelog: '查看更新日志',

    },
    en: {
        // Dashboard
        dashboardTitle: 'Cloudflare Traffic Analytics Dashboard',
        noData: 'No Data Available,Please check the configuration or try again later.',

        // Period Selector
        singleDay: '1 Day',
        threeDays: '3 Days',
        sevenDays: '7 Days',
        thirtyDays: '30 Days',

        // Stats Cards
        totalRequests: 'Total Requests',
        totalTraffic: 'Total Traffic',
        totalThreats: 'Total Threats',
        activeZones: 'Active Zones',

        // Cache Stats
        requestCacheStats: 'Request Cache Statistics',
        bandwidthCacheStats: 'Bandwidth Cache Statistics',
        cachedRequests: 'Cached Requests',
        uncachedRequests: 'Uncached Requests',
        cachedBandwidth: 'Cached Bandwidth',
        uncachedBandwidth: 'Uncached Bandwidth',

        // Chart
        webTrafficTrends: 'Web Traffic Trends',
        account: 'Account',
        noZoneData: 'No Zone data available for this account',
        dataRange: 'Data Range',
        totalRequestsShort: 'Total Requests',
        totalTrafficShort: 'Total Traffic',
        cacheRatio: 'Cache Ratio',
        noHourlyData: 'No hourly data available or data format error',
        noDailyData: 'No daily data available or data format error',
        invalidData: 'Data format error or no valid data',

        // Chart Labels
        requests: 'Requests',
        cachedRequestsChart: 'Cached Requests',
        traffic: 'Traffic',
        threats: 'Threats',
        date: 'Date',
        time: 'Time',
        hour: 'Hour',
        day: 'Day',
        dateFormat: 'MM/DD',
        timeFormat: 'MM/DD HH:00',
        dataRangeLabel: 'Data Range',
        timeLabel: 'Time',
        dateLabel: 'Date',
        noHourlyDataFallback: 'No hourly data available',
        noDailyDataFallback: 'No daily data available',
        useDailyDataInstead: '(Use daily data instead)',
        useDailyDataButton: 'Use Daily Data Display',
        to: 'to',

        // Loading & Error
        loading: 'Loading data...',
        loadError: 'Unable to load data. Please ensure the backend API is running and data files are generated',
        retry: 'Retry',

        // Footer
        poweredBy: 'Powered by',

        // Language Switch
        language: 'Language',
        chinese: '中文',
        english: 'English',

        // Geography Stats
        geographyStats: 'Geography Statistics',
        topCountriesRegions: 'Top 5 Countries and Regions by Traffic',
        requestsByCountry: 'Requests by Country/Region',
        bandwidthByCountry: 'Bandwidth by Country/Region',
        trafficByCountry: 'Traffic Statistics by Country/Region',
        trafficDistribution: 'Global Traffic Distribution',
        requestDistribution: 'Request Distribution',
        detailedStats: 'Detailed Statistics',
        countryRegion: 'Country/Region',
        bandwidth: 'Bandwidth',
        noGeographyData: 'No geography data available',
        notInTop5: 'Not in Top 5',

        // Version Checker
        newVersionAvailable: 'New Version Available',
        currentVersion: 'Current',
        latestVersion: 'Latest',
        updateNow: 'Update Now',
        isLatestVersion: 'Latest Version',
        checkError: 'Check Failed',
        checkingUpdate: 'Checking...',
        viewChangelog: 'Changelog',
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        // 1. 优先使用本地存储的用户偏好
        const savedLang = localStorage.getItem('cf-analytics-language');
        if (savedLang) {
            return savedLang;
        }

        // 2. 其次检查环境变量配置 (Docker ENV)
        // 注意：window._env_ 是由 env-config.js 注入的
        if (window._env_ && (String(window._env_.EN).toLowerCase() === 'true')) {
            return 'en';
        }

        // 3. 默认为中文
        return 'zh';
    });

    const switchLanguage = (lang) => {
        setCurrentLanguage(lang);
        localStorage.setItem('cf-analytics-language', lang);
    };

    const t = (key) => {
        return languages[currentLanguage]?.[key] || key;
    };

    useEffect(() => {
        // 更新页面标题
        document.title = currentLanguage === 'zh' ?
            'Cloudflare流量分析仪表盘' :
            'Cloudflare Traffic Analytics Dashboard';
    }, [currentLanguage]);

    return (
        <LanguageContext.Provider value={{
            currentLanguage,
            switchLanguage,
            t,
            isZh: currentLanguage === 'zh',
            isEn: currentLanguage === 'en'
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;