# Cloudflare Analytics Dashboard

多账户、多 Zone 的 Cloudflare 流量分析仪表盘

**[Demo](https://analytics.geekertao.top)** 

[博客文章教程(含视频部署教程)](https://blog.geekertao.top/posts/cloudflare-analytics)


中文 | [English](./README_EN.md)

## 功能特性

- 支持多个 Cloudflare 账户
- 多 Zone 流量监控
- 实时数据图表展示
- 历史数据分析（支持 1 天、3 天、7 天、30 天）
- 数据精度智能切换：
  - **1 天和 3 天数据**：小时级精度
  - **7 天和 30 天数据**：天级精度
- 多语言支持（中文/英文）
- 地理位置统计（前 5 个国家/地区访问统计）
- 缓存分析和性能监控
- 响应式设计（完美适配桌面端和移动端）

## 技术栈

- 前端：React + Recharts
- 后端：Node.js + Express
- 部署：Docker + Nginx

## 快速开始

### 📋 详细部署方式

现在支持三种部署方式，按优先级排序：

#### 方式 1: Docker Run 命令（单容器部署）

```bash
# 单账户配置
docker run -p 80:80 \
  -e CF_TOKENS="你的Cloudflare_API_Token" \
  -e CF_ZONES="zone_id_1,zone_id_2" \
  -e CF_DOMAINS="example.com,cdn.example.com" \
  -e CF_ACCOUNT_NAME="我的主账户" \
  geekertao/cloudflare-analytics

# 多账户配置
docker run -p 80:80 \
  -e CF_TOKENS_1="token1" \
  -e CF_ZONES_1="zone1,zone2" \
  -e CF_DOMAINS_1="site1.com,site2.com" \
  -e CF_ACCOUNT_NAME_1="账户1" \
  -e CF_TOKENS_2="token2" \
  -e CF_ZONES_2="zone3,zone4" \
  -e CF_DOMAINS_2="site3.com,site4.com" \
  -e CF_ACCOUNT_NAME_2="账户2" \
  geekertao/cloudflare-analytics

# JSON格式配置
docker run -p 80:80 \
  -e CF_CONFIG='{"accounts":[{"name":"主账号","token":"your_token","zones":[{"zone_id":"zone1","domain":"example.com"},{"zone_id":"zone2","domain":"cdn.example.com"}]}]}' \
  geekertao/cloudflare-analytics
```
#### 方式2⚡: Docker-Compose快速部署

如果您想要最快速的部署方式，只需运行以下命令：

```bash
# 创建项目目录
mkdir cloudflare-analytics
cd cloudflare-analytics

# 下载 Docker Compose 配置文件
wget https://raw.githubusercontent.com/Geekertao/cloudflare-analytics/main/docker-compose.yml

# 编辑配置文件（添加您的 Cloudflare Token 和 Zone 信息）
nano docker-compose.yml  # 或使用 vim docker-compose.yml

# 启动服务
sudo docker compose -f docker-compose.yml up -d
```

#### 方式 3: 配置文件（传统方式）

编辑 `server/zones.yml` 文件：

```yaml
accounts:
  - name: "账户名称"
    token: "你的Cloudflare API Token"
    zones:
      - domain: "example.com"
        zone_id: "你的Zone ID"
```

🎯 **部署完成后**：

- 访问 `http://ip:端口` 查看仪表盘
- 确保在 `docker-compose.yml` 中正确配置了您的 Cloudflare API Token 和 Zone 信息
- 首次启动可能需要几分钟来获取数据

### 🚀 本地开发步骤

1. 克隆项目

```bash
git clone https://github.com/Geekertao/cloudflare-analytics.git
cd cloudflare-analytics
```

2. 生成 package-lock.json 文件（重要！）

```bash
# 方法1：手动生成（推荐）
cd web && npm install --package-lock-only && cd ..
cd server && npm install --package-lock-only && cd ..

# 方法2：使用辅助脚本
node generate-lockfiles.js
```

3. 启动服务

```bash
# 使用Docker Compose（推荐）
docker-compose up -d

# 或者直接构建运行
docker build -t cf-analytics .
docker run -p 80:80 \
  -e CF_TOKENS="your_token" \
  -e CF_ZONES="your_zone_id" \
  -e CF_DOMAINS="your_domain" \
  cloudflare-analytics
```

### Cloudflare API Token 配置

要使用此仪表盘，您需要创建一个具有以下权限的 Cloudflare API Token：

1. **Account | Analytics | Read**
2. **Zone | Analytics | Read**
3. **Zone | Zone | Read**

您可以在此处创建 Token：https://dash.cloudflare.com/profile/api-tokens

### 📋 Token 权限 vs 配置的 Zone

**重要说明**：Token 权限和实际配置的 Zone 是两个不同的概念：

#### Token 权限范围

- 您的 Cloudflare API Token 可能有权限访问账户下的**所有 Zone**
- Token 验证时会显示类似：`Token可访问 10 个Zone`
- 这表示您的账户总共有 10 个 Zone，Token 都可以访问

#### 项目配置的 Zone

- 您可以**选择性地配置**需要监控的 Zone
- 例如：只配置 3 个重要的 Zone 进行监控
- 系统会显示：`配置加载成功: 1 个账户 (3 个 zones)`

#### 日志示例

```bash
[Token验证] Token可访问 10 个Zone              # ← Token 权限范围
✓ 账户 Test Token验证成功，可访问 10 个Zone
  ✓ Zone example.top (xxx) 可访问            # ← 配置的具体Zone
  ✓ Zone example.com (xxx) 可访问
  ✓ Zone example.cn (xxx) 可访问

配置加载成功: 1 个账户 (3 个 zones)              # ← 实际监控的Zone数量
```

这种设计的**优势**：

- 🔒 **安全性**：Token 权限验证确保配置的 Zone 都是可访问的
- 🎯 **灵活性**：您可以选择只监控重要的 Zone，避免信息过载
- 📊 **性能**：减少不必要的数据获取，提高系统响应速度
- 🔧 **扩展性**：将来可以轻松添加更多 Zone 到监控列表

### 数据更新频率

- 后端数据更新：**每 2 小时更新一次**
- 数据量控制：
  - 小时级数据：最多 168 个数据点（7 天范围）
  - 天级数据：最多 45 个数据点（45 天范围）

### 环境变量

- `NGINX_PORT`: Nginx 端口 (默认: 80)
- `CF_TOKENS`: Cloudflare API 令牌（每个账户用英文逗号分隔）
- `CF_ZONES`: Zone ID（英文逗号分隔）
- `CF_DOMAINS`: 域名（英文逗号分隔）
- `CF_ACCOUNT_NAME`: 账户显示名称

## 功能概览

### 数据可视化

- **统计卡片**：总请求数、总流量、总威胁数
- **缓存分析**：请求和带宽缓存统计，配有饼状图
- **地理位置统计**：显示当天前 5 个国家/地区的访问量（仅在单日数据视图中显示）
- **流量趋势**：显示小时/天级趋势的折线图

## CI/CD 自动化

本项目使用 GitHub Actions 自动构建并推送 Docker 镜像到 GitHub Container Registry 和 Docker Hub。

**构建触发条件**：

- 推送到 `main` 分支
- 创建 Pull Request
- 手动触发

## 若您 Fork 项目并修改了配置，请确保在 GitHub Secrets 中添加以下密钥，以允许 CI/CD 推送到您的 Docker 仓库。

**所需的 GitHub Secrets**：

- `DOCKERHUB_USERNAME`: Docker Hub 用户名
- `DOCKERHUB_TOKEN`: Docker Hub 访问令牌

## 项目结构

```
├── web/                    # 前端React应用
├── server/                 # 后端API服务
├── .github/workflows/      # GitHub Actions配置
├── dockerfile              # Docker构建配置
├── nginx.conf.template     # Nginx配置模板
└── start.sh               # 容器启动脚本
```
