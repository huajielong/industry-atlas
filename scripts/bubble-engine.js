/**
 * bubble-engine.js — Industry Atlas 气泡图核心引擎
 *
 * 用途：为 L3（板块气泡）和 L4（标的公司气泡）提供评分渲染、象限定位、品牌色工具
 * 使用方式：读取此脚本，将相关函数内联到生成的 HTML 的 <script> 块中
 * 适用模式：L3（板块价值气泡）、L4（标的公司气泡）
 *
 * 依赖：D3.js v7（通过 CDN 加载）
 * 版本：1.0.0
 * 作者：huajielong
 * 协议：MIT
 */

// ============================================================
// 1. 评分进度条 HTML
// ============================================================
/**
 * 生成单个评分进度条的 HTML
 * @param {string} label — 评分标签（如 "📈 增长潜力"）
 * @param {number} value — 评分值 0-100
 * @param {number} max — 满分值，默认 100
 * @param {number} barWidth — 进度条宽度 px，默认 80
 * @returns {string} — HTML 字符串
 *
 * 用法：const html = scoreBar('📈 增长潜力', 85, 100, 80)
 *    颜色逻辑：≥70 绿色 #10B981, 45-69 黄色 #F59E0B, <45 红色 #EF4444
 */
function scoreBar(label, value, max = 100, barWidth = 80) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 70 ? '#10B981' : value >= 45 ? '#F59E0B' : '#EF4444';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin:3px 0">
      <span style="font-size:11px;color:#94A3B8;white-space:nowrap;min-width:72px">${label}</span>
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:width 0.6s ease"></div>
      </div>
      <span style="font-size:11px;color:${color};font-weight:500;min-width:32px;text-align:right">${value}</span>
    </div>`;
}

/**
 * 生成完整的 Tooltip 评分内容 HTML
 * @param {object} d — 数据对象 {id, group, growth, profit, moat, desc}
 * @param {string} groupColor — 分组色值
 * @returns {string} — 完整的 tooltip HTML
 *
 * 用法：const html = buildScoreTip(d, '#60A5FA')
 *    tip.show(html, event)
 */
function buildScoreTip(d, groupColor = '#94A3B8') {
  const hasScores = d.growth !== undefined || d.profit !== undefined || d.moat !== undefined;
  return `
    <div style="font-size:14px;font-weight:600;color:#F1F5F9;margin-bottom:2px">${d.id || d.name || ''}</div>
    <div style="font-size:11px;color:${groupColor};margin-bottom:${hasScores ? '8px' : '4px'}">
      ${d.group || d.layer || ''}
    </div>
    ${hasScores ? `
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:6px">
        ${d.growth !== undefined ? scoreBar('📈 增长潜力', d.growth) : ''}
        ${d.profit !== undefined ? scoreBar('💰 盈利能力', d.profit) : ''}
        ${d.moat !== undefined ? scoreBar('🏰 竞争壁垒', d.moat) : ''}
      </div>
    ` : ''}
    ${d.desc ? `<div style="font-size:11px;color:#94A3B8;margin-top:6px;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px">${d.desc}</div>` : ''}
  `;
}

// ============================================================
// 2. 品牌色查找表
// ============================================================
/**
 * 查找公司品牌色
 * @param {string} name — 公司名
 * @returns {string|null} — 品牌色值如 '#76B900'，未找到返回 null
 *
 * 用法：const color = brandColor('NVIDIA') || '#A78BFA'
 *    未覆盖的公司建议使用其分组色的鲜艳色调
 */
function brandColor(name) {
  const brands = {
    // 国际科技巨头
    'NVIDIA': '#76B900', 'AMD': '#ED1C24', 'Intel': '#0071C5',
    'Apple': '#A2AAAD', 'Google': '#4285F4', 'Microsoft': '#00A4EF',
    'Meta': '#1877F2', 'Amazon': '#FF9900', 'Tesla': '#E82127',
    // 半导体/芯片
    '台积电': '#50B74A', 'TSMC': '#50B74A',
    'Samsung': '#1428A0', '三星': '#1428A0',
    'SK海力士': '#00A0E2', 'SK Hynix': '#00A0E2',
    'ASML': '#FF6200', 'ASML': '#FF6200',
    '高通': '#325FBE', 'Qualcomm': '#325FBE',
    '博通': '#E8762D', 'Broadcom': '#E8762D',
    'ARM': '#0091BD',
    // 中国科技/互联网
    '华为': '#CF0A2C', 'Huawei': '#CF0A2C',
    '腾讯': '#07C160', 'Tencent': '#07C160',
    '阿里': '#FF6A00', 'Alibaba': '#FF6A00',
    '百度': '#2932E1', 'Baidu': '#2932E1',
    '小米': '#FF6900', 'Xiaomi': '#FF6900',
    '字节跳动': '#3B82F6', 'ByteDance': '#3B82F6',
    // 中国芯片
    '海光': '#E60012', '海光信息': '#E60012',
    '寒武纪': '#1E90FF', 'Cambricon': '#1E90FF',
    '中芯国际': '#0077B5', 'SMIC': '#0077B5',
    '龙芯': '#C41230', '龙芯中科': '#C41230',
    // 新能源汽车
    '比亚迪': '#4A90D9', 'BYD': '#4A90D9',
    '蔚来': '#000000', 'NIO': '#000000',
    '小鹏': '#12C0E9', 'XPeng': '#12C0E9',
    '理想': '#0098FF', 'Li Auto': '#0098FF',
    '极氪': '#0066FF', 'Zeekr': '#0066FF',
    '鸿蒙智行': '#CF0A2C',
    '塞力斯': '#CF0A2C', '问界': '#CF0A2C',
  };
  return brands[name] || null;
}

// ============================================================
// 3. 象限标签定位
// ============================================================
/**
 * 生成四象限标签的渲染配置
 * @param {number} splitX — X轴分割线，默认 52
 * @param {number} splitY — Y轴分割线，默认 52
 * @param {object} labels — 自定义象限标签（可选）
 *   .topRight {name, subtitle, color} — 右上象限
 *   .topLeft {name, subtitle, color} — 左上象限
 *   .bottomRight — 右下
 *   .bottomLeft — 左下
 * @param {string} mode — 'sector'（板块版）或 'company'（标的版）
 * @returns {Array} — 象限配置数组，每项含 {name, subtitle, color, x, y, anchor}
 *
 * 用法：
 *   const quads = quadrantLabels(52, 52, null, 'sector');
 *   quads.forEach(q => {
 *     svg.append('text')
 *       .attr('x', q.x).attr('y', q.y).attr('text-anchor', q.anchor)
 *       .text(q.name).style('fill', q.color).style('opacity', 0.12)
 *       .style('font-size', '22px').style('font-weight', '700');
 *   });
 */
function quadrantLabels(splitX = 52, splitY = 52, labels = null, mode = 'sector') {
  const defaults = mode === 'company' ? {
    topRight:  { name: '🏆 龙头标的', subtitle: '高增长·高利润·核心持仓首选', color: 'rgba(255,215,0,0.4)' },
    topLeft:   { name: '🚀 潜力新星', subtitle: '高增长·待盈利·长期跟踪',     color: 'rgba(96,165,250,0.25)' },
    bottomRight: { name: '🏦 护城河', subtitle: '稳定盈利·低增长·防守配置', color: 'rgba(52,211,153,0.25)' },
    bottomLeft:  { name: '⏳ 观察区', subtitle: '待验证·需跟踪·谨慎',       color: 'rgba(255,100,100,0.2)' },
  } : {
    topRight:  { name: '🥇 黄金赛道', subtitle: '高增长·高利润·投资首选',   color: 'rgba(255,215,0,0.4)' },
    topLeft:   { name: '🔬 未来之星', subtitle: '高增长·待变现·需耐心',     color: 'rgba(96,165,250,0.25)' },
    bottomRight: { name: '🐄 现金牛', subtitle: '稳定盈利·增长放缓·防守型', color: 'rgba(52,211,153,0.25)' },
    bottomLeft:  { name: '⚰️ 价值陷阱', subtitle: '低增长·低利润·谨慎进入', color: 'rgba(255,100,100,0.2)' },
  };

  const merged = {
    topRight:  { ...defaults.topRight, ...labels?.topRight },
    topLeft:   { ...defaults.topLeft, ...labels?.topLeft },
    bottomRight: { ...defaults.bottomRight, ...labels?.bottomRight },
    bottomLeft:  { ...defaults.bottomLeft, ...labels?.bottomLeft },
  };

  return [
    { ...merged.topRight,      x: 100 - (100 - splitX) / 4, y: 100 - (100 - splitY) / 4, anchor: 'middle' },
    { ...merged.topLeft,       x: splitX / 4,               y: 100 - (100 - splitY) / 4, anchor: 'middle' },
    { ...merged.bottomRight,   x: 100 - (100 - splitX) / 4, y: splitY / 4,               anchor: 'middle' },
    { ...merged.bottomLeft,    x: splitX / 4,               y: splitY / 4,               anchor: 'middle' },
  ];
}

// ============================================================
// 4. 气泡缩放比例尺
// ============================================================
/**
 * 创建气泡面积比例尺
 * @param {number} minR — 最小半径 px，默认 10
 * @param {number} maxR — 最大半径 px，默认 38
 * @returns {d3.ScalePower}
 *
 * 用法：const rScale = bubbleScale(10, 38)
 *    d3.selectAll('.bubble').attr('r', d => rScale(d.moat || 50))
 */
function bubbleScale(minR = 10, maxR = 38) {
  return d3.scaleSqrt().domain([0, 100]).range([minR, maxR]);
}

// ============================================================
// 5. 龙头/黄金赛道判定
// ============================================================
/**
 * 判断是否为龙头标的（高增长+高利润）——用于金色描边
 * @param {number} growth — 增长潜力
 * @param {number} profit — 盈利能力
 * @param {number} threshold — 阈值，默认 60
 * @returns {boolean}
 *
 * 用法：
 *   node.attr('stroke', d => isLeader(d.growth, d.profit) ? '#FFD700' : 'rgba(255,255,255,0.2)')
 *       .attr('stroke-width', d => isLeader(d.growth, d.profit) ? 2.5 : 1.5);
 */
function isLeader(growth = 0, profit = 0, threshold = 60) {
  return growth >= threshold && profit >= threshold;
}
