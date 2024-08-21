import type {
  Circuit,
  Component,
  ConnectionNode,
  Layer,
  Module,
  Position,
  Trace,
} from "types";

export function addPosition(a: Position, b: Position) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function subPosition(a: Position, b: Position) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function getPolar(pos: Position) {
  return [
    Math.sqrt(Math.pow(pos.x, 2) + Math.pow(pos.y, 2)),
    calculate360Angle(pos.x, pos.y),
  ];
}

export function rotatePosition(pos: Position, degrees: number): Position {
  const [r, a] = getPolar(pos);
  return {
    x: r * Math.cos(((a + degrees) * Math.PI) / 180),
    y: r * Math.sin(((a + degrees) * Math.PI) / 180),
  };
}

export function rotate90Position(pos: Position): Position {
  return {
    x: pos.y,
    y: -pos.x,
  };
}

export function eqPosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

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
  for (const componentRef in module.components) {
    const scale = zoomed_in ? getZoomScale(module) : 1.0;
    const component = module.components[componentRef];
    const componentPos = component.pos;
    const module_x = zoomed_in ? 250 : module.pos.x;
    const module_y = zoomed_in ? 250 : module.pos.y;
    const distance_x = click_x - (scale * componentPos.x + module_x);
    const distance_y = click_y - (scale * componentPos.y + module_y);
    const width =
      component.angle % 180 === 90 ? component.height : component.width;
    const height =
      component.angle % 180 === 90 ? component.width : component.height;
    if (
      Math.abs(distance_x) < (width * scale) / 2 &&
      Math.abs(distance_y) < (height * scale) / 2
    ) {
      return component.ref;
    }
  }
  return null;
}

export function getPinClicked(
  clickX: number,
  clickY: number,
  componentRef: string | null,
  module: Module | null,
  zoomed_in: boolean
): number | null {
  if (!componentRef) {
    return null;
  }
  if (!module) {
    return null;
  }
  const component = module.components[componentRef];
  return component.pin_coords.reduce<number | null>(
    (clicked, coord, i): number | null => {
      if (clicked != null) {
        return clicked;
      }
      const scale = zoomed_in ? getZoomScale(module) : 1.0;
      const module_x = zoomed_in ? 250 : module.pos.x;
      const module_y = zoomed_in ? 250 : module.pos.y;
      const distance_x =
        clickX - (scale * (coord.x + component.pos.x) + module_x);
      const distance_y =
        clickY - (scale * (coord.y + component.pos.y) + module_y);
      const width = 8.0;
      const height = 8.0;
      if (
        Math.abs(distance_x) < (width * scale) / 2 &&
        Math.abs(distance_y) < (height * scale) / 2
      ) {
        return i + 1;
      }
      return null;
    },
    null
  );
}

export function getModuleConnections(moduleRef: string, layer: Layer): Trace[] {
  return Object.keys(layer.connections)
    .map((trace) => {
      return layer.connections[trace];
    })
    .filter((elem) => {
      return elem.a.ref === moduleRef || elem.b.ref === moduleRef;
    });
}

export function getComponentConnections(
  componentRef: string,
  module: Module
): Trace[] {
  return Object.keys(module.connections)
    .map((trace) => {
      return module.connections[trace];
    })
    .filter((elem) => {
      return elem.a.ref === componentRef || elem.b.ref === componentRef;
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
    const new_conn = conn;
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
    circuit.layers[layer].connections[new_conn.ref] = new_conn;
  });
  circuit.layers[layer].modules[moduleRef].pos.x = mouse_x;
  circuit.layers[layer].modules[moduleRef].pos.y = mouse_y;
  return circuit;
}

export function rotate90Module(
  moduleRef: string,
  layer: string,
  circuit: Circuit
): Circuit {
  const module = circuit.layers[layer].modules[moduleRef];
  module.angle += 90;
  Object.keys(module.components).forEach((componentRef) => {
    module.components[componentRef].pos = rotate90Position(
      module.components[componentRef].pos
    );
    circuit = rotate90Component(componentRef, moduleRef, layer, circuit);
  });

  const moduleConnections = getModuleConnections(
    moduleRef,
    circuit.layers[layer]
  );
  moduleConnections.forEach((trace) => {
    if (trace.a.ref === moduleRef && typeof trace.a.pin === "string") {
      trace.a.pos = addPosition(module.pos, module.components[trace.a.pin].pos);
    } else if (trace.b.ref === moduleRef) {
      trace.b.pos = addPosition(module.pos, module.components[trace.b.pin].pos);
    }
  });
  return circuit;
}

function calculate360Angle(offset_x: number, offset_y: number): number {
  var radians = Math.atan2(-offset_y, offset_x);
  if (radians < 0) radians += 2 * Math.PI;
  return (radians * 180) / Math.PI;
}

function getPadPos(padPos: number, r: number, angle: number): [number, number] {
  const radius = r;
  const radians = (angle * Math.PI) / 180;
  switch (padPos) {
    case 0: {
      return [
        radius * Math.cos(Math.PI / 4 + radians),
        radius * Math.sin(Math.PI / 4 + radians),
      ];
    }
    case 1: {
      return [
        radius * Math.cos((Math.PI * 5) / 12 + radians),
        radius * Math.sin((Math.PI * 5) / 12 + radians),
      ];
    }
    case 2: {
      return [
        radius * Math.cos((Math.PI * 7) / 12 + radians),
        radius * Math.sin((Math.PI * 7) / 12 + radians),
      ];
    }
    case 3: {
      return [
        radius * Math.cos((Math.PI * 3) / 4 + radians),
        radius * Math.sin((Math.PI * 3) / 4 + radians),
      ];
    }
    case 4: {
      return [
        radius * Math.cos((Math.PI * 5) / 4 + radians),
        radius * Math.sin((Math.PI * 5) / 4 + radians),
      ];
    }
    case 5: {
      return [
        radius * Math.cos((Math.PI * 17) / 12 + radians),
        radius * Math.sin((Math.PI * 17) / 12 + radians),
      ];
    }
    case 6: {
      return [
        radius * Math.cos((Math.PI * 19) / 12 + radians),
        radius * Math.sin((Math.PI * 19) / 12 + radians),
      ];
    }
    case 7: {
      return [
        radius * Math.cos((Math.PI * 7) / 4 + radians),
        radius * Math.sin((Math.PI * 7) / 4 + radians),
      ];
    }
  }
  console.warn(`There are only 8 pad position: ${padPos} is invalid`);
  return [0, 0];
}

function snapPadPos(
  angle: number,
  r: number,
  moduleAngle: number
): [number, number] {
  const radius = r;
  const offset_angle = (angle - moduleAngle) % 360;
  const normalized_offset_angle =
    offset_angle < 0 ? offset_angle + 360 : offset_angle;
  if (0 <= normalized_offset_angle && normalized_offset_angle < 60) {
    return getPadPos(0, radius, moduleAngle);
  } else if (60 <= normalized_offset_angle && normalized_offset_angle < 90) {
    return getPadPos(1, radius, moduleAngle);
  } else if (90 <= normalized_offset_angle && normalized_offset_angle < 120) {
    return getPadPos(2, radius, moduleAngle);
  } else if (120 <= normalized_offset_angle && normalized_offset_angle < 180) {
    return getPadPos(3, radius, moduleAngle);
  } else if (180 <= normalized_offset_angle && normalized_offset_angle < 240) {
    return getPadPos(4, radius, moduleAngle);
  } else if (240 <= normalized_offset_angle && normalized_offset_angle < 270) {
    return getPadPos(5, radius, moduleAngle);
  } else if (270 <= normalized_offset_angle && normalized_offset_angle < 300) {
    return getPadPos(6, radius, moduleAngle);
  } else if (300 <= normalized_offset_angle && normalized_offset_angle < 360) {
    return getPadPos(7, radius, moduleAngle);
  }
  return [0, 0];
}

function getComponentOffsetPos(
  mouse_x: number,
  mouse_y: number,
  radius: number,
  componentRef: string,
  module: Module
): [number, number] {
  const offset_x = (mouse_x - 250) / getZoomScale(module);
  const offset_y = (mouse_y - 250) / getZoomScale(module);
  if (componentRef.startsWith("PAD")) {
    const angle = 360 - calculate360Angle(offset_x, offset_y);
    return snapPadPos(angle, radius, module.angle);
  }
  return [offset_x, offset_y];
}

export function moveComponent(
  mouse_x: number,
  mouse_y: number,
  componentRef: string,
  moduleRef: string,
  layer: string,
  circuit: Circuit
): Circuit {
  const module = circuit.layers[layer].modules[moduleRef];

  const componentConnections = getComponentConnections(
    componentRef,
    circuit.layers[layer].modules[moduleRef]
  );
  const component =
    circuit.layers[layer].modules[moduleRef].components[componentRef];
  const [offset_x, offset_y] = getComponentOffsetPos(
    mouse_x,
    mouse_y,
    circuit.layers[layer].modules[moduleRef].radius,
    componentRef,
    module
  );
  componentConnections.forEach((conn) => {
    const new_conn = conn;
    if (new_conn.a.ref === componentRef && typeof new_conn.a.pin === "number") {
      new_conn.a.pos.x = offset_x + component.pin_coords[new_conn.a.pin - 1].x;
      new_conn.a.pos.y = offset_y + component.pin_coords[new_conn.a.pin - 1].y;
    }
    if (new_conn.b.ref === componentRef && typeof new_conn.b.pin === "number") {
      new_conn.b.pos.x = offset_x + component.pin_coords[new_conn.b.pin - 1].x;
      new_conn.b.pos.y = offset_y + component.pin_coords[new_conn.b.pin - 1].y;
    }
  });
  circuit.layers[layer].modules[moduleRef].components[componentRef].pos.x =
    offset_x;
  circuit.layers[layer].modules[moduleRef].components[componentRef].pos.y =
    offset_y;
  if (component.is_pad) {
    const moduleConnections = getModuleConnections(
      moduleRef,
      circuit.layers[layer]
    );
    moduleConnections.forEach((conn) => {
      const new_conn = conn;
      if (new_conn.a.pin !== componentRef && new_conn.b.pin !== componentRef) {
        return;
      }

      if (new_conn.a.ref === moduleRef && new_conn.a.pin === componentRef) {
        new_conn.a.pos.x = offset_x + module.pos.x;
        new_conn.a.pos.y = offset_y + module.pos.y;
      }
      if (new_conn.b.ref === moduleRef && new_conn.b.pin === componentRef) {
        new_conn.b.pos.x = offset_x + module.pos.x;
        new_conn.b.pos.y = offset_y + module.pos.y;
      }
      circuit.layers[layer].connections[conn.ref] = new_conn;
    });
  }
  return circuit;
}

export function rotate90Component(
  componentRef: string,
  moduleRef: string,
  layer: string,
  circuit: Circuit
): Circuit {
  const component =
    circuit.layers[layer].modules[moduleRef].components[componentRef];
  component.angle += 90;
  component.pin_coords = component.pin_coords.map((coord) => {
    return rotate90Position(coord);
  });
  const connections = getComponentConnections(
    componentRef,
    circuit.layers[layer].modules[moduleRef]
  );
  connections.forEach((trace) => {
    if (trace.a.ref === componentRef && typeof trace.a.pin === "number") {
      trace.a.pos = addPosition(
        component.pos,
        component.pin_coords[trace.a.pin - 1]
      );
    } else if (
      trace.b.ref === componentRef &&
      typeof trace.b.pin === "number"
    ) {
      trace.b.pos = addPosition(
        component.pos,
        component.pin_coords[trace.b.pin - 1]
      );
    }
  });
  return circuit;
}

export function getZoomScale(module: Module): number {
  return 200 / (module.radius + 10);
}

export function getPadToComponent(
  padRef: string,
  moduleRef: string,
  layer: string,
  circuit: Circuit
): ConnectionNode | null {
  const module = circuit.layers[layer].modules[moduleRef];
  const traces = getComponentConnections(padRef, module);
  if (traces.length === 1) {
    if (traces[0].a.ref === padRef) {
      return traces[0].b;
    } else if (traces[0].b.ref === padRef) {
      return traces[0].a;
    }
  }
  return null;
}

export function checkComponentsConnection(
  a_ref: string,
  a_pin: number,
  b_ref: string,
  b_pin: number,
  module: Module
): boolean {
  return getComponentConnections(a_ref, module).reduce<boolean>(
    (isConnected, trace) => {
      return (
        isConnected ||
        (trace.a.ref === a_ref &&
          trace.a.pin === a_pin &&
          trace.b.ref === b_ref &&
          trace.b.pin === b_pin) ||
        (trace.b.ref === a_ref &&
          trace.b.pin === a_pin &&
          trace.a.ref === b_ref &&
          trace.a.pin === b_pin)
      );
    },
    false
  );
}

export function tupleToPos(tuple: [number, number]): Position {
  return {
    x: tuple[0],
    y: tuple[1],
  };
}

export function getNonPadConnections(module: Module): Trace[] {
  return Object.keys(module.connections)
    .map((ref) => {
      return module.connections[ref];
    })
    .filter((trace) => {
      return !trace.a.ref.startsWith("PAD") && !trace.b.ref.startsWith("PAD");
    });
}

export function getTraceRef(a: ConnectionNode, b: ConnectionNode): string {
  return `${a.ref}-${a.pin}-${b.ref}-${b.pin}`;
}

export function _mergeModules(
  modules: string[],
  layer: string,
  circuit: Circuit
): [Circuit, string] {
  if (modules.length === 0) {
    alert("Error: Trying to merge 0 modules");
    return [circuit, ""];
  }
  if (modules.length === 1) {
    return [circuit, modules[0]];
  }
  const new_components: { [x: string]: Component } = {};
  const pad_components: { [x: string]: Component } = {};

  const new_radius = modules.reduce((r, modRef, i) => {
    const module = circuit.layers[layer].modules[modRef];
    Object.keys(module.components).forEach((cRef) => {
      if (!cRef.startsWith("PAD")) {
        new_components[cRef] = module.components[cRef];
      } else {
        pad_components[cRef] = module.components[cRef];
      }
    });
    return r + module.radius / (i + 1);
  }, 0);

  const new_ref =
    "MODULE-" +
    Object.keys(new_components)
      .filter((cRef) => !cRef.startsWith("PAD"))
      .join("-");

  const new_module: Module = {
    ref: new_ref,
    components: new_components,
    connections: {},
    pads: [],
    radius: new_radius,
    pos: circuit.layers[layer].modules[modules[0]].pos,
    angle: 0,
  };

  Object.keys(new_components).forEach((c_ref, i, arr) => {
    new_components[c_ref].pos = {
      x: new_radius * 0.5 * Math.cos((Math.PI * 2 * i) / arr.length),
      y: new_radius * 0.5 * Math.sin((Math.PI * 2 * i) / arr.length),
    };
  });

  modules.forEach((modRef) => {
    const module = circuit.layers[layer].modules[modRef];
    const traces = getModuleConnections(module.ref, circuit.layers[layer]);
    const nonPadConnections = getNonPadConnections(module).reduce<{
      [x: string]: Trace;
    }>(
      (
        connections,
        conn
      ): {
        [x: string]: Trace;
      } => {
        if (typeof conn.a.pin === "string") {
          return connections;
        }
        if (typeof conn.b.pin === "string") {
          return connections;
        }
        const a_pos = addPosition(
          new_module.components[conn.a.ref].pin_coords[conn.a.pin - 1],
          new_components[conn.a.ref].pos
        );
        const b_pos = addPosition(
          new_module.components[conn.b.ref].pin_coords[conn.b.pin - 1],
          new_components[conn.b.ref].pos
        );
        const new_ref = `${conn.a.ref}-${conn.a.pin}-${conn.b.ref}-${conn.b.pin}`;
        return {
          ...connections,
          new_ref: {
            ref: new_ref,
            a: { ...conn.a, pos: a_pos },
            b: { ...conn.b, pos: b_pos },
            points: [],
          },
        };
      },
      {}
    );
    new_module.connections = {
      ...new_module.connections,
      ...nonPadConnections,
    };
    const deleteTraces = traces.reduce<string[]>(
      (deleteTraces, trace): string[] => {
        if (modules.includes(trace.a.ref) && modules.includes(trace.b.ref)) {
          if (typeof trace.a.pin === "number") {
            return deleteTraces;
          }
          if (typeof trace.b.pin === "number") {
            return deleteTraces;
          }
          const a_node: ConnectionNode | null = getPadToComponent(
            trace.a.pin,
            trace.a.ref,
            layer,
            circuit
          );
          const b_node: ConnectionNode | null = getPadToComponent(
            trace.b.pin,
            trace.b.ref,
            layer,
            circuit
          );
          if (!a_node || !b_node) {
            return deleteTraces;
          }
          if (typeof a_node.pin === "string") {
            return deleteTraces;
          }
          if (typeof b_node.pin === "string") {
            return deleteTraces;
          }
          const a_pos = addPosition(
            new_module.components[a_node.ref].pin_coords[a_node.pin - 1],
            new_components[a_node.ref].pos
          );
          const b_pos = addPosition(
            new_module.components[b_node.ref].pin_coords[b_node.pin - 1],
            new_components[b_node.ref].pos
          );
          const new_ref = getTraceRef(a_node, b_node);
          const new_trace: Trace = {
            ref: new_ref,
            a: {
              ...a_node,
              pos: a_pos,
            },
            b: {
              ...b_node,
              pos: b_pos,
            },
            points: [],
          };
          new_module.connections[new_ref] = new_trace;
          return [...deleteTraces, trace.ref];
        }
        const conn = circuit.layers[layer].connections[trace.ref];
        if (conn.a.ref === modRef && typeof conn.a.pin === "string") {
          const pad_pos = tupleToPos(
            getPadPos(
              Object.keys(pad_components).indexOf(conn.a.pin),
              new_radius,
              pad_components[conn.a.pin].angle
            )
          );
          new_module.components[conn.a.pin] = {
            ...pad_components[conn.a.pin],
            pos: pad_pos,
          };
          const a_node: ConnectionNode = {
            ref: conn.a.pin,
            pin: 1,
            pos: pad_pos,
          };
          const compRef = conn.a.pin.split("-")[1];
          const compPin = Number(conn.a.pin.split("-")[2]);
          const b_node: ConnectionNode = {
            ref: compRef,
            pin: compPin,
            pos: {
              ...addPosition(
                new_module.components[compRef].pin_coords[compPin - 1],
                new_components[compRef].pos
              ),
            },
          };
          if (
            !checkComponentsConnection(
              conn.a.pin,
              1,
              compRef,
              compPin,
              new_module
            )
          ) {
            const new_ref = getTraceRef(a_node, b_node);
            const pad_trace: Trace = {
              ref: new_ref,
              a: a_node,
              b: b_node,
              points: [],
            };
            new_module.connections[new_ref] = pad_trace;
          }
          conn.a.ref = new_ref;
          conn.a.pos = addPosition(pad_pos, new_module.pos);
        } else if (conn.b.ref === modRef && typeof conn.b.pin === "string") {
          const pad_pos = tupleToPos(
            getPadPos(
              Object.keys(pad_components).indexOf(conn.b.pin),
              new_radius,
              pad_components[conn.b.pin].angle
            )
          );
          new_module.components[conn.b.pin] = {
            ...pad_components[conn.b.pin],
            pos: pad_pos,
          };
          const a_node: ConnectionNode = {
            ref: conn.b.pin,
            pin: 1,
            pos: pad_pos,
          };
          const compRef = conn.b.pin.split("-")[1];
          const compPin = Number(conn.b.pin.split("-")[2]);
          const b_node: ConnectionNode = {
            ref: compRef,
            pin: compPin,
            pos: {
              ...addPosition(
                new_module.components[compRef].pin_coords[compPin - 1],
                new_components[compRef].pos
              ),
            },
          };
          if (
            !checkComponentsConnection(
              conn.b.pin,
              1,
              compRef,
              compPin,
              new_module
            )
          ) {
            const new_ref = getTraceRef(a_node, b_node);
            const pad_trace: Trace = {
              ref: new_ref,
              a: a_node,
              b: b_node,
              points: [],
            };
            new_module.connections[new_ref] = pad_trace;
          }
          conn.b.ref = new_ref;
          conn.b.pos = addPosition(pad_pos, new_module.pos);
        }
        return deleteTraces;
      },
      []
    );
    deleteTraces.forEach((ref) => {
      delete circuit.layers[layer].connections[ref];
    });
  });
  modules.forEach((ref) => {
    delete circuit.layers[layer].modules[ref];
  });
  circuit.layers[layer].modules[new_ref] = new_module;
  return [circuit, new_ref];
}

export function getMousePosOnCanvas(
  mouseX: number,
  mouseY: number,
  module: Module | null
): Position {
  if (!module) {
    return { x: mouseX, y: mouseY };
  }
  const offsetX = (mouseX - 250) / getZoomScale(module);
  const offsetY = (mouseY - 250) / getZoomScale(module);
  return { x: offsetX, y: offsetY };
}

export function getTraceBendPoints(
  pos: Position,
  drawnPoints: Position[],
  module: Module | null
): Position[] {
  if (!module) {
    return [];
  }
  const lastPoint = drawnPoints[drawnPoints.length - 1];
  const offsetX = pos.x;
  const offsetY = pos.y;
  const diffX = offsetX - lastPoint.x;
  const diffY = offsetY - lastPoint.y;
  const absDiffX = Math.abs(diffX);
  const absDiffY = Math.abs(diffY);
  if (absDiffX > absDiffY) {
    if (diffX < 0) {
      return [
        { x: offsetX + Math.abs(diffY), y: offsetY - diffY },
        { x: offsetX, y: offsetY },
      ];
    }
    return [
      { x: offsetX - Math.abs(diffY), y: offsetY - diffY },
      { x: offsetX, y: offsetY },
    ];
  } else if (absDiffX < absDiffY) {
    if (diffY < 0) {
      return [
        { x: offsetX - diffX, y: offsetY + Math.abs(diffX) },
        { x: offsetX, y: offsetY },
      ];
    }
    return [
      { x: offsetX - diffX, y: offsetY - Math.abs(diffX) },
      { x: offsetX, y: offsetY },
    ];
  } else {
    return [{ x: offsetX, y: offsetY }];
  }
}

export function updateTrace(
  points: Position[],
  traceRef: string,
  moduleRef: string,
  layer: string,
  circuit: Circuit
): Circuit {
  circuit.layers[layer].modules[moduleRef].connections[traceRef].points =
    points;
  return circuit;
}
