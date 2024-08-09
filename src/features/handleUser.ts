import type { Circuit, Layer, Module, Trace } from "types";

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

export function getComponentClicked(
  click_x: number,
  click_y: number,
  module: Module | null,
  zoomed_in: boolean
): string | null {
  if (!module) {
    return null;
  }
  for (const comopnentRef in module.components) {
    const scale = zoomed_in ? 5.0 : 1.0;
    const component = module.components[comopnentRef];
    const componentPos = component.pos;
    const module_x = zoomed_in ? 250 : module.pos.x;
    const module_y = zoomed_in ? 250 : module.pos.y;
    const distance_x = click_x - (scale * componentPos.x + module_x);
    const distance_y = click_y - (scale * componentPos.y + module_y);
    if (
      Math.abs(distance_x) < (component.width * scale) / 2 &&
      Math.abs(distance_y) < (component.height * scale) / 2
    ) {
      return component.ref;
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

export function getComponentConnections(
  componentRef: string,
  module: Module
): [number, Trace][] {
  return module.connections
    .map((trace, i) => {
      return [i, trace] as [number, Trace];
    })
    .filter((elem) => {
      return elem[1].a.ref === componentRef || elem[1].b.ref === componentRef;
    });
}

export function moveModule(
  mouse_x: number,
  mouse_y: number,
  moduleRef: string,
  layer: string,
  circuit: Circuit
): Circuit {
  const module = circuit.layers[layer].modules[moduleRef];

  const moduleConnections = getModuleConnections(
    moduleRef,
    circuit.layers[layer]
  );
  moduleConnections.forEach((conn) => {
    const new_conn = conn[1];
    const a_pin_diff_x = new_conn.a.pos.x - module.pos.x;
    const a_pin_diff_y = new_conn.a.pos.y - module.pos.y;
    const b_pin_diff_x = new_conn.b.pos.x - module.pos.x;
    const b_pin_diff_y = new_conn.b.pos.y - module.pos.y;
    if (new_conn.a.ref === moduleRef) {
      new_conn.a.pos.x = mouse_x + a_pin_diff_x;
      new_conn.a.pos.y = mouse_y + a_pin_diff_y;
    }
    if (new_conn.b.ref === moduleRef) {
      new_conn.b.pos.x = mouse_x + b_pin_diff_x;
      new_conn.b.pos.y = mouse_y + b_pin_diff_y;
    }
    circuit.layers[layer].connections[conn[0]] = new_conn;
  });
  circuit.layers[layer].modules[moduleRef].pos.x = mouse_x;
  circuit.layers[layer].modules[moduleRef].pos.y = mouse_y;
  return circuit;
}

function calculate360Angle(offset_x: number, offset_y: number): number {
  var radians = Math.atan2(-offset_y, offset_x);
  if (radians < 0) radians += 2 * Math.PI;
  return (radians * 180) / Math.PI;
}

function snapPadPos(angle: number, radius: number): [number, number] {
  if (0 <= angle && angle < 60) {
    return [radius * Math.cos(Math.PI / 4), radius * Math.sin(Math.PI / 4)];
  } else if (60 <= angle && angle < 90) {
    return [
      radius * Math.cos((Math.PI * 7) / 16),
      radius * Math.sin((Math.PI * 7) / 16),
    ];
  } else if (90 <= angle && angle < 120) {
    return [
      radius * Math.cos((Math.PI * 9) / 16),
      radius * Math.sin((Math.PI * 9) / 16),
    ];
  } else if (120 <= angle && angle < 180) {
    return [
      radius * Math.cos((Math.PI * 3) / 4),
      radius * Math.sin((Math.PI * 3) / 4),
    ];
  } else if (180 <= angle && angle < 240) {
    return [
      radius * Math.cos((Math.PI * 5) / 4),
      radius * Math.sin((Math.PI * 5) / 4),
    ];
  } else if (240 <= angle && angle < 270) {
    return [
      radius * Math.cos((Math.PI * 23) / 16),
      radius * Math.sin((Math.PI * 23) / 16),
    ];
  } else if (270 <= angle && angle < 300) {
    return [
      radius * Math.cos((Math.PI * 25) / 16),
      radius * Math.sin((Math.PI * 25) / 16),
    ];
  } else if (300 <= angle && angle < 360) {
    return [
      radius * Math.cos((Math.PI * 7) / 4),
      radius * Math.sin((Math.PI * 7) / 4),
    ];
  }
  return [0, 0];
}

function getComponentOffsetPos(
  mouse_x: number,
  mouse_y: number,
  radius: number,
  componentRef: string
): [number, number] {
  const offset_x = (mouse_x - 250) * 0.2;
  const offset_y = (mouse_y - 250) * 0.2;
  if (componentRef.startsWith("PAD")) {
    const angle = 360 - calculate360Angle(offset_x, offset_y);
    return snapPadPos(angle, radius);
  }
  return [offset_x, offset_y];
}

export function moveComponent(
  mouse_x: number,
  mouse_y: number,
  componentRef: string,
  module: string,
  layer: string,
  circuit: Circuit
): Circuit {
  const moduleConnections = getComponentConnections(
    componentRef,
    circuit.layers[layer].modules[module]
  );
  const component =
    circuit.layers[layer].modules[module].components[componentRef];
  const [offset_x, offset_y] = getComponentOffsetPos(
    mouse_x,
    mouse_y,
    circuit.layers[layer].modules[module].radius,
    componentRef
  );
  moduleConnections.forEach((conn) => {
    const new_conn = conn[1];
    const a_pin_diff_x = new_conn.a.pos.x - component.pos.x;
    const a_pin_diff_y = new_conn.a.pos.y - component.pos.y;
    const b_pin_diff_x = new_conn.b.pos.x - component.pos.x;
    const b_pin_diff_y = new_conn.b.pos.y - component.pos.y;
    if (new_conn.a.ref === componentRef) {
      new_conn.a.pos.x = offset_x + a_pin_diff_x;
      new_conn.a.pos.y = offset_y + a_pin_diff_y;
    }
    if (new_conn.b.ref === componentRef) {
      new_conn.b.pos.x = offset_x + b_pin_diff_x;
      new_conn.b.pos.y = offset_y + b_pin_diff_y;
    }
    circuit.layers[layer].connections[conn[0]] = new_conn;
  });
  circuit.layers[layer].modules[module].components[componentRef].pos.x =
    offset_x;
  circuit.layers[layer].modules[module].components[componentRef].pos.y =
    offset_y;
  return circuit;
}
