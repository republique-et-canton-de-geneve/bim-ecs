import { EcsPlugin } from '@bim/ecs';
import { defineSystem } from '@bim/ecs';
import { EcsComponent } from '@bim/ecs/components';
import { startup, after } from '@bim/ecs/scheduling';
import { Config } from './config.ts';
import { BoxGeometry } from './box-geometry.ts';
import { initializePlateSystem, Plate, updatePlateSystem } from './plate.ts';
import { Ball, initializeBallSystem, updateBallSystem } from './ball.ts';
import { Name } from './common.ts';
import { initializeBricksSystem } from './brick.ts';

export const renderingPlugin: EcsPlugin = (world) => {
  world.registerSystem(initializeSceneSystem);
  world.registerSystem(updatePlateRenderingSystem);
  world.registerSystem(initializeBoxGeometriesRenderingSystem);
  world.registerSystem(updateBallRenderingSystem);
};

export class DOMElementComponent extends EcsComponent<HTMLElement> {}
export class SceneComponent extends EcsComponent {}

export const initializeSceneSystem = defineSystem(
  'Init Scene',
  ({ entities, container }) => {
    const config = container.resolve(Config);

    const sceneElement = document.createElement('DIV');
    sceneElement.classList.add('scene');
    sceneElement.style.width = `${config.width}px`;
    sceneElement.style.height = `${config.height}px`;
    sceneElement.style.position = `relative`;
    document.body.appendChild(sceneElement);

    entities.spawn(new SceneComponent(), new DOMElementComponent(sceneElement));

    return { sceneElement };
  },
  startup,
);

export const initializeBoxGeometriesRenderingSystem = defineSystem(
  'Init Box geometries rendering',
  ({ query, entities }, { payload }) => {
    const scene = query.execute(() => [SceneComponent]).next().value;
    const sceneElement = entities.componentsOf(scene).get(DOMElementComponent)!.value;

    // const entity = payload.entity; // option A
    const entitiesToInitialize = query.execute(({ without }) => [BoxGeometry, without(DOMElementComponent)]); // option B

    for (const entity of entitiesToInitialize) /* option B */ {
      const components = entities.componentsOf(entity);
      const boxGeometry = components.get(BoxGeometry)!.value;
      const name = components.get(Name)?.value;

      const domElement = document.createElement('DIV');
      if (name) domElement.classList.add(name);
      domElement.style.position = 'absolute';
      domElement.style.left = `${boxGeometry.x - boxGeometry.width * 0.5}px`;
      domElement.style.top = `${boxGeometry.y - boxGeometry.height * 0.5}px`;
      domElement.style.width = `${boxGeometry.width}px`;
      domElement.style.height = `${boxGeometry.height}px`;

      sceneElement.append(domElement);
      entities.addComponent(entity, new DOMElementComponent(domElement));
    } // option B
  },
  // spawned(function withoutGeometryYet({ without }) { // option A
  //   return [BoxGeometry, without(DOMElementComponent)]; // option A
  // }), // option A
  after([initializeBricksSystem, initializePlateSystem, initializeBallSystem]), // option B
);

export const updatePlateRenderingSystem = defineSystem(
  'Render plate',
  ({ query, entities }) => {
    const plate = query.execute(() => [Plate, BoxGeometry, DOMElementComponent]).next().value;
    if (plate !== undefined) {
      const components = entities.componentsOf(plate);
      const boxGeometry = components.get(BoxGeometry)!.value;
      const plateElement = components.get(DOMElementComponent)!.value;

      plateElement.style.left = `${boxGeometry.x - boxGeometry.width * 0.5}px`;
    }
  },
  after([updatePlateSystem]),
);

export const updateBallRenderingSystem = defineSystem(
  'Render ball',
  ({ query, entities }) => {
    for (const ball of query.execute(() => [Ball, BoxGeometry, DOMElementComponent])) {
      const components = entities.componentsOf(ball);
      const boxGeometry = components.get(BoxGeometry)!.value;
      const ballElement = components.get(DOMElementComponent)!.value;

      ballElement.style.left = `${boxGeometry.x - boxGeometry.width * 0.5}px`;
      ballElement.style.top = `${boxGeometry.y - boxGeometry.height * 0.5}px`;
    }
  },
  after([updateBallSystem]),
);
