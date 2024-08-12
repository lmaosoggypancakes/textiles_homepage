import type { PhysicalNode, Position } from "./types";
export const isIn = (shape: [number, number][], point: PhysicalNode) => {
  // TODO: use ray casting algorithm to determine this
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const xi = shape[i][0];
    const yi = shape[i][1];
    const xj = shape[j][0];
    const yj = shape[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

export const centroid = (nodes: PhysicalNode[]) => {
  let sum_x = 0;
  let sum_y = 0;
  nodes.forEach((node) => {
    sum_x += node.x;
    sum_y += node.y;
  });

  const average_x = sum_x / nodes.length;
  const average_y = sum_y / nodes.length;
  return [average_x, average_y];
};
