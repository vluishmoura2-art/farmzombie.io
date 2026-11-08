import { resourceCount } from './harvesting.js';
import { t, materialName } from './i18n.js';
export class ResourceHUD {
  constructor(container, inventory) {
    this.inventory = inventory;
    this.wood = container.querySelector('#wood-count');
    this.stone = container.querySelector('#stone-count');
    this.gold = container.querySelector('#gold-count');
    this.feedback = document.querySelector('#harvest-feedback');
    this.feedbackTime = 0;
    // Keep all HUD pointer interactions separate from canvas harvesting.
    for (const type of ['pointerdown', 'pointerup', 'click']) container.addEventListener(type, (event) => event.stopPropagation());
    this.refresh();
  }
  refresh() {
    if (this.wood.value !== String(resourceCount(this.inventory.wood))) this.wood.value = String(resourceCount(this.inventory.wood));
    if (this.stone.value !== String(resourceCount(this.inventory.stone))) this.stone.value = String(resourceCount(this.inventory.stone));
    if (this.gold && this.gold.value !== String(resourceCount(this.inventory.gold))) this.gold.value = String(resourceCount(this.inventory.gold));
  }
  show(result) {
    if (result.status === 'cooldown') return;
    if (result.status === 'hit') {
      this.refresh();
      this.feedback.textContent = Object.entries(result.rewards).filter(([, amount]) => amount > 0).map(([material, amount]) => t('harvest.gain', { material: materialName(material), amount })).join(' · ');
    } else if (result.status === 'wrong-tool') this.feedback.textContent = t('harvest.wrongTool');
    else if (result.status === 'out-of-range') this.feedback.textContent = t('harvest.tooFar');
    else this.feedback.textContent = t('harvest.nothing');
    this.feedback.hidden = false;
    this.feedbackTime = 2.5;
  }
  update(deltaTime) {
    if (this.feedbackTime <= 0) return;
    this.feedbackTime -= deltaTime;
    if (this.feedbackTime <= 0) this.feedback.hidden = true;
  }
}
