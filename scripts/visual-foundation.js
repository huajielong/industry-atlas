/**
 * visual-foundation.js — Industry Atlas 视觉基础模块
 *
 * 用途：为 D3.js 产业分析可视化提供统一的视觉基础
 * 使用方式：将此脚本中的函数整合到生成的 HTML 的 <script> 块中
 * 适用模式：L1（全景）、L2（产业链）、L3（板块）、L4（标的）全部通用
 *
 * 依赖：D3.js v7（通过 CDN 加载）
 * 版本：1.0.0
 * 作者：huajielong
 * 协议：MIT
 */

// ============================================================
// 1. 背景点阵纹理 — SVG <defs> 中的 pattern 元素
// ============================================================
/**
 * 生成深空科技风的背景点阵纹理 SVG 代码
 * @param {string} id — pattern 的 ID，默认 'dotPattern'
 * @param {number} spacing — 点间距 px，默认 40
 * @param {number} dotRadius — 点半径 px，默认 1
 * @param {string} dotColor — 点的颜色，默认 'rgba(255,255,255,0.06)'
 * @returns {string} — <pattern> + <rect> 的 SVG 字符串
 *
 * 用法：插入到 SVG <defs> 中
 *    svg.append('defs').html(createDotPattern('bgDots', 50, 1.2, 'rgba(255,255,255,0.05)'))
 *    然后 svg.append('rect').attr('fill', 'url(#bgDots)').attr('width', '100%').attr('height', '100%')
 */
function createDotPattern(id = 'dotPattern', spacing = 40, dotRadius = 1, dotColor = 'rgba(255,255,255,0.06)') {
  return `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
    <circle cx="${spacing/2}" cy="${spacing/2}" r="${dotRadius}" fill="${dotColor}" />
  </pattern>`;
}

// ============================================================
// 2. 标题渐变 Shimmer 动画 CSS
// ============================================================
/**
 * 生成标题的渐变 shimmer 动画 CSS
 * @param {string} color1 — 起始色，默认 '#60A5FA'
 * @param {string} color2 — 结束色，默认 '#A78BFA'
 * @param {number} duration — 动画周期秒数，默认 3
 * @returns {string} — 完整的 CSS 字符串（含 @keyframes）
 *
 * 用法：插入到 HTML <style> 中
 *    计算：根据产业主题选择颜色（参考 SKILL.md 四-标题渐变配色指导）
 *    注入：document.head.appendChild(styleTag) 或在模板字符串中直接使用
 */
function titleShimmerCSS(color1 = '#60A5FA', color2 = '#A78BFA', duration = 3) {
  return `
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .title-shimmer {
      background: linear-gradient(90deg, ${color1} 0%, ${color2} 40%, ${color1} 60%, ${color2} 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer ${duration}s ease-in-out infinite;
    }
  `;
}

// ============================================================
// 3. 响应式适配
// ============================================================
/**
 * 计算图表容器尺寸
 * @param {string|Element} container — 容器选择器或 DOM 元素
 * @param {object} margin — {top, right, bottom, left}
 * @returns {{width: number, height: number, innerW: number, innerH: number}}
 *
 * 用法：const dim = calcDimensions('#chart', {top:60, right:40, bottom:60, left:60})
 *    然后 const svg = d3.select('#chart').append('svg')
 *      .attr('width', dim.width).attr('height', dim.height)
 */
function calcDimensions(container, margin = { top: 60, right: 40, bottom: 60, left: 60 }) {
  const el = typeof container === 'string' ? d3.select(container).node() : container;
  const rect = el.getBoundingClientRect();
  const w = rect.width || window.innerWidth;
  const h = rect.height || window.innerHeight;
  return {
    width: w,
    height: h,
    innerW: w - margin.left - margin.right,
    innerH: h - margin.top - margin.bottom
  };
}

/**
 * 设置窗口 resize 监听自动重绘
 * @param {string|Element} container
 * @param {object} margin
 * @param {function} drawFn — (dimensions) => void，重绘回调
 * @returns {function} — 清理函数（用于组件卸载时移除 listener）
 *
 * 用法：const cleanup = setupResize('#chart', margin, (dim) => drawChart(dim))
 *    注意：drawFn 内部应先 .select('svg').remove() 清除旧 SVG
 */
function setupResize(container, margin = { top: 60, right: 40, bottom: 60, left: 60 }, drawFn) {
  const onResize = () => { drawFn(calcDimensions(container, margin)); };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

// ============================================================
// 4. 工具：生成行业主题的渐变配色
// ============================================================
/**
 * 根据行业主题返回推荐的标题渐变色
 * @param {string} industry — 行业名
 * @returns {{color1: string, color2: string}}
 *
 * 用法：const {color1, color2} = industryGradient('新能源')
 *    然后传给 titleShimmerCSS(color1, color2) 使用
 */
function industryGradient(industry = '') {
  const map = {
    'AI':       ['#60A5FA', '#A78BFA'],
    '科技':     ['#60A5FA', '#A78BFA'],
    '新能源':   ['#34D399', '#FBBF24'],
    '低碳':     ['#34D399', '#FBBF24'],
    '芯片':     ['#F59E0B', '#EF4444'],
    '半导体':   ['#F59E0B', '#EF4444'],
    '生物':     ['#60A5FA', '#34D399'],
    '医药':     ['#60A5FA', '#34D399'],
    '金融':     ['#F59E0B', '#F472B6'],
    '汽车':     ['#F59E0B', '#EF4444'],
    '消费电子': ['#60A5FA', '#F472B6'],
  };
  for (const [key, colors] of Object.entries(map)) {
    if (industry.includes(key)) return { color1: colors[0], color2: colors[1] };
  }
  return { color1: '#60A5FA', color2: '#A78BFA' }; // 默认蓝紫
}
