// a netlist type according to kinparse, reduced to assume only 1 sheet
export interface Netlist {
  libraries: {
    name: string;
    uri: string;
  }[];
  parts: {
    ref: string;
    value: string;
    name: string;
    footprint: string;
  }[];
  nets: {
    name: string;
    code: number;
    pins: {
      ref: string;
      num: number;
    }[];
  }[];
}

export interface Vector {
  x: number;
  y: number;
  angle: number;
  mag: number;
}

export interface PhysicalNode {
  ref: string;
  acc: Vector;
  vel: Vector;
  x: number;
  y: number;
  color: string;
  footprint: string;
}

export interface PhysicalConnection {
  one: PhysicalNode;
  two: PhysicalNode;
  ref: string;
}

export interface Constraint {
  // represents a constraint of a node during the simulation.
  // during the simulation, any node that has a constraint
  // cannot exit the shape defined by an array of point-tos
  node: PhysicalNode;
  shape: [number, number][];
}

export interface Breakout {
  nodes: PhysicalNode[];
  pins: 4 | 6 | 12 | 18;
  ref: string;
}

export interface BreakoutConnection {
  connection: PhysicalConnection;
  one: Breakout;
  two: Breakout;
  ref: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  paths: [Position, Position][];
}

export interface Footprint {
  paths: Shape[][];
  pins: Position[];
  width: number;
  height: number;
}

export interface ConnectionNode {
  ref: string;
  pin: number | string;
  pos: Position;
  net_name: string;
}

export interface Trace {
  ref: string;
  a: ConnectionNode;
  b: ConnectionNode;
  points: Position[];
  net_name: string;
}

export interface Component {
  ref: string;
  name: string;
  pins: number;
  pin_coords: Position[];
  pos: Position;
  is_pad: boolean;
  width: number;
  height: number;
  angle: number;
  net_names: string[];
}

export interface Module {
  ref: string;
  components: { [x: string]: Component };
  connections: { [x: string]: Trace };
  pads: Component[];
  radius: number;
  pos: Position;
  angle: number;
}

export interface Layer {
  ref: string;
  modules: { [x: string]: Module };
  connections: { [x: string]: Trace };
  vias: Module[];
}

export interface Circuit {
  layers: { [x: string]: Layer };
  vias: Trace[];
  footprints: { [x: string]: Footprint };
}
