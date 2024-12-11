import { Config } from './config';
import { EcsMutableComponent } from 'bim-ecs/components';

/*
scene coordinates :
0 --------> x
|
|
y

 */

interface Box {
  /** X coordinate (at the center of the box) */
  x: number;
  /** Y coordinate (at the center of the box) */
  y: number;
  /** width of the box */
  width: number;
  /** Height of the box */
  height: number;
}

export class BoxGeometry extends EcsMutableComponent<Box> {
  static createFromIndices(
    indices: { column: number; row: number },
    config: Pick<Config, 'width' | 'height' | 'columns' | 'rows'>,
  ) {
    const { column, row } = indices;
    const { width, height, columns, rows } = config;

    // Calculate box dimensions
    const boxWidth = width / columns;
    const boxHeight = height / rows;

    // Calculate box position
    const x = column * boxWidth + boxWidth * 0.5;
    const y = row * boxHeight + boxHeight * 0.5;

    // Return a new BoxGeometry instance
    return new BoxGeometry({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
    });
  }

  /**
   * Determines whether current instance is colliding with another one
   * @param boxGeometry
   */
  public isCollidingWith(boxGeometry: BoxGeometry): 'left' | 'right' | 'top' | 'bottom' | false {
    const thisBox = this.value;
    const otherBox = boxGeometry.value;

    // Convert center-based coordinates to edges
    const thisEdges = {
      left: thisBox.x - thisBox.width / 2,
      right: thisBox.x + thisBox.width / 2,
      top: thisBox.y - thisBox.height / 2,
      bottom: thisBox.y + thisBox.height / 2,
    };

    const otherEdges = {
      left: otherBox.x - otherBox.width / 2,
      right: otherBox.x + otherBox.width / 2,
      top: otherBox.y - otherBox.height / 2,
      bottom: otherBox.y + otherBox.height / 2,
    };

    // Determine if the boxes overlap
    const willOverlap =
      thisEdges.left < otherEdges.right &&
      thisEdges.right > otherEdges.left &&
      thisEdges.top < otherEdges.bottom &&
      thisEdges.bottom > otherEdges.top;

    if (!willOverlap) return false;

    const horizontalPenetration =
      otherBox.x < thisBox.x
        ? { border: 'left' as const, value: otherBox.x + otherBox.width * 0.5 - (thisBox.x - thisBox.width * 0.5) } // from left
        : { border: 'right' as const, value: thisBox.x + thisBox.width * 0.5 - (otherBox.x - otherBox.width * 0.5) }; // from right

    const verticalPenetration =
      otherBox.y < thisBox.y
        ? { border: 'top' as const, value: otherBox.y + otherBox.height * 0.5 - (thisBox.y - thisBox.height * 0.5) } // from top
        : { border: 'bottom' as const, value: thisBox.y + thisBox.height * 0.5 - (otherBox.y - otherBox.height * 0.5) }; // from bottom

    if (horizontalPenetration.value > verticalPenetration.value) {
      return verticalPenetration.border;
    } else {
      return horizontalPenetration.border;
    }
  }
}
