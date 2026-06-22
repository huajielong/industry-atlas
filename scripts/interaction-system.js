/**
 * interaction-system.js — Industry Atlas 交互系统模块
 *
 * 用途：为 D3.js 产业分析可视化提供统一的交互能力
 * 使用方式：读取此脚本，将相关函数内联到生成的 HTML 的 <script> 块中
 * 适用模式：L1（全景）、L2（产业链）、L3（板块）、L4（标的）全部通用
 *
 * 依赖：D3.js v7（通过 CDN 加载）
 * 版本：1.0.0
 * 作者：huajielong
 * 协议：MIT
 */

// ============================================================
// 1. 毛玻璃 Tooltip 工厂
// ============================================================
/**
 * 创建一个统一的毛玻璃 tooltip 实例
 * @param {string} id — tooltip DOM 元素 ID，默认 'glass-tooltip'
 * @returns {{show: Function, hide: Function, move: Function, el: HTMLElement}}
 *
 * 用法：
 *   const tip = createTooltip('my-tooltip');
 *   // 在 mouseover 时：
 *   tip.show(htmlContent, event);
 *   // 在 mousemove 时：
 *   tip.move(event);
 *   // 在 mouseout 时：
 *   tip.hide();
 */
function createTooltip(id = 'glass-tooltip') {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '9999',
      background: 'rgba(7,10,21,0.92)', backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px', padding: '12px 16px',
      color: '#E2E8F0', fontFamily: "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif",
      fontSize: '12px', lineHeight: '1.5',
      opacity: '0', transition: 'opacity 0.2s ease, transform 0.2s ease',
      transform: 'translateY(4px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
      maxWidth: '320px', minWidth: '140px'
    });
    document.body.appendChild(el);
  }

  return {
    el,
    show(html, event) {
      el.innerHTML = html;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      this.move(event);
    },
    hide() {
      el.style.opacity = '0';
      el.style.transform = 'translateY(4px)';
    },
    move(event) {
      const pad = 16;
      let x = event.clientX + pad;
      let y = event.clientY + pad;
      const tw = el.offsetWidth, th = el.offsetHeight;
      if (x + tw > window.innerWidth - pad) x = event.clientX - tw - pad;
      if (y + th > window.innerHeight - pad) y = event.clientY - th - pad;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
  };
}

// ============================================================
// 2. 悬停高亮系统
// ============================================================
/**
 * 设置悬停高亮逻辑：当前节点放大，其余节点变暗，关联节点/连线高亮
 * @param {d3.Selection} svg — SVG 容器
 * @param {object} opts — 配置项
 *   .nodeSelector: string — 节点的 CSS 选择器
 *   .linkSelector: string — 连线的 CSS 选择器
 *   .highlightOpacity: number — 高亮透明度，默认 1
 *   .dimOpacity: number — 变暗透明度，默认 0.15
 *   .getLinkedIds: (d) => string[] — 返回关联节点 ID 数组的函数
 *   .nodeScale: number — 悬停放大倍率，默认 1.12
 *
 * 用法：
 *   setupHighlight(svg, {
 *     nodeSelector: '.bubble',
 *     getLinkedIds: (d) => [d.source?.id, d.target?.id].filter(Boolean)
 *   });
 *   然后在节点上绑定事件：
 *   node.on('mouseenter', (e,d) => highlight(e,d))
 *       .on('mouseleave', unhighlight);
 */
function setupHighlight(svg, opts = {}) {
  const {
    nodeSelector = '.node',
    linkSelector = '.link',
    highlightOpacity = 1,
    dimOpacity = 0.15,
    getLinkedIds = () => [],
    nodeScale = 1.12
  } = opts;

  function highlight(event, d) {
    const linked = new Set(getLinkedIds(d));
    linked.add(d.id || d.index);

    // 变暗非关联节点
    svg.selectAll(nodeSelector)
      .transition().duration(200)
      .attr('opacity', n => linked.has(n.id || n.index) ? highlightOpacity : dimOpacity)
      .attr('transform', n => linked.has(n.id || n.index)
        ? `translate(${n.x || 0},${n.y || 0}) scale(${n === d ? nodeScale : 1})`
        : `translate(${n.x || 0},${n.y || 0})`);

    // 高亮关联连线
    svg.selectAll(linkSelector)
      .transition().duration(200)
      .attr('opacity', l => {
        const sid = typeof l.source === 'object' ? l.source.id || l.source.index : l.source;
        const tid = typeof l.target === 'object' ? l.target.id || l.target.index : l.target;
        return linked.has(sid) || linked.has(tid) ? 0.6 : 0.04;
      });
  }

  function unhighlight() {
    svg.selectAll(nodeSelector)
      .transition().duration(300)
      .attr('opacity', 1)
      .attr('transform', n => `translate(${n.x || 0},${n.y || 0})`);
    svg.selectAll(linkSelector)
      .transition().duration(300)
      .attr('opacity', 0.35);
  }

  return { highlight, unhighlight };
}

// ============================================================
// 3. 力导向图拖拽
// ============================================================
/**
 * 创建 D3 拖拽行为
 * @param {d3.Simulation} simulation — D3 力仿真实例
 * @returns {d3.DragBehavior}
 *
 * 用法：node.call(createDrag(simulation));
 */
function createDrag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    // 2秒后逐渐释放约束
    setTimeout(() => {
      event.subject.fx = null;
      event.subject.fy = null;
    }, 2000);
  }
  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

// ============================================================
// 4. 缩放平移
// ============================================================
/**
 * 设置 D3 缩放/平移行为
 * @param {d3.Selection} svg — SVG 容器
 * @param {d3.Selection} content — 需要缩放的 g 元素
 * @param {object} opts — {minScale, maxScale, zoomStep} 缩放范围
 * @returns {d3.ZoomBehavior}
 *
 * 用法：
 *   const zoom = setupZoom(svg, content, { minScale: 0.3, maxScale: 3 });
 *   或链式调用：svg.call(zoom)
 */
function setupZoom(svg, content, opts = {}) {
  const { minScale = 0.3, maxScale = 3 } = opts;
  const zoom = d3.zoom()
    .scaleExtent([minScale, maxScale])
    .on('zoom', (event) => {
      content.attr('transform', event.transform);
    });
  svg.call(zoom);
  return zoom;
}
