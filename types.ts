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

export interface Footprint {
  paths: [number, number][][][];
  pins: number[][];
}

export interface ConnectionNode {
  ref: string;
  num: number;
}

export interface Connection {
  a: ConnectionNode;
  b: ConnectionNode;
}

export interface Schematic {
  layers: Map<string, Layer>;
  connections: Connection[];
}

export interface Layer {
  ref: string;
  modules: Map<string, Layer>;
  connections: Connection[];
}

export interface Module {
  ref: string;
  components: Map<string, Component>;
  connections: Connection[];
  radius: number;
  pos: Vector;
}

export interface Component {
  ref: string;
  pins: number;
  is_pad: boolean;
  pos: Vector;
}
