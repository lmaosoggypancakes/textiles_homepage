import type { Circuit, Footprint, Layer, Module } from "types";

export function _renderCircuit(
  circuit: Circuit,
  ctx: CanvasRenderingContext2D
) {
  Object.keys(circuit.layers).forEach((layerRef) => {
    const layer = circuit.layers[layerRef];
    if (!layer) {
      return;
    }
    _renderLayer(layer, null, null, circuit, ctx);
  });
}

export function _renderLayer(
  layer: Layer,
  selectedModule: string | null,
  highlightedModule: string | null,
  circuit: Circuit,
  ctx: CanvasRenderingContext2D
) {
  Object.keys(layer.modules).forEach((modRef) => {
    const module = layer.modules[modRef];
    if (!module) {
      return;
    }
    _renderModule(
      module,
      circuit,
      ctx,
      selectedModule === modRef,
      highlightedModule === modRef,
      false
    );
  });
  layer.connections.forEach((conn) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = ctx.fillStyle = "#9ccfd8";
    ctx.beginPath();
    ctx.moveTo(conn.a.pos.x, conn.a.pos.y);
    ctx.lineTo(conn.b.pos.x, conn.b.pos.y);
    ctx.stroke();
  });
}

export function _renderModule(
  module: Module,
  circuit: Circuit,
  ctx: CanvasRenderingContext2D,
  selected: boolean,
  highlighted: boolean,
  zoomed_in: boolean
) {
  const module_x = zoomed_in ? 250 : module.pos.x;
  const module_y = zoomed_in ? 250 : module.pos.y;
  const module_radius = zoomed_in ? module.radius * 5 : module.radius;
  ctx.beginPath();
  ctx.arc(module_x, module_y, module_radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#431";
  ctx.fill();
  if (selected) {
    ctx.beginPath();
    ctx.arc(module_x, module_y, module_radius, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ddd";
    ctx.stroke();
  }
  if (highlighted) {
    ctx.beginPath();
    ctx.arc(module_x, module_y, module_radius + 0.5, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#888";
    ctx.stroke();
  }
  Object.keys(module.components).forEach((cRef) => {
    const component = module.components[cRef];
    if (!component) {
      return;
    }
    const component_x = zoomed_in ? 5.0 * component.pos.x : component.pos.x;
    const component_y = zoomed_in ? 5.0 * component.pos.y : component.pos.y;
    const base_x = module_x + component_x;
    const base_y = module_y + component_y;
    if (component.ref !== "") {
      const footprint = circuit.footprints[component.ref];
      if (!footprint) {
        if (component.is_pad) {
          const pad_footprint = circuit.footprints["pad"];
          if (!pad_footprint) {
            ctx.beginPath();
            ctx.arc(component_x, component_y, 1, 0, 2 * Math.PI);
            ctx.stroke();
          } else {
            renderFootprint(pad_footprint, base_x, base_y, ctx, zoomed_in);
          }
        } else {
          ctx.beginPath();
          ctx.arc(component_x, component_y, 20, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else {
        renderFootprint(footprint, base_x, base_y, ctx, zoomed_in);
      }
    }
  });
  module.connections.forEach((connection) => {
    const scale = zoomed_in ? 5 : 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = ctx.fillStyle = "#9ccfd8";
    ctx.beginPath();
    ctx.moveTo(
      module_x + scale * connection.a.pos.x,
      module_y + scale * connection.a.pos.y
    );
    ctx.lineTo(
      module_x + scale * connection.b.pos.x,
      module_y + scale * connection.b.pos.y
    );
    ctx.stroke();
  });
}

function renderFootprint(
  footprint: Footprint,
  base_x: number,
  base_y: number,
  ctx: CanvasRenderingContext2D,
  zoomed_in: boolean
) {
  const scale = zoomed_in ? 5 : 1;
  const fcrtyrd_shapes = footprint.paths[0];
  const silks_shapes = footprint.paths[1];
  const pad_shapes = footprint.paths[2];
  if (fcrtyrd_shapes) {
    fcrtyrd_shapes.forEach((shape) => {
      shape.paths.forEach((path) => {
        ctx.beginPath();
        ctx.moveTo(base_x + scale * path[0][0], base_y + scale * path[0][1]);
        ctx.lineTo(base_x + scale * path[1][0], base_y + scale * path[1][1]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#aaaf";
        ctx.stroke();
      });
    });
  }
  if (silks_shapes) {
    silks_shapes.forEach((shape) => {
      shape.paths.forEach((path) => {
        ctx.beginPath();
        ctx.moveTo(base_x + scale * path[0][0], base_y + scale * path[0][1]);
        ctx.lineTo(base_x + scale * path[1][0], base_y + scale * path[1][1]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#258f";
        ctx.stroke();
      });
    });
  }
  if (pad_shapes) {
    pad_shapes.forEach((shape) => {
      ctx.beginPath();
      ctx.moveTo(
        base_x + scale * shape.paths[0][0][0],
        base_y + scale * shape.paths[0][0][1]
      );
      shape.paths.forEach((path) => {
        ctx.lineTo(base_x + scale * path[1][0], base_y + scale * path[1][1]);
      });
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.fillStyle = "#ba2f";
      ctx.fill();
    });
  }
}
