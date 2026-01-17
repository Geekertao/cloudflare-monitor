import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // 从localStorage获取保存的主题设置，默认为浅色模式
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // 0. 优先检查 URL 参数 (?dark 或 ?theme=dark)
        const params = new URLSearchParams(window.location.search);
        if (params.has('dark') || params.get('theme') === 'dark') return true;
        if (params.has('light') || params.get('theme') === 'light') return false;

        const savedTheme = localStorage.getItem('cf-analytics-theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        // 检测系统主题偏好
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // 切换主题
    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newTheme = !prev;
            localStorage.setItem('cf-analytics-theme', newTheme ? 'dark' : 'light');
            return newTheme;
        });
    };

    // 应用主题到document
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark-mode');
            root.classList.remove('light-mode');
        } else {
            root.classList.add('light-mode');
            root.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // 只有在用户没有手动设置过主题时才跟随系统
            const savedTheme = localStorage.getItem('cf-analytics-theme');
            if (!savedTheme) {
                setIsDarkMode(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const value = {
        isDarkMode,
        toggleTheme,
        theme: isDarkMode ? 'dark' : 'light'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;