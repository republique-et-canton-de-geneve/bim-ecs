import { EcsMutableComponent } from 'bim-ecs';
import { BoxGeometry } from './box-geometry';

export class Velocity extends EcsMutableComponent<{ x: number; y: number }> {
  public invertX() {
    this.value = { ...this.value, x: -this.value.x };
  }

  public invertY() {
    this.value = { ...this.value, y: -this.value.y };
  }

  public applyOnBoxGeometry(boxGeometry: BoxGeometry) {
    boxGeometry.value = {
      ...boxGeometry.value,
      x: boxGeometry.value.x + this.value.x,
      y: boxGeometry.value.y + this.value.y,
    };
  }
}
