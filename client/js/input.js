const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const EQUIPMENT_CODES = new Map([['Digit1', 0], ['Digit2', 1], ['Numpad1', 0], ['Numpad2', 1]]);

export class Input {
  constructor(target = window, pointerSurface = null) {
    this.keys = new Set();
    this.x = 0;
    this.y = 0;
    this.target = target;
    this.pointerSurface = pointerSurface;
    this.pointerClientX = 0;
    this.pointerClientY = 0;
    this.pointerX = 0;
    this.pointerY = 0;
    this.hasPointer = false;
    this.onSelectEquipment = null;
    this.onShortcut = null;
    this.onHarvest = null;
    this.onKeyDown = (event) => this.handleKey(event, true);
    this.onKeyUp = (event) => this.handleKey(event, false);
    this.onBlur = () => this.clear();
    this.onPointerMove = (event) => {
      if (event.pointerType === 'touch' && event.target !== this.pointerSurface) return;
      this.pointerClientX = event.clientX;
      this.pointerClientY = event.clientY;
      this.hasPointer = true;
      this.refreshPointer();
    };
    this.onCanvasClick = (event) => {
      if (event.button !== 0) return;
      if (this.skipNextClick) { this.skipNextClick = false; return; }
      this.onPointerMove(event);
      this.onHarvest?.(this.pointerX, this.pointerY);
    };
    target.addEventListener('keydown', this.onKeyDown, { capture: true });
    target.addEventListener('keyup', this.onKeyUp, { capture: true });
    target.addEventListener('blur', this.onBlur);
    target.addEventListener('pointermove', this.onPointerMove);
    pointerSurface?.addEventListener('click', this.onCanvasClick);
  }

  refreshPointer() {
    if (!this.hasPointer) return;
    const rect = this.pointerSurface?.getBoundingClientRect();
    this.pointerX = this.pointerClientX - (rect?.left || 0);
    this.pointerY = this.pointerClientY - (rect?.top || 0);
  }

  handleKey(event, down) {
    const tag = event.target?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target?.isContentEditable || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
      if (!down) { this.keys.delete(event.code); this.recomputeMovement(); }
      return;
    }
    if (!MOVEMENT_CODES.has(event.code)) {
      const slot = /^(Digit|Numpad)([0-9])$/.exec(event.code);
      const action = slot ? 'slot' : ({KeyE:'auto',KeyQ:'equipment',KeyB:'shop',Escape:'escape',KeyR:'rotate'})[event.code];
      if (!action) return;
      event.preventDefault();
      if (down && !event.repeat) {
        if (this.onShortcut) this.onShortcut(action, slot ? Number(slot[2]) : null);
        else if (EQUIPMENT_CODES.has(event.code)) this.onSelectEquipment?.(EQUIPMENT_CODES.get(event.code));
      }
      return;
    }
    event.preventDefault();
    if (down) this.keys.add(event.code);
    else this.keys.delete(event.code);
    this.recomputeMovement();
  }

  recomputeMovement() {
    this.x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    this.y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
  }

  clear() {
    this.keys.clear();
    this.x = 0;
    this.y = 0;
  }

  destroy() {
    this.target.removeEventListener('keydown', this.onKeyDown, { capture: true });
    this.target.removeEventListener('keyup', this.onKeyUp, { capture: true });
    this.target.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.pointerSurface?.removeEventListener('click', this.onCanvasClick);
    this.clear();
  }
}
