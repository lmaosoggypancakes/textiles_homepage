import type { Circuit, Footprint, Layer, Module } from "types";
import { getModuleConnections, getZoomScale } from "./editCircuit";

export function _renderCircuit(
  circuit: Circuit,
  ctx: CanvasRenderingContext2D
) {
  Object.keys(circuit.layers).forEach((layerRef) => {
    const layer = circuit.layers[layerRef];
    if (!layer) {
      return;
    }
    _renderLayer(layer, null, null, [], circuit, ctx);
  });
}

export function _renderLayer(
  layer: Layer,
  selectedModule: string | null,
  highlightedModule: string | null,
  mergeModules: string[],
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
      null,
      null,
      circuit,
      ctx,
      selectedModule === modRef || mergeModules.includes(modRef),
      highlightedModule === modRef,
      false
    );
  });
  Object.keys(layer.connections)
    .map((ref) => layer.connections[ref])
    .forEach((conn) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = ctx.fillStyle = "#9ccfd8";
      ctx.beginPath();
      ctx.moveTo(conn.a.pos.x, conn.a.pos.y);
      ctx.lineTo(conn.b.pos.x, conn.b.pos.y);
      ctx.stroke();
    });
}

export function _renderModule(
  module: Module | null,
  selectedComponent: string | null,
  highlightedComponent: string | null,
  circuit: Circuit,
  ctx: CanvasRenderingContext2D,
  selected: boolean,
  highlighted: boolean,
  zoomed_in: boolean
) {
  if (!module) {
    return null;
  }
  const scale = zoomed_in ? getZoomScale(module) : 1;
  const module_x = zoomed_in ? 250 : module.pos.x;
  const module_y = zoomed_in ? 250 : module.pos.y;
  const module_radius = module.radius * scale;
  const outer_radius = (module.radius + 15) * scale;
  ctx.beginPath();
  ctx.arc(module_x, module_y, outer_radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#431";
  ctx.fill();
  if (highlighted) {
    ctx.beginPath();
    ctx.arc(module_x, module_y, outer_radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#542";
    ctx.fill();
  }
  if (selected) {
    ctx.beginPath();
    ctx.arc(module_x, module_y, outer_radius, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.fillStyle = "#653";
    ctx.fill();
  }

  for (let idx = 0; idx < 8; idx++) {
    ctx.beginPath();
    const start_rad =
      Math.PI / 6 +
      idx * (Math.PI / 6) +
      (idx >= 4 ? Math.PI / 3 : 0) +
      Math.PI / 36 +
      (module.angle * Math.PI) / 180;
    const end_rad =
      Math.PI / 6 +
      (idx + 1) * (Math.PI / 6) +
      (idx >= 4 ? Math.PI / 3 : 0) -
      Math.PI / 36 +
      (module.angle * Math.PI) / 180;
    ctx.moveTo(
      outer_radius * Math.cos(start_rad) + module_x,
      outer_radius * Math.sin(start_rad) + module_y
    );
    ctx.arc(module_x, module_y, outer_radius, start_rad, end_rad);
    ctx.lineTo(
      module_radius * Math.cos(end_rad) + module_x,
      module_radius * Math.sin(end_rad) + module_y
    );
    ctx.arc(module_x, module_y, module_radius, end_rad, start_rad, true);
    ctx.lineTo(
      outer_radius * Math.cos(start_rad) + module_x,
      outer_radius * Math.sin(start_rad) + module_y
    );
    ctx.fillStyle = "#ba2f";
    if (highlighted) {
      ctx.fillStyle = "#cb3f";
    }
    if (selected) {
      ctx.fillStyle = "#fe6f";
    }
    ctx.closePath();
    ctx.fill();
  }

  Object.keys(module.components).forEach((cRef) => {
    const component = module.components[cRef];
    if (!component) {
      return;
    }
    const component_x = scale * component.pos.x;
    const component_y = scale * component.pos.y;
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
            renderFootprint(
              pad_footprint,
              base_x,
              base_y,
              ctx,
              highlightedComponent === component.ref,
              selectedComponent === component.ref,
              scale,
              component.angle
            );
          }
        } else {
          ctx.beginPath();
          ctx.arc(component_x, component_y, 20, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else {
        renderFootprint(
          footprint,
          base_x,
          base_y,
          ctx,
          highlightedComponent === component.ref,
          selectedComponent === component.ref,
          scale,
          component.angle
        );
      }
    }
  });
  Object.keys(module.connections)
    .map((ref) => module.connections[ref])
    .forEach((connection) => {
      if (zoomed_in) {
        ctx.save();
        ctx.font = "16px";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText(
          connection.a.net_name,
          module_x + scale * connection.a.pos.x,
          module_y + scale * connection.a.pos.y
        );
        ctx.fillText(
          connection.b.net_name,
          module_x + scale * connection.b.pos.x,
          module_y + scale * connection.b.pos.y
        );
        ctx.restore();
      }
      if (connection.points.length === 0) {
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
      } else {
        ctx.beginPath();
        connection.points.forEach((point, i) => {
          ctx.lineWidth = scale * 4;
          ctx.strokeStyle = ctx.fillStyle = "#ba2f";
          if (i == 0) {
            ctx.moveTo(module_x + scale * point.x, module_y + scale * point.y);
          } else {
            ctx.lineTo(module_x + scale * point.x, module_y + scale * point.y);
          }
        });
        ctx.stroke();
        if (
          connection.points[0].x === connection.a.pos.x &&
          connection.points[0].y === connection.a.pos.y
        ) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = ctx.fillStyle = "#9ccfd8";
          ctx.beginPath();
          ctx.moveTo(
            module_x + scale * connection.b.pos.x,
            module_y + scale * connection.b.pos.y
          );
          ctx.lineTo(
            module_x +
              scale * connection.points[connection.points.length - 1].x,
            module_y + scale * connection.points[connection.points.length - 1].y
          );
          ctx.stroke();
        } else if (
          connection.points[0].x === connection.b.pos.x &&
          connection.points[0].y === connection.b.pos.y
        ) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = ctx.fillStyle = "#9ccfd8";
          ctx.beginPath();
          ctx.moveTo(
            module_x + scale * connection.a.pos.x,
            module_y + scale * connection.a.pos.y
          );
          ctx.lineTo(
            module_x +
              scale * connection.points[connection.points.length - 1].x,
            module_y + scale * connection.points[connection.points.length - 1].y
          );
          ctx.stroke();
        }
      }
    });
}

function renderFootprint(
  footprint: Footprint,
  base_x: number,
  base_y: number,
  ctx: CanvasRenderingContext2D,
  highlightedComponent: boolean,
  selectedComponent: boolean,
  scale: number,
  angle: number
) {
  const fcrtyrd_shapes = footprint.paths[0];
  const silks_shapes = footprint.paths[1];
  const pad_shapes = footprint.paths[2];
  ctx.save();
  ctx.translate(base_x, base_y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.translate(-base_x, -base_y);
  if (fcrtyrd_shapes) {
    fcrtyrd_shapes.forEach((shape) => {
      shape.paths.forEach((path) => {
        ctx.beginPath();
        ctx.moveTo(base_x + scale * path[0].x, base_y + scale * path[0].y);
        ctx.lineTo(base_x + scale * path[1].x, base_y + scale * path[1].y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#aaaf";
        if (highlightedComponent) {
          ctx.strokeStyle = "#bbbf";
        }
        if (selectedComponent) {
          ctx.strokeStyle = "#cccf";
        }
        ctx.stroke();
      });
    });
  }
  if (silks_shapes) {
    silks_shapes.forEach((shape) => {
      shape.paths.forEach((path) => {
        ctx.beginPath();
        ctx.moveTo(base_x + scale * path[0].x, base_y + scale * path[0].y);
        ctx.lineTo(base_x + scale * path[1].x, base_y + scale * path[1].y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#258f";
        if (highlightedComponent) {
          ctx.strokeStyle = "#369f";
        }
        if (selectedComponent) {
          ctx.strokeStyle = "#47af";
        }
        ctx.stroke();
      });
    });
  }
  if (pad_shapes) {
    pad_shapes.forEach((shape) => {
      ctx.beginPath();
      ctx.moveTo(
        base_x + scale * shape.paths[0][0].x,
        base_y + scale * shape.paths[0][0].y
      );
      shape.paths.forEach((path) => {
        ctx.lineTo(base_x + scale * path[1].x, base_y + scale * path[1].y);
      });
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.fillStyle = "#ba2f";
      if (highlightedComponent) {
        ctx.fillStyle = "#cb3f";
      }
      if (selectedComponent) {
        ctx.fillStyle = "#fe6f";
      }
      ctx.fill();
    });
  }
  ctx.restore();
}
