import type { Circuit, Layer, Trace } from "types";

export function getModuleClicked(
  click_x: number,
  click_y: number,
  layer: Layer | null
): string | null {
  if (!layer) {
    return null;
  }
  for (const modRef in layer.modules) {
    const module = layer.modules[modRef];
    const modulePos = module.pos;
    const distance = Math.sqrt(
      Math.pow(click_x - modulePos.x, 2) + Math.pow(click_y - modulePos.y, 2)
    );
    if (distance < module.radius) {
      return module.ref;
    }
  }
  return null;
}

export function getModuleConnections(
  moduleRef: string,
  layer: Layer
): [number, Trace][] {
  return layer.connections
    .map((trace, i) => {
      return [i, trace] as [number, Trace];
    })
    .filter((elem) => {
      return elem[1].a.ref === moduleRef || elem[1].b.ref === moduleRef;
    });
}

export function moveModule(
  movement_x: number,
  movement_y: number,
  module: string,
  layer: string,
  circuit: Circuit
): Circuit {
  circuit.layers[layer].modules[module].pos.x += movement_x;
  circuit.layers[layer].modules[module].pos.y += movement_y;

  const moduleConnections = getModuleConnections(module, circuit.layers[layer]);
  moduleConnections.forEach((conn) => {
    const new_conn = conn[1];
    if (new_conn.a.ref === module) {
      new_conn.a.pos.x += movement_x;
      new_conn.a.pos.y += movement_y;
    }
    if (new_conn.b.ref === module) {
      new_conn.b.pos.x += movement_x;
      new_conn.b.pos.y += movement_y;
    }
    circuit.layers[layer].connections[conn[0]] = new_conn;
  });
  return circuit;
}
