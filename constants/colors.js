/**
 * JS 侧颜色常量（与 styles/theme/_palette-default.scss 保持同步）
 * 换肤时优先改 SCSS 色板，再同步更新本文件供 inline style / Canvas 使用
 */
export const G0 = '#f2fcf2';
export const G1 = '#e1fae3';
export const G2 = '#c2f2c8';
export const G3 = '#89e59c';
export const G4 = '#4fd974';
export const G5 = '#25cc5d';
export const INK = '#0f1c14';
export const INK2 = '#3a5244';
export const INK3 = '#6b8c7a';
export const INK4 = '#9bb8a8';
export const RED = '#ff6b6b';
export const RED_BG = '#fff0f0';
export const AMBER = '#f59e0b';
export const AMBER_BG = '#fffbeb';

/** CSS 变量名映射，便于 JS 读取当前主题 */
export const CSS_VAR = {
  g0: '--g0',
  g5: '--g5',
  ink: '--ink',
  red: '--red-soft',
};

export const GLASS_HERO = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.84) 0%, rgba(250,255,252,0.78) 45%, rgba(237,250,240,0.68) 100%)',
  backdropFilter: 'blur(28px) saturate(1.6)',
  border: '1.5px solid rgba(255,255,255,0.95)',
  boxShadow: '0 14px 42px rgba(37,204,93,0.09), 0 3px 12px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.98)',
};

export const GLASS_MID = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(248,255,250,0.68) 40%, rgba(237,248,240,0.60) 100%)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.92)',
  boxShadow: '0 6px 24px rgba(37,204,93,0.08), 0 1px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.96)',
};

export const GLASS_THIN = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.58) 0%, rgba(245,252,247,0.54) 50%, rgba(237,248,240,0.48) 100%)',
  backdropFilter: 'blur(14px) saturate(1.3)',
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 3px 14px rgba(37,204,93,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.94)',
};
