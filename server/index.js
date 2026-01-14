import express from 'express';
import cron from 'node-cron';
import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const OUT = './data/analytics.json';
const PORT = process.env.PORT || 4000;

// i18n helper
const isEn = (process.env.EN || '').toLowerCase() === 'true';
const _ = (zh, en) => isEn ? en : zh;

// 配置加载函数
function loadConfig() {
  // 优先级1: 环境变量配置
  if (process.env.CF_CONFIG) {
    console.log(_('尝试从环境变量 CF_CONFIG 加载...', 'Attempting to load from CF_CONFIG environment variable...'));
    try {
      return JSON.parse(process.env.CF_CONFIG);
    } catch (e) {
      console.error(_('CF_CONFIG 环境变量格式错误:', 'CF_CONFIG environment variable format error:'), e.message);
    }
  }

  // 优先级2: 解析环境变量中的tokens和zones
  const config = { accounts: [] };

  // 支持 CF_TOKENS 和 CF_ZONES 的简写格式
  if (process.env.CF_TOKENS && process.env.CF_ZONES) {
    const tokens = process.env.CF_TOKENS.split(',').map(t => t.trim());
    const zones = process.env.CF_ZONES.split(',').map(z => z.trim());
    const domains = process.env.CF_DOMAINS ? process.env.CF_DOMAINS.split(',').map(d => d.trim()) : zones;

    if (tokens.length > 0 && zones.length > 0) {
      config.accounts.push({
        name: process.env.CF_ACCOUNT_NAME || "默认账户",
        token: tokens[0],
        zones: zones.map((zone_id, index) => ({
          zone_id,
          domain: domains[index] || zone_id
        }))
      });
    }
  }

  // 支持 CF_TOKENS_1, CF_ZONES_1, CF_DOMAINS_1 的多账户格式
  let accountIndex = 1;
  while (process.env[`CF_TOKENS_${accountIndex}`]) {
    const tokens = process.env[`CF_TOKENS_${accountIndex}`].split(',').map(t => t.trim());
    const zones = process.env[`CF_ZONES_${accountIndex}`].split(',').map(z => z.trim());
    const domains = process.env[`CF_DOMAINS_${accountIndex}`] ?
      process.env[`CF_DOMAINS_${accountIndex}`].split(',').map(d => d.trim()) : zones;

    if (tokens.length > 0 && zones.length > 0) {
      config.accounts.push({
        name: process.env[`CF_ACCOUNT_NAME_${accountIndex}`] || `账户${accountIndex}`,
        token: tokens[0],
        zones: zones.map((zone_id, index) => ({
          zone_id,
          domain: domains[index] || zone_id
        }))
      });
    }
    accountIndex++;
  }

  // 优先级3: 配置文件
  if (config.accounts.length === 0) {
    try {
      const fileConfig = yaml.load(fs.readFileSync(new URL('./zones.yml', import.meta.url)));
      return fileConfig;
    } catch (e) {
      console.error(_('无法加载配置文件:', 'Failed to load config file:'), e.message);
    }
  }

  if (config.accounts.length === 0) {
    console.error(_('未找到有效配置，请检查 config.json 或 CF_CONFIG 环境变量', 'No valid config found. Check config.json or CF_CONFIG env var.'));
    process.exit(1);
  }

  return config;
}

// 验证API Token的功能
async function validateToken(token, zoneName) {
  try {
    console.log(_(`[Token验证] 验证Token对Zone ${zoneName}的访问权限...`, `[Token Validation] Validating Token access for Zone ${zoneName}...`));

    // 1. 首先测试基本的API访问
    const testQuery = `
      query {
        viewer {
          zones(limit: 50) {
            zoneTag
          }
        }
      }`;

    const response = await axios.post(
      'https://api.cloudflare.com/client/v4/graphql',
      { query: testQuery },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.error(_(`[Token验证] API访问失败:`, `[Token Validation] API access failed:`), response.data.errors);
      return {
        valid: false,
        error: _('API访问被拒绝', 'API access denied'),
        details: response.data.errors
      };
    }

    if (!response.data.data?.viewer?.zones) {
      console.error(_(`[Token验证] Token无法访问任何Zone`, `[Token Validation] Token cannot access any Zone`));
      return {
        valid: false,
        error: _('Token无Zone访问权限', 'Token has no Zone access')
      };
    }

    const accessibleZones = response.data.data.viewer.zones;
    console.log(_(`[Token验证] Token可访问 ${accessibleZones.length} 个Zone`, `[Token Validation] Token can access ${accessibleZones.length} Zones`));

    return {
      valid: true,
      accessibleZones: accessibleZones.length,
      zones: accessibleZones
    };

  } catch (error) {
    console.error(_(`[Token验证] 验证过程出错:`, `[Token Validation] Validation error:`), error.message);
    if (error.response?.status === 401) {
      return {
        valid: false,
        error: _('Token无效或已过期', 'Token invalid or expired'),
        httpStatus: 401
      };
    }
    if (error.response?.status === 403) {
      return {
        valid: false,
        error: _('Token权限不足', 'Insufficient Token permissions'),
        httpStatus: 403
      };
    }
    return {
      valid: false,
      error: error.message,
      httpStatus: error.response?.status
    };
  }
}

// 获取Zone信息的函数
async function getZoneInfo(token, zoneId) {
  try {
    const query = `
      query($zoneId: String!) {
        viewer {
          zones(filter: {zoneTag: $zoneId}) {
            zoneTag
          }
        }
      }`;

    const response = await axios.post(
      'https://api.cloudflare.com/client/v4/graphql',
      { query, variables: { zoneId } },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.error(_(`[Zone信息] Zone ${zoneId} 查询失败:`, `[Zone Info] Zone ${zoneId} query failed:`), response.data.errors);
      return null;
    }

    const zones = response.data.data?.viewer?.zones;
    if (!zones || zones.length === 0) {
      console.error(_(`[Zone信息] Zone ${zoneId} 不存在或无访问权限`, `[Zone Info] Zone ${zoneId} does not exist or no access`));
      return null;
    }

    return zones[0];
  } catch (error) {
    console.error(_(`[Zone信息] 查询Zone ${zoneId} 出错:`, `[Zone Info] Error querying Zone ${zoneId}:`), error.message);
    return null;
  }
}

const CFG = loadConfig();

// 验证所有配置的Token
async function validateAllTokens() {
  console.log(_(`[Token验证] 开始验证 ${CFG.accounts.length} 个账户的Token...`, `[Token Validation] Starting validation for ${CFG.accounts.length} accounts...`));

  for (const [index, account] of CFG.accounts.entries()) {
    console.log(_(`\n[Token验证] 验证账户 ${index + 1}: ${account.name}`, `\n[Token Validation] Validating Account ${index + 1}: ${account.name}`));
    const validation = await validateToken(account.token, account.name);

    if (!validation.valid) {
      console.error(_(`⚠️ [错误] 账户 ${account.name} Token验证失败:`, `⚠️ [Error] Account ${account.name} Token validation failed:`), validation.error);
      if (validation.httpStatus === 401) {
        console.error(_(`ℹ️ 请检查:`, `ℹ️ Please check:`));
        console.error(_(`   1. Token是否正确（不包含多余空格或特殊字符）`, `   1. Is Token correct (no extra spaces/chars)`));
        console.error(_(`   2. Token是否已过期`, `   2. Is Token expired`));
        console.error(_(`   3. Token是否具有 'Analytics:Read' 权限`, `   3. Does Token have 'Analytics:Read' permission`));
        console.error(_(`   4. Token是否具有正确的Zone访问权限`, `   4. Does Token have correct Zone access`));
      }
    } else {
      console.log(_(`✓ 账户 ${account.name} Token验证成功，可访问 ${validation.accessibleZones} 个Zone`, `✓ Account ${account.name} Token validated, can access ${validation.accessibleZones} Zones`));

      // 验证具体的Zone访问权限
      for (const zone of account.zones) {
        const zoneInfo = await getZoneInfo(account.token, zone.zone_id);
        if (zoneInfo) {
          console.log(_(`  ✓ Zone ${zone.domain} (${zone.zone_id}) 可访问`, `  ✓ Zone ${zone.domain} (${zone.zone_id}) accessible`));
        } else {
          console.error(_(`  ✗ Zone ${zone.domain} (${zone.zone_id}) 不可访问`, `  ✗ Zone ${zone.domain} (${zone.zone_id}) inaccessible`));
        }
      }
    }
  }
  console.log(_(`\n[Token验证] 验证完成\n`, `\n[Token Validation] Validation completed\n`));
}

// 抓取数据 & 写文件
async function updateData() {
  try {
    console.log(_(`[数据更新] 开始更新数据... ${new Date().toLocaleString()}`, `[Data Update] Starting data update... ${new Date().toLocaleString()}`));

    // 在第一次更新时验证Token
    if (!updateData.tokenValidated) {
      await validateAllTokens();
      updateData.tokenValidated = true;
    }

    const payload = { accounts: [] };

    for (const [accIndex, acc] of CFG.accounts.entries()) {
      console.log(_(`  处理账户 ${accIndex + 1}/${CFG.accounts.length}: ${acc.name}`, `  Processing Account ${accIndex + 1}/${CFG.accounts.length}: ${acc.name}`));
      const accData = { name: acc.name, zones: [] };

      for (const [zoneIndex, z] of acc.zones.entries()) {
        try {
          console.log(_(`    处理 Zone ${zoneIndex + 1}/${acc.zones.length}: ${z.domain}`, `    Processing Zone ${zoneIndex + 1}/${acc.zones.length}: ${z.domain}`));

          // 获取天级数据（用于7天和30天显示）
          const daysSince = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 45天前
          const daysUntil = new Date().toISOString().slice(0, 10); // 今天

          console.log(_(`    查询天级数据时间范围: ${daysSince} 到 ${daysUntil}`, `    Querying daily data range: ${daysSince} to ${daysUntil}`));

          const daysQuery = `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 100
                    orderBy: [date_DESC]
                  ) {
                    dimensions {
                      date
                    }
                    sum {
                      requests
                      bytes
                      threats
                      cachedRequests
                      cachedBytes
                    }
                  }
                }
              }
            }`;

          // 获取小时级数据（用于1天和3天显示，限制在3天内）
          const hoursSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3天前
          const hoursUntil = new Date().toISOString(); // 现在

          /* ====== FORK用户专用功能：从今天00点开始的单日数据 ======
           * 如果您希望单日数据从今天00点开始显示而不是最近24小时，
           * 请取消注释下面的代码块，并注释掉上面的默认代码。
           * 
           * 注意：这将改变单日数据的显示方式，从“过去24小时”改为“今天从00:00开始”
           * 同时需要在前端相应地修改数据处理逻辑。
           */
          /*
          // 获取小时级数据 - 自定义版本：从今天00点开始
          const now = new Date();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0); // 今天00:00:00
          
          // 为了获取足够的历史数据，仍然获取最近3天
          const hoursStartDate = new Date(todayStart);
          hoursStartDate.setDate(hoursStartDate.getDate() - 2); // 从3天前开始获取

          const hoursSince = hoursStartDate.toISOString();
          const hoursUntil = now.toISOString();
          
          console.log(`    查询小时级数据时间范围（今天00点模式）: ${hoursSince} 到 ${hoursUntil}`);
          console.log(`    今天开始时间: ${todayStart.toISOString()}`);
          */

          console.log(_(`    查询小时级数据时间范围: ${hoursSince} 到 ${hoursUntil}`, `    Querying hourly data range: ${hoursSince} to ${hoursUntil}`));

          const hoursQuery = `
            query($zone: String!, $since: Time!, $until: Time!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1hGroups(
                    filter: {datetime_geq: $since, datetime_leq: $until}
                    limit: 200
                    orderBy: [datetime_DESC]
                  ) {
                    dimensions {
                      datetime
                    }
                    sum {
                      requests
                      bytes
                      threats
                      cachedRequests
                      cachedBytes
                    }
                  }
                }
              }
            }`;

          // 获取地理位置数据（仅今天，遵循API时间范围限制）
          const today = new Date().toISOString().slice(0, 10); // 今天日期
          const geoSince = today; // 从今天开始
          const geoUntil = today; // 到今天结束

          console.log(_(`    查询地理位置数据时间范围: ${geoSince} 到 ${geoUntil}`, `    Querying geography data range: ${geoSince} to ${geoUntil}`));

          const geoQuery = `
            query($zone: String!, $since: Date!, $until: Date!) {
              viewer {
                zones(filter: {zoneTag: $zone}) {
                  httpRequests1dGroups(
                    filter: {date_geq: $since, date_leq: $until}
                    limit: 100
                    orderBy: [date_DESC]
                  ) {
                    dimensions {
                      date
                    }
                    sum {
                      countryMap {
                        bytes
                        requests
                        threats
                        clientCountryName
                      }
                    }
                  }
                }
              }
            }`;

          // 并行获取天级、小时级和地理位置数据
          const [daysRes, hoursRes, geoRes] = await Promise.all([
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: daysQuery, variables: { zone: z.zone_id, since: daysSince, until: daysUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            ),
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: hoursQuery, variables: { zone: z.zone_id, since: hoursSince, until: hoursUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            ),
            axios.post(
              'https://api.cloudflare.com/client/v4/graphql',
              { query: geoQuery, variables: { zone: z.zone_id, since: geoSince, until: geoUntil } },
              {
                headers: {
                  'Authorization': `Bearer ${acc.token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            )
          ]);

          const zoneData = { domain: z.domain, raw: [], rawHours: [], geography: [] };

          // 处理天级数据
          if (daysRes.data.errors) {
            console.error(_(`    Zone ${z.domain} 天级数据API错误:`, `    Zone ${z.domain} Daily Data API Error:`), daysRes.data.errors);
            zoneData.error = daysRes.data.errors[0]?.message || _('天级数据API请求失败', 'Daily Data API request failed');
          } else if (daysRes.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
            const rawData = daysRes.data.data.viewer.zones[0].httpRequests1dGroups;
            console.log(_(`    Zone ${z.domain} 天级数据获取成功: ${rawData.length} 条记录`, `    Zone ${z.domain} Daily Data retrieved: ${rawData.length} records`));
            zoneData.raw = rawData;

            if (rawData.length > 0) {
              const latestDates = rawData.slice(0, 3).map(d => d.dimensions.date);
              console.log(_(`    最新天级数据日期: ${latestDates.join(', ')}`, `    Latest daily data dates: ${latestDates.join(', ')}`));
            }
          }

          // 处理小时级数据
          if (hoursRes.data.errors) {
            console.error(_(`    Zone ${z.domain} 小时级数据API错误:`, `    Zone ${z.domain} Hourly Data API Error:`), hoursRes.data.errors);
            if (!zoneData.error) {
              zoneData.error = hoursRes.data.errors[0]?.message || _('小时级数据API请求失败', 'Hourly Data API request failed');
            }
          } else if (hoursRes.data.data?.viewer?.zones?.[0]?.httpRequests1hGroups) {
            const rawHoursData = hoursRes.data.data.viewer.zones[0].httpRequests1hGroups;
            console.log(_(`    Zone ${z.domain} 小时级数据获取成功: ${rawHoursData.length} 条记录`, `    Zone ${z.domain} Hourly Data retrieved: ${rawHoursData.length} records`));
            zoneData.rawHours = rawHoursData;

            if (rawHoursData.length > 0) {
              const latestHours = rawHoursData.slice(0, 3).map(d => d.dimensions.datetime);
              console.log(_(`    最新小时级数据时间: ${latestHours.join(', ')}`, `    Latest hourly data times: ${latestHours.join(', ')}`));
            }
          }

          // 处理地理位置数据
          if (geoRes.data.errors) {
            console.error(_(`    Zone ${z.domain} 地理位置数据API错误:`, `    Zone ${z.domain} Geography Data API Error:`), geoRes.data.errors);
            if (!zoneData.error) {
              zoneData.error = geoRes.data.errors[0]?.message || _('地理位置数据API请求失败', 'Geography Data API request failed');
            }
          } else if (geoRes.data.data?.viewer?.zones?.[0]?.httpRequests1dGroups) {
            const rawGeoData = geoRes.data.data.viewer.zones[0].httpRequests1dGroups;
            console.log(_(`    Zone ${z.domain} 地理位置数据获取成功: ${rawGeoData.length} 条记录`, `    Zone ${z.domain} Geography Data retrieved: ${rawGeoData.length} records`));

            // 聚合地理位置数据（按国家汇总今日数据）
            const countryStats = {};
            rawGeoData.forEach(record => {
              // 处理countryMap数组，每个记录可能包含多个国家的数据
              if (record.sum?.countryMap && Array.isArray(record.sum.countryMap)) {
                record.sum.countryMap.forEach(countryData => {
                  const country = countryData.clientCountryName;
                  if (country && country !== 'Unknown' && country !== '') {
                    if (!countryStats[country]) {
                      countryStats[country] = {
                        dimensions: { clientCountryName: country },
                        sum: { requests: 0, bytes: 0, threats: 0 }
                      };
                    }
                    // 使用countryMap中的实际数据
                    countryStats[country].sum.requests += countryData.requests || 0;
                    countryStats[country].sum.bytes += countryData.bytes || 0;
                    countryStats[country].sum.threats += countryData.threats || 0;
                  }
                });
              }
            });

            // 转换为数组并排序
            zoneData.geography = Object.values(countryStats)
              .sort((a, b) => b.sum.requests - a.sum.requests)
              .slice(0, 15); // 只保留前15个国家

            if (zoneData.geography.length > 0) {
              const topCountries = zoneData.geography.slice(0, 5).map(d =>
                `${d.dimensions.clientCountryName}: ${d.sum.requests}`);
              console.log(_(`    前5个国家/地区: ${topCountries.join(', ')}`, `    Top 5 Countries: ${topCountries.join(', ')}`));
            }
          }

          accData.zones.push(zoneData);
        } catch (error) {
          console.error(_(`    Zone ${z.domain} 处理失败:`, `    Zone ${z.domain} Processing Failed:`), error.message);
          accData.zones.push({
            domain: z.domain,
            raw: [],
            rawHours: [],
            geography: [],
            error: error.message
          });
        }
      }
      payload.accounts.push(accData);
    }

    await fs.mkdir('./data', { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(payload, null, 2));
    console.log(_(`[数据更新] 数据更新完成: ${payload.accounts.length} 个账户`, `[Data Update] Data update completed: ${payload.accounts.length} accounts`));
  } catch (error) {
    console.error(_('[数据更新] 全局错误:', '[Data Update] Global Error:'), error.message);
  }
}
await updateData();
cron.schedule('0 */2 * * *', updateData);

const app = express();

// 添加CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 静态文件服务
app.use('/data', express.static('./data', {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API状态接口
app.get('/api/status', (req, res) => {
  const dataExists = require('fs').existsSync('./data/analytics.json');
  res.json({
    status: 'running',
    dataExists,
    accounts: CFG.accounts.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(_(`服务运行在端口 ${PORT}`, `Server running on port ${PORT}`));
  console.log(_(`环境: ${process.env.NODE_ENV || 'development'}`, `Environment: ${process.env.NODE_ENV || 'development'}`));
  console.log(_(`语言: ${isEn ? 'English' : '中文'}`, `Language: ${isEn ? 'English' : 'Chinese'}`));

  console.log(_(`配置加载成功: ${CFG.accounts.length} 个账户`, `Config loaded: ${CFG.accounts.length} accounts`));
  CFG.accounts.forEach((acc, index) => {
    console.log(_(`  账户 ${index + 1}: ${acc.name} (${acc.zones.length} 个 zones)`, `  Account ${index + 1}: ${acc.name} (${acc.zones.length} zones)`));
  });

  // 立即执行一次
  updateData();
});