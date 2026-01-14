import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import packageJson from '../../package.json';

const VersionChecker = () => {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [versionInfo, setVersionInfo] = useState({
    current: packageJson.version,
    latest: null,
    hasUpdate: false,
    loading: true,
    error: false
  });

  // 仓库信息 - 请根据实际 GitHub 仓库修改
  const REPO_OWNER = "Geekertao"; 
  const REPO_NAME = "cloudflare-monitor";

  // 定义 API 端点列表，包含官方 API 和代理 API
  const API_ENDPOINTS = [
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    `https://gh.dpik.top/https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    `https://gh.llkk.cc/https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    `https://gh.felicity.ac.cn/https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
  ];

  useEffect(() => {
    // 检查是否有自定义版本号（通过环境变量或全局配置）
    // 如果您不想使用 package.json 的版本，可以在 .env 中设置 REACT_APP_VERSION
    const customVersion = process.env.REACT_APP_VERSION;
    const currentVersion = customVersion || packageJson.version;

    setVersionInfo(prev => ({ ...prev, current: currentVersion }));

    const checkVersion = async () => {
      // 轮询尝试 API
      for (const endpoint of API_ENDPOINTS) {
        try {
          console.log(`Checking version from: ${endpoint}`);
          const response = await axios.get(endpoint, { timeout: 5000 });
          
          if (response.data && response.data.tag_name) {
            const latestVersion = response.data.tag_name.replace(/^v/, '');
            const hasUpdate = compareVersions(latestVersion, currentVersion);
            
            setVersionInfo(prev => ({
              ...prev,
              current: currentVersion,
              latest: latestVersion,
              hasUpdate,
              loading: false,
              htmlUrl: response.data.html_url
            }));
            return; // 成功获取后直接返回
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}`, error.message);
          // 继续尝试下一个
        }
      }

      // 如果所有都失败了
      console.error("All version check endpoints failed");
      setVersionInfo(prev => ({
        ...prev,
        loading: false,
        error: true
      }));
    };

    checkVersion();
  }, []);

  // 版本比较函数：如果 v1 > v2 返回 true
  const compareVersions = (v1, v2) => {
    if (!v1 || !v2) return false;
    
    // 移除可能存在的 'v' 前缀
    const cleanV1 = v1.replace(/^v/, '');
    const cleanV2 = v2.replace(/^v/, '');
    
    if (cleanV1 === cleanV2) return false;

    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return true;
      if (p1 < p2) return false;
    }
    return false;
  };

  const containerStyle = {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: `1px solid ${isDarkMode ? '#404040' : '#e1e1e1'}`,
    fontSize: '13px',
    color: isDarkMode ? '#888' : '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    zIndex: 10
  };

  const badgeStyle = {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center'
  };

  if (versionInfo.loading) {
    return (
      <div style={containerStyle}>
        <span>{t('checkingUpdate')}</span>
      </div>
    );
  }

  if (versionInfo.error) {
    return null; // 出错时不显示，以免干扰界面
  }

  return (
    <div style={containerStyle}>
      <span>{t('currentVersion')}: {versionInfo.current.startsWith('v') ? versionInfo.current : `v${versionInfo.current}`}</span>
      
      {versionInfo.hasUpdate ? (
        <a 
          href={versionInfo.htmlUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            ...badgeStyle,
            backgroundColor: '#ef4444', // 红色
            color: '#fff',
            cursor: 'pointer'
          }}
          title={`v${versionInfo.latest}`}
        >
          {t('newVersionAvailable')} (v{versionInfo.latest})
        </a>
      ) : (
        <span style={{
          ...badgeStyle,
          backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        }}>
          {t('isLatestVersion')}
        </span>
      )}
    </div>
  );
};

export default VersionChecker;
