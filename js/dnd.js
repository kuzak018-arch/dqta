// Drag & drop на pointer events — одинаково для мыши, пальца и пера.
//
// Мышь: перетаскивание начинается, когда курсор сдвинулся на несколько пикселей.
// Палец/перо: нужно коротко удержать плитку. Если палец сразу поехал, это
// обычная прокрутка, и мы её не трогаем.
//
// Плитка-источник помечается атрибутами data-origin/data-index/data-section-id,
// цели — атрибутом data-drop ("slot" | "section" | "trash").

const MOUSE_THRESHOLD = 5;
const TOUCH_DELAY = 220;
const TOUCH_TOLERANCE = 8;
const EDGE = 60;
const MAX_SCROLL_SPEED = 18;
const CLICK_GUARD_MS = 500;

function readOrigin(tile) {
  const zone = tile.dataset.origin || 'catalog';
  if (zone === 'catalog') return { zone };
  return {
    zone,
    index: Number(tile.dataset.index),
    sectionId: tile.dataset.sectionId,
  };
}

// Позиция вставки в секцию: перед первой плиткой, чья середина правее курсора
// в текущем ряду, или перед первой плиткой следующего ряда.
function insertionPoint(container, x, y) {
  const tiles = [...container.children].filter((n) => n.classList.contains('item'));
  for (let i = 0; i < tiles.length; i += 1) {
    const r = tiles[i].getBoundingClientRect();
    if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
      return { index: i, rect: r, side: 'before' };
    }
  }
  const last = tiles[tiles.length - 1];
  return { index: tiles.length, rect: last ? last.getBoundingClientRect() : null, side: 'after' };
}

function edgeSpeed(pos, start, end) {
  const zone = Math.min(EDGE, (end - start) / 4);
  let speed = 0;
  if (pos < start + zone) speed = -((start + zone - pos) / zone);
  else if (pos > end - zone) speed = (pos - (end - zone)) / zone;
  return Math.round(Math.max(-1, Math.min(1, speed)) * MAX_SCROLL_SPEED);
}

export function setupDragAndDrop({ getItem, canDrop, onDrop }) {
  let pending = null;
  let drag = null;
  let suppressClickUntil = 0;

  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';
  indicator.hidden = true;
  document.body.append(indicator);

  function cancelPending() {
    if (pending?.timer) clearTimeout(pending.timer);
    pending = null;
  }

  function begin(x, y) {
    const { tile, pointerId, type } = pending;
    cancelPending();
    const key = tile.dataset.key;
    const item = getItem(key);
    if (!item || !tile.isConnected) return;

    const rect = tile.getBoundingClientRect();
    const ghost = tile.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.removeAttribute('title');
    ghost.removeAttribute('tabindex');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.append(ghost);

    drag = {
      pointerId,
      tile,
      key,
      item,
      origin: readOrigin(tile),
      ghost,
      offsetX: x - rect.left,
      offsetY: y - rect.top,
      x,
      y,
      target: null,
      raf: 0,
    };
    tile.classList.add('is-drag-source');
    document.body.classList.add('is-dragging');
    document.body.dataset.dragKind = item.neutral ? 'neutral' : 'regular';
    if (type !== 'mouse' && navigator.vibrate) navigator.vibrate(12);

    update();
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function describeTarget(zoneEl, x, y) {
    const kind = zoneEl.dataset.drop;
    if (kind === 'slot') {
      const to = { zone: zoneEl.dataset.zone, index: Number(zoneEl.dataset.index) };
      return { el: zoneEl, to, ok: canDrop(drag.key, to) };
    }
    if (kind === 'section') {
      const list = zoneEl.querySelector('.section-items') || zoneEl;
      const point = insertionPoint(list, x, y);
      const to = { zone: 'section', sectionId: zoneEl.dataset.sectionId, index: point.index };
      return { el: zoneEl, to, ok: canDrop(drag.key, to), point };
    }
    if (kind === 'trash' && drag.origin.zone !== 'catalog') {
      return { el: zoneEl, to: { zone: 'trash' }, ok: true };
    }
    return null;
  }

  function showIndicator(target) {
    const point = target?.ok && target.point;
    if (!point || !point.rect) {
      indicator.hidden = true;
      return;
    }
    const r = point.rect;
    const x = point.side === 'before' ? r.left - 4 : r.right + 2;
    indicator.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(r.top)}px, 0)`;
    indicator.style.height = `${r.height}px`;
    indicator.hidden = false;
  }

  function update() {
    const { x, y } = drag;
    drag.ghost.style.transform = `translate3d(${x - drag.offsetX}px, ${y - drag.offsetY}px, 0)`;

    const under = document.elementFromPoint(x, y);
    const zoneEl = under ? under.closest('[data-drop]') : null;
    const target = zoneEl ? describeTarget(zoneEl, x, y) : null;

    if (drag.target?.el !== target?.el) {
      drag.target?.el.classList.remove('is-drop-ok', 'is-drop-bad');
    }
    if (target) {
      target.el.classList.toggle('is-drop-ok', target.ok);
      target.el.classList.toggle('is-drop-bad', !target.ok);
    }
    drag.target = target;
    showIndicator(target);
  }

  // Автопрокрутка страницы и панелей, когда палец/курсор у края.
  function autoScroll() {
    if (!drag) return;
    const { x, y } = drag;
    let moved = false;

    const under = document.elementFromPoint(x, y);
    const panel = under ? under.closest('.panel-scroll') : null;
    if (panel) {
      const r = panel.getBoundingClientRect();
      const dy = edgeSpeed(y, r.top, r.bottom);
      if (dy) {
        const before = panel.scrollTop;
        panel.scrollTop += dy;
        moved = panel.scrollTop !== before;
      }
    }
    const vy = edgeSpeed(y, 0, window.innerHeight);
    if (vy) {
      const before = window.scrollY;
      window.scrollBy(0, vy);
      moved = moved || window.scrollY !== before;
    }
    if (moved) update();
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function end(commit) {
    const finished = drag;
    drag = null;
    cancelAnimationFrame(finished.raf);
    finished.ghost.remove();
    finished.tile.classList.remove('is-drag-source');
    finished.target?.el.classList.remove('is-drop-ok', 'is-drop-bad');
    indicator.hidden = true;
    document.body.classList.remove('is-dragging');
    delete document.body.dataset.dragKind;
    suppressClickUntil = performance.now() + CLICK_GUARD_MS;

    const target = finished.target;
    if (commit && target && target.ok) onDrop(finished.key, finished.origin, target.to);
  }

  document.addEventListener('pointerdown', (event) => {
    suppressClickUntil = 0; // новое нажатие — его click уже настоящий
    if (drag || pending || !event.isPrimary || event.button !== 0) return;
    const tile = event.target.closest('.item');
    if (!tile || tile.classList.contains('drag-ghost')) return;

    pending = {
      tile,
      pointerId: event.pointerId,
      type: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      timer: 0,
    };
    if (event.pointerType === 'mouse') {
      event.preventDefault(); // без выделения текста
    } else {
      pending.timer = setTimeout(() => begin(pending.x, pending.y), TOUCH_DELAY);
    }
  });

  window.addEventListener('pointermove', (event) => {
    if (pending && event.pointerId === pending.pointerId) {
      const dist = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
      if (pending.type === 'mouse') {
        if (dist > MOUSE_THRESHOLD) begin(event.clientX, event.clientY);
      } else if (dist > TOUCH_TOLERANCE) {
        cancelPending(); // палец поехал — это прокрутка
      }
      return;
    }
    if (drag && event.pointerId === drag.pointerId) {
      drag.x = event.clientX;
      drag.y = event.clientY;
      update();
    }
  });

  window.addEventListener('pointerup', (event) => {
    if (pending && event.pointerId === pending.pointerId) cancelPending();
    if (drag && event.pointerId === drag.pointerId) end(true);
  });

  window.addEventListener('pointercancel', (event) => {
    if (pending && event.pointerId === pending.pointerId) cancelPending();
    if (drag && event.pointerId === drag.pointerId) end(false);
  });

  window.addEventListener('keydown', (event) => {
    if (drag && event.key === 'Escape') end(false);
  });

  window.addEventListener('blur', () => {
    cancelPending();
    if (drag) end(false);
  });

  // Пока тащим пальцем, страница не должна прокручиваться сама.
  window.addEventListener('touchmove', (event) => {
    if (drag) event.preventDefault();
  }, { passive: false });

  // Долгое нажатие на телефоне открывает контекстное меню — отключаем его на плитках.
  document.addEventListener('contextmenu', (event) => {
    if (drag || event.target.closest?.('.item')) event.preventDefault();
  });

  // После перетаскивания браузер может прислать click — он не должен удалять
  // предмет. Гасим только один такой click сразу после отпускания.
  document.addEventListener('click', (event) => {
    if (performance.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
}
