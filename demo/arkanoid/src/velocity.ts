import { EcsMutableComponent } from '@bim/ecs/components';
import { BoxGeometry } from './box-geometry';

export class Velocity extends EcsMutableComponent<{ x: number; y: number }> {
  public invertX() {
    this.set({ ...this.value, x: -this.value.x });
  }

  public invertY() {
    this.set({ ...this.value, y: -this.value.y });
  }

  public applyOnBoxGeometry(boxGeometry: BoxGeometry) {
    boxGeometry.set({
      ...boxGeometry.value,
      x: boxGeometry.value.x + this.value.x,
      y: boxGeometry.value.y + this.value.y,
    });
  }
}
