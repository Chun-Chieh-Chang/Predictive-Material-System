/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useLongPressDragScroll.ts
 * 長按左鍵拖動頁面捲動 hook（主檔寬表適用）
 * - 按住 300ms 後進入拖動模式，跟隨滑鼠平滑捲動，鬆開退出
 * - 僅在空白區域觸發：排除 button/input/select/textarea/a/label 與標記 data-no-drag 之元素
 * - rAF 節流確保 60fps；拖動中隱藏 scrollbar 防閃爍；鬆手帶慣性衰減滾動
 */
import { useRef, useEffect, useCallback } from 'react';

const LONG_PRESS_MS = 300;
const INERTIA_FRICTION = 0.94;      // 慣性衰減係數（每幀速度 × 0.94）
const INERTIA_STOP_V = 0.35;        // 低於此速度 px/frame 視為停止

interface DragState {
  timer: number | null;
  active: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  velX: number;
  velY: number;
  rafId: number | null;
  inertiaRafId: number | null;
  container: HTMLElement | null;
  prevCursor: string;
  prevUserSelect: string;
}

export function useLongPressDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const s = useRef<DragState>({
    timer: null,
    active: false,
    startX: 0, startY: 0, lastX: 0, lastY: 0,
    velX: 0, velY: 0,
    rafId: null,
    inertiaRafId: null,
    container: null,
    prevCursor: '',
    prevUserSelect: '',
  });

  const isInteractive = (el: EventTarget | null): boolean => {
    if (!(el instanceof Element)) return true; // 無法判定時視為可交互，保守不觸發
    return !!el.closest('button, a, input, select, textarea, label, [role="button"], [contenteditable="true"], [data-no-drag]');
  };

  const stopInertia = useCallback(() => {
    const st = s.current;
    if (st.inertiaRafId !== null) {
      cancelAnimationFrame(st.inertiaRafId);
      st.inertiaRafId = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    const st = s.current;
    if (st.timer !== null) {
      clearTimeout(st.timer);
      st.timer = null;
    }
    if (st.rafId !== null) {
      cancelAnimationFrame(st.rafId);
      st.rafId = null;
    }
    if (!st.active) return;
    st.active = false;

    const el = st.container;
    if (el) {
      el.style.cursor = st.prevCursor;
      el.style.userSelect = st.prevUserSelect;
      el.classList.remove('drag-scrolling');
      // 慣性滾動：以最後幀速度衰減
      const applyInertia = () => {
        st.velX *= INERTIA_FRICTION;
        st.velY *= INERTIA_FRICTION;
        if (Math.abs(st.velX) < INERTIA_STOP_V && Math.abs(st.velY) < INERTIA_STOP_V) {
          st.inertiaRafId = null;
          return;
        }
        el.scrollLeft -= st.velX;
        el.scrollTop -= st.velY;
        st.inertiaRafId = requestAnimationFrame(applyInertia);
      };
      stopInertia();
      if (Math.abs(st.velX) >= INERTIA_STOP_V || Math.abs(st.velY) >= INERTIA_STOP_V) {
        st.inertiaRafId = requestAnimationFrame(applyInertia);
      }
    }
    st.container = null;
  }, [stopInertia]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = s.current;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      if (isInteractive(e.target)) return;
      stopInertia(); // 新的長按會接手中斷慣性
      st.container = el;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.velX = 0;
      st.velY = 0;
      st.timer = window.setTimeout(() => {
        st.active = true;
        st.prevCursor = el.style.cursor;
        st.prevUserSelect = el.style.userSelect;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
        el.classList.add('drag-scrolling'); // CSS 隱藏 scrollbar 防閃爍
      }, LONG_PRESS_MS);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (st.timer !== null && !st.active) {
        // 尚未啟動即移動超過死區 → 取消長按（視為一般拖選/誤觸）
        if (Math.abs(e.clientX - st.startX) > 6 || Math.abs(e.clientY - st.startY) > 6) {
          clearTimeout(st.timer);
          st.timer = null;
          st.container = null;
        }
        return;
      }
      if (!st.active) return;
      // rAF 節流：每幀最多消費一次移動事件，穩定 60fps
      if (st.rafId !== null) return;
      const cx = e.clientX;
      const cy = e.clientY;
      st.rafId = requestAnimationFrame(() => {
        st.rafId = null;
        if (!st.active || !st.container) return;
        const dx = cx - st.lastX;
        const dy = cy - st.lastY;
        st.lastX = cx;
        st.lastY = cy;
        st.velX = dx;
        st.velY = dy;
        st.container.scrollLeft -= dx;
        st.container.scrollTop -= dy;
      });
    };

    const onPointerUp = () => endDrag();
    const onPointerLeave = () => { if (st.active) endDrag(); };
    const onWheel = () => stopInertia(); // 滾輪介入時停止慣性，避免打架

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('wheel', onWheel);
      endDrag(); // unmount 清理
    };
  }, [endDrag, stopInertia]);

  return ref;
}
