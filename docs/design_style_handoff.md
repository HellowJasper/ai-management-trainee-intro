# 前端设计风格交接与交付规范文档 (Design Style Handoff)

本文档旨在梳理和定义 **AI 管理培训生介绍系统（AI Management Trainee Intro）** 页面所使用的前端视觉设计系统、CSS 样式令牌（Tokens）、字体排版规范以及交互组件模式。请在开发或优化其他新页面时遵循此规范，以确保整体前端视觉风格的高度一致与完美耦合。

---

## 1. 核心设计概念 (Design Concept)

本系统的 UI 风格采用的是 **未来主义科技感终端（Futuristic Sci-Fi Terminal / Hacker Terminal）** 路线，并结合了 **暗黑玻璃态（Dark Glassmorphism）** 的卡片布局。核心视觉构成如下：
- **纵深与图层空间感 (Depth & Dimension)：** 采用高毛玻璃质感的半透明卡片，悬浮在动态的数字雨背景（Canvas Code Rain）之上。
- **霓虹点缀与高对比度 (Neon Accents)：** 在深邃的虚空背景（Deep Void）中，辅以青蓝色（Cyan）和荧光绿（Lime-green）的高亮与呼吸灯特效。
- **终端细节 (Terminal Details)：** 包含网页边缘的 HUD 数据参数栏、水平扫描线（CRT Scanlines Overlay）、渐变暗角（Vignette Overlay）以及像素艺术风格的英文字体。
- **动态 3D 卡片交互 (3D Card Interaction)：** 鼠标悬停在卡片上时，卡片会产生 3D 偏转、Z 轴抬升以及外发光增强效果。

---

## 2. 色彩系统令牌 (Color System Tokens)

所有的核心色彩均定义在 [styles.css](file:///Users/jasper/Downloads/ai-management-trainee-intro-1.3/styles.css#L17-L38) 的 `:root` 变量中，请直接引用这些 CSS 变量，切勿在其他样式表里硬编码十六进制颜色值：

### 2.1 背景色与面板色 (Backgrounds & Panels)
| CSS 变量名称 | 色值 / 透明度度 | 适用场景 |
| :--- | :--- | :--- |
| `--void` | `#02080e` | 页面最底部的极暗底色。 |
| `--panel` | `rgba(5, 18, 22, 0.82)` | 标准半透明玻璃面板背景（用于卡片、弹窗）。 |
| `--panel-soft` | `rgba(11, 37, 41, 0.72)` | 稍亮的半透明玻璃底色（用于次级子面板）。 |
| `--panel-solid`| `#061419` | 不透明的暗灰蓝色（用于无毛玻璃滤镜时的降级回退处理）。 |

### 2.2 边框与网格分界线 (Borders & Lines)
| CSS 变量名称 | 色值 / 透明度 | 适用场景 |
| :--- | :--- | :--- |
| `--line` | `rgba(103, 255, 213, 0.48)` | 半透明的淡青色边框，用于卡片的静态边框。 |
| `--line-strong`| `rgba(175, 255, 232, 0.78)` | 亮青色边框，用于活动状态、选中状态或聚焦时的边框高亮。 |

### 2.3 字体排版颜色 (Typography Colors)
| CSS 变量名称 | 色值 | 适用场景 |
| :--- | :--- | :--- |
| `--text` | `#eafff8` | 主文字颜色（高亮青白，保证可读性）。 |
| `--text-soft` | `#a7c9c0` | 副标题、描述文字、正文说明（稍低对比度）。 |
| `--muted` | `#6f9088` | 辅助数据、遥测标识、未激活文字、系统时间标签。 |

### 2.4 霓虹发光高亮色 (Neon Accents)
| CSS 变量名称 | 色值 | 适用场景 |
| :--- | :--- | :--- |
| `--neon` | `#28ffc8` | **高亮青蓝**：用于终端日志标签、状态指示灯、卡片悬浮高亮、图标发光。 |
| `--neon-2` | `#a7ff4f` | **荧光绿**：用于重点警示、主要行动按钮（CTA）、关键数据强调。 |
| `--warning` | `#f6ff81` | 柠檬黄：用于次要提示或中等警示标语。 |

---

## 3. 字体与排版系统 (Typography System)

系统字体采用“英文字体偏向复古像素、中文字体偏向现代无衬线”的混搭排版策略：

```css
:root {
  --display: "Impact", "Arial Black", "Noto Sans SC", "PingFang SC", sans-serif;
  --nav-pixel: "Press Start 2P", "Courier New", "SFMono-Regular", "Menlo", "Consolas", monospace;
  --pixel: "Courier New", "SFMono-Regular", "Menlo", "Consolas", monospace;
  --body: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

### 3.1 字体家族及应用场景
1. **`Press Start 2P` (像素英文字体):** 专用于纯英文的小字块标签、HUD 数据读取指示器、按钮上的全大写英文副标题。
2. **`Zpix` (中文像素字体):** 专用于某些需要复古黑客终端质感的中文特殊文字。使用时可以写作：
   `font-family: "Zpix", var(--nav-pixel);`
3. **`Courier New` / Monospace 系统等宽字体 (`--pixel`):** 用于日志输出行、代码行、系统引导步骤日志（Boot lines）。
4. **`Noto Sans SC` / 现代系统黑体 (`--body`):** 用于一般中文字段、主要介绍段落、弹出面板内文本，保证长文本在低对比度暗色背景下的辨识度。

### 3.2 响应式字号规则 (Fluid Sizing)
为了在手机、平板和巨型宽屏显示器上均有出色的排版，**请一律使用 `clamp()` 配合 `vw`（视口宽度）实现流式字号计算**：
- **页面超大标题 (H1/Hero Title)：** `font-size: clamp(32px, 3.6vw, 48px); line-height: 1.15;`
- **卡片/小组件主标题：** `font-size: clamp(24px, 1.8vw, 34px);`
- **主要内容/日志行文本：** `font-size: clamp(14px, 1vw, 17px); line-height: 1.45;`
- **小字说明与遥测字块：** `font-size: clamp(10px, 0.8vw, 13px);`

---

## 4. 暗黑玻璃态卡片组件 (Glassmorphic Cards)

卡片必须具备精细的半透明背景、较深的毛玻璃模糊滤镜（backdrop-filter）和双层微弱外发光阴影。

### 4.1 卡片基础 CSS
```css
.card-glass {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
}
```

### 4.2 卡片顶部霓虹高亮条 (Top-Border Accent)
重要卡片在 Hover 时顶部应当显示颜色发光（如业务场景卡片）：
```css
.card-glass {
  border-top: 2.5px solid transparent; /* 默认隐藏 */
  transition: border-color 300ms ease, box-shadow 300ms ease;
}
.card-glass:hover {
  border-top-color: var(--neon);
  box-shadow:
    0 30px 60px rgba(var(--neon-rgb), 0.08),
    0 16px 40px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 0 35px rgba(var(--neon-rgb), 0.2);
}
```

### 4.3 鼠标悬浮 3D 偏转动效 (3D Perspective Hover)
卡片的父级容器必须设置视距 `.grid-parent { perspective: 1200px; }`。Hover 时卡片向 Z 轴抬升：
```css
.card-glass {
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
}
.card-glass:hover {
  transform: translateZ(10px) translateY(-4px);
}
```
*提示：卡片内部的特定元素（如标题或按钮）可以通过增加 `transform: translateZ(25px)` 样式，使其在视觉上产生独立悬浮于卡片本体之上的高阶视差效果。*

---

## 5. 按钮设计规范 (Button Design Patterns)

按钮绝非传统的平面样式，而是具备立体悬停或流线荧光效果的特色组件：

### 5.1 居中胶囊形主行动按钮 (Centered Capsule CTA)
用于关键性的入口触发（如“MISSION STARTS NOW”）。它具备荧光绿呼吸边框、立体外发光阴影以及垂直堆叠的文字布局：
```css
.btn-capsule {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: min(540px, 100%);
  border: 1px solid rgba(167, 255, 79, 0.42);
  border-radius: 999px;
  padding: clamp(16px, 2.2vw, 20px) clamp(36px, 4.5vw, 52px);
  background: linear-gradient(180deg, rgba(167, 255, 79, 0.15) 0%, rgba(167, 255, 79, 0.04) 100%);
  color: #eafff8;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.35),
    0 0 20px rgba(167, 255, 79, 0.12);
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-capsule:hover {
  background: linear-gradient(180deg, rgba(167, 255, 79, 0.26) 0%, rgba(167, 255, 79, 0.08) 100%);
  border-color: rgba(167, 255, 79, 0.9);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.45),
    0 0 32px rgba(167, 255, 79, 0.28);
  transform: translateY(-2px) scale(1.015);
}
```

### 5.2 斜切角/圆边徽章小按钮 (Secondary Badges)
用于卡片底部的功能交互（如“查看文档 ➔”），Hover 时文字与背景反色，并呈现高亮发光：
```css
.btn-badge {
  font-family: var(--nav-pixel);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.btn-badge:hover {
  color: #0d131a;
  background: var(--neon);
  border-color: var(--neon);
  box-shadow: 0 0 16px rgba(var(--neon-rgb), 0.45);
}
```

---

## 6. HUD 遥测信息栏 (HUD Telemetry)

所有全屏阶段（如 `.welcome-stage`, `.home-stage`, `.landing-stage`）都配备了固定的 HUD 页眉和页脚，将内容框限制在中央，并向屏幕边缘散发科技感：

- **`.welcome-hud` 样式特征：**
  - 使用 `fixed` 或 `absolute` 紧贴屏幕边缘。
  - 使用大写字母以及 `letter-spacing: 0.18em`。
  - 展示诸如 `JOINCARE://START` 或 `STATUS: MANUAL ENTRY` 等技术流数据字符串。

---

## 7. 样式耦合与二次开发建议 (Integration Guidelines)

当您的团队在新界面或子板块中继续编写代码时，请遵循以下开发规范：
1. **单一数据源引用：** 绝对不要直接在各个元素里写死色彩数值，必须调用 `:root` 中的全局变量名称（如 `var(--neon-2)`）。
2. **场景关联属性：** 本系统采用 `.app-shell` 上挂载的 `data-view` 属性来管理页面状态切换。新创建的板块可以通过在根节点添加 `data-view` 判定来执行入场/出场动画。例如：
   ```javascript
   appShell.setAttribute("data-view", "welcome"); // 或者是 "wall", "detail" 等
   ```
3. **设置响应式高度安全防线：** 新增页面组件一定要设置针对窄屏和矮屏的高度调整规则。在样式表底部，务必加入 `@media (max-height: 780px)` 与 `@media (max-width: 980px)`，在矮屏幕下适度缩小 `padding`、`margin` 与 `gap`，防止页面在小设备或缩放视口中发生内容被截断或溢出切出的情况。
