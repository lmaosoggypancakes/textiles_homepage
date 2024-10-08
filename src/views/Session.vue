<template>
  <main class="h-full flex flex-col justify-center items-center relative">
    <Sider
      @setStretchification="(s: number) => {stretchification = s;}"
      @setStretchDepth="(d: number) => {stretchDepth = d;}"
      @setTime="(t: number) => {time = t;}"
      @resetConstraints="resetConstraints"
      @enterBreakoutMode="enterBreakoutMode"
    />
    <div
      class="h-full flex flex-col justify-center items-center mx-auto relative w-full"
    >
      <div role="tablist" class="tabs tabs-lifted">
        <a
          role="tab"
          class="tab"
          v-for="layer in Object.keys(circuit?.layers ?? {})"
          :class="
            layer == selectedLayer && 'tab-active [--tab-bg:#ebbcba] text-base'
          "
          @click="selectedLayer = layer"
          >{{ layer }}</a
        >
      </div>
      <span
        class="bg-warning/40 text-warning rounded font-semibold px-4 py-1 mb-8"
        v-if="highlightedNode && enableDrawConstraint"
        >Draw a (small) shape around {{ highlightedNode.ref }}</span
      >
      <span
        class="bg-foam/40 text-foam rounded font-semibold px-4 py-1 mb-8"
        v-if="message"
        >{{ message }}</span
      >
      <span
        class="bg-foam/40 text-foam rounded font-semibold px-4 py-1 mb-8"
        v-if="inBreakoutMode"
      >
        Choose the nodes to comprise a breakout
        <span
          class="font-bold underline cursor-pointer ml-4"
          @click="leaveBreakoutMode"
          >done</span
        >
      </span>
      <canvas
        width="500"
        height="500"
        class="border-2 border-rose bg-rose/10 rounded-md z-1"
        ref="canvas"
        @mousemove="handleDrag"
        @mousedown="handleDrawStart"
        @mouseup="handleDrawEnd"
        @click="handleClick"
      ></canvas>
      <div class="flex justify-center items-center mt-4">
        <Button class="rounded-r-none">Save</Button>
        <Button class="rounded-r-none rounded-l-none" @click="getSVG"
          >SVG</Button
        >
        <Button class="rounded-l-none" @click="getProcessing"
          >Processing</Button
        >
      </div>
      <div
        class="absolute top-96 right-4 bg-surface rounded-md w-96 text-text px-4 py-6"
        v-if="breakouts.length > 0"
      >
        <span class="font-bold">Breakouts</span>
        <div class="border-b-2 border-highlight my-2"></div>
        <ul v-for="breakout in breakouts">
          <li>
            <span>Ref</span>
            <span class="float-right">{{ breakout.ref }}</span>
          </li>
          <li>
            <span>Pins</span>
            <span class="float-right">{{ breakout.pins }}</span>
          </li>
          <li>
            <span>Nodes</span>
            <ul class="float-right">
              <li v-for="node in breakout.nodes">{{ node.ref }}</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </main>
  <ModuleMenu
    :pos="selectedModulePos"
    :module-ref="selectedModule ?? ''"
    :module-radius="selectedModuleRadius"
    @editModule="editModuleHandler"
    @move="moveModuleHandler"
    @rotate="rotateModuleHandler"
    @moveLayer="moveLayerHandler"
    @mergeModules="mergeModulesActionHandler"
    @changeRadius="changeRadiusHandler"
    v-if="
      showModuleMenu
        ? circuit?.layers[selectedLayer].modules[selectedModule ?? ''] ?? ''
        : null
    "
  />
  <ComponentMenu
    :pos="selectedComponentPos"
    :componentRef="selectedComponent ?? ''"
    @move="moveComponentHandler"
    @rotate="rotateComponentHandler"
    v-if="
      showComponentMenu
        ? circuit?.layers[selectedLayer].modules[selectedModule ?? '']
            .components[selectedComponent ?? ''] ?? ''
        : null
    "
  />
  <div
    class="absolute p-1 m-1 hover:cursor-pointer hover:bg-[#3e3843] rounded-xl"
    :style="{
      left: canvas?.getBoundingClientRect().left + 'px',
      top: canvas?.getBoundingClientRect().top + 'px',
    }"
    @click="viewLayerHandler"
    v-if="canvasMode === 'view_module' ? true : null"
  >
    <ArrowsPointingInIcon class="w-8 h-8 text-white" />
  </div>
  <div
    class="absolute p-1 m-1 hover:cursor-pointer hover:bg-[#3e3843] rounded-xl"
    :style="{
      left: canvas?.getBoundingClientRect().left + 'px',
      top: canvas?.getBoundingClientRect().top + 'px',
    }"
    @click="viewLayerHandler"
    v-if="canvasMode === 'merge_modules' ? true : null"
  >
    <XMarkIcon class="w-8 h-8 text-white" />
  </div>
  <div
    class="absolute w-24 p-1 m-1 text-center bg-iris font-semibold hover:cursor-pointer hover:bg-iris/80 rounded-sm"
    :style="{
      left: `${
        (canvas?.getBoundingClientRect().left ?? 0) +
        (canvas?.getBoundingClientRect().width ?? 0) / 2
      }px`,
      top: `${(canvas?.getBoundingClientRect().top ?? 0) + 8}px`,
      marginLeft: '-48px',
    }"
    @click="mergeModulesHandler"
    v-if="canvasMode === 'merge_modules' ? true : null"
  >
    Merge
  </div>
  <div
    class="absolute w-10 p-1 m-1 text-center bg-iris font-semibold hover:cursor-pointer hover:bg-iris/80 rounded-sm"
    :style="{
      left: `${
        (canvas?.getBoundingClientRect().left ?? 0) +
        (canvas?.getBoundingClientRect().width ?? 0)
      }px`,
      top: `${(canvas?.getBoundingClientRect().top ?? 0) + 8}px`,
      marginLeft: '-48px',
    }"
    @click="drawTracesHandler"
    v-if="canvasMode === 'view_module' ? true : null"
  >
    <WrenchIcon />
  </div>
  <div
    class="absolute p-1 m-1 text-center text-white font-semibold bg-transparent"
    :style="{
      left: `${canvas?.getBoundingClientRect().left ?? 0}px`,
      top: `${(canvas?.getBoundingClientRect().top ?? 0) + 8}px`,
      width: '500px',
    }"
    v-if="showCanvasMessage ? true : null"
  >
    {{ canvasMessage }}
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type PhysicalNode,
  type Constraint,
  type Breakout,
  type Circuit,
  type Position,
  type Netlist,
  type ConnectionNode,
} from "../../types";
import { isIn } from "@/../util";

import svg from "@/assets/module.svg";
import { _renderCircuit, _renderLayer, _renderModule } from "@/features/render";
import {
  _mergeModules,
  addPosition,
  eqPosition,
  getComponentClicked,
  getComponentConnections,
  getModuleClicked,
  getMousePosOnCanvas,
  getNetName,
  getPinClicked,
  getTraceBendPoints,
  getZoomScale,
  moveComponent,
  moveModule,
  rotate90Component,
  rotate90Module,
  updateModuleRadius,
  updateTrace,
} from "@/features/editCircuit";
import ModuleMenu from "@/components/ModuleMenu.vue";
import {
  ArrowsPointingInIcon,
  PencilIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import ComponentMenu from "@/components/ComponentMenu.vue";
import { useWebSocket } from "@/stores/websocket";
import { storeToRefs } from "pinia";
import { useNetlistStore } from "@/stores/netlist";
const img = new Image();
img.src = svg;

const selectedLayer = ref("");

const selectedModule = ref<string | null>(null);
const selectedModulePos = ref<Position>({ x: 0.0, y: 0.0 });
const selectedModuleRadius = ref<number>(0);
const highlightedModule = ref<string | null>(null);
const showModuleMenu = ref<boolean>(false);
const mergeModules = ref<string[]>([]);
const selectedTrace = ref<string | string[]>([]);
const drawnPoints = ref<Position[]>([]);
const destPins = ref<ConnectionNode[]>([]);

const selectedComponent = ref<string | null>(null);
const selectedComponentPos = ref<Position>({ x: 0.0, y: 0.0 });
const highlightedComponent = ref<string | null>(null);
const showComponentMenu = ref<boolean>(false);

const canvasMode = ref<
  | "view_layer"
  | "view_module"
  | "move_module"
  | "move_component"
  | "merge_modules"
  | "draw_traces"
>("view_layer");
const showCanvasMessage = ref<boolean>(false);
const canvasMessage = ref<string>("");

const canvas = ref<HTMLCanvasElement | null>(null);
const message = ref("");
const isClicked = ref(false);
const router = useRouter();

const nodes = ref<PhysicalNode[]>([]);
const nodes_original = ref<PhysicalNode[]>([]);
const points = ref<any[]>([]);
const constraints = ref<Constraint[]>([]);

const enableDrawConstraint = ref(false);
const initDrawX = ref();
const initDrawY = ref();
const time = ref(0);

const highlightedNode = ref<PhysicalNode | null>(null);
const breakouts = ref<Breakout[]>([]);
const nextBreakoutNodes = ref<PhysicalNode[]>([]);
const inBreakoutMode = ref(false);
const drawX = ref();
const drawY = ref();

const stretchification = ref(1);
const stretchDepth = ref(11);

const circuit = ref<Circuit | null>(null);

const paths = ref<[number, number][][]>([]);
// const showBreakouts = ref(false);
let currentPathIndex = -1;
const netlist = ref<Netlist>({ libraries: [], nets: [], parts: [] });
const _netlist = storeToRefs(useNetlistStore()).netlist.value;
if (_netlist == "") {
  alert("netlist not defined!");
  router.push("/");
} else {
  netlist.value = JSON.parse(_netlist);
}

function getCtx(): CanvasRenderingContext2D | null {
  if (!canvas.value) {
    // alert("no canvas");
    return null;
  }
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) {
    alert("no ctx");
    return null;
  }
  return ctx;
}

function renderView() {
  if (
    canvasMode.value === "view_layer" ||
    canvasMode.value === "move_module" ||
    canvasMode.value === "merge_modules"
  ) {
    renderLayer();
  } else if (
    canvasMode.value === "view_module" ||
    canvasMode.value === "move_component" ||
    canvasMode.value === "draw_traces"
  ) {
    renderModule();
  }
}

function renderLayer() {
  const ctx = getCtx();
  if (!ctx) return;
  clearCanvas();

  if (!circuit.value) {
    return;
  }
  _renderLayer(
    circuit.value.layers[selectedLayer.value],
    selectedModule.value,
    highlightedModule.value,
    mergeModules.value,
    circuit.value,
    ctx
  );
}

function renderModule() {
  const ctx = getCtx();
  if (!ctx) return;
  clearCanvas();

  if (!circuit.value) {
    return;
  }

  _renderModule(
    circuit.value.layers[selectedLayer.value].modules[
      selectedModule.value ?? ""
    ],
    selectedComponent.value,
    highlightedComponent.value,
    circuit.value,
    ctx,
    false,
    false,
    true
  );
}

function editModuleHandler() {
  canvasMode.value = "view_module";
  showModuleMenu.value = false;
  renderModule();
}

function moveModuleHandler() {
  canvasMode.value = "move_module";
  showModuleMenu.value = false;
  document.body.style.cursor = "move";
  renderLayer();
}

function moveLayerHandler() {}

function mergeModulesActionHandler() {
  canvasMode.value = "merge_modules";
  showModuleMenu.value = false;
  if (selectedModule.value) {
    mergeModules.value = [selectedModule.value];
  }
  renderView();
}

function viewLayerHandler() {
  canvasMode.value = "view_layer";
  showModuleMenu.value = true;
  showComponentMenu.value = false;
  renderView();
}

function moveComponentHandler() {
  canvasMode.value = "move_component";
  showComponentMenu.value = false;
  document.body.style.cursor = "move";
  renderView();
}

function rotateComponentHandler() {
  canvasMode.value = "view_module";
  if (!circuit.value) {
    return;
  }
  if (!selectedModule.value) {
    return;
  }
  if (!selectedComponent.value) {
    return;
  }
  circuit.value = rotate90Component(
    selectedComponent.value,
    selectedModule.value,
    selectedLayer.value,
    circuit.value
  );
  renderView();
}

function mergeModulesHandler() {
  canvasMode.value = "view_module";
  if (!circuit.value) {
    return;
  }
  const [c, mRef] = _mergeModules(
    mergeModules.value,
    selectedLayer.value,
    circuit.value
  );
  circuit.value = c;
  selectedModule.value = mRef;
  console.log(mRef);
  renderView();
}

function rotateModuleHandler() {
  canvasMode.value = "view_layer";
  if (!circuit.value) {
    return;
  }
  if (!selectedModule.value) {
    return;
  }
  circuit.value = rotate90Module(
    selectedModule.value,
    selectedLayer.value,
    circuit.value
  );
  renderView();
}

function drawTracesHandler() {
  canvasMode.value = "draw_traces";
  document.body.style.cursor = "crosshair";
  showCanvasMessage.value = true;
  canvasMessage.value = "Select the first pin to connect";
  renderView();
}

function changeRadiusHandler(newRadius: number) {
  if (!selectedModule.value) {
    return;
  }
  if (!circuit.value) {
    return;
  }
  circuit.value = updateModuleRadius(
    newRadius,
    selectedModule.value,
    selectedLayer.value,
    circuit.value
  );
  renderView();
}

const handleDrawStart = (event: MouseEvent) => {
  if (enableDrawConstraint.value) {
    paths.value.push([]);
    currentPathIndex++;
    drawX.value = event.offsetX;
    drawY.value = event.offsetY;
    isClicked.value = true;
    initDrawX.value = event.offsetX;
    initDrawY.value = event.offsetY;
    paths.value[currentPathIndex].push([drawX.value, drawY.value]);
  }
};

const handleDrawEnd = (event: MouseEvent) => {
  if (enableDrawConstraint.value) {
    isClicked.value = false;
    if (
      !(
        initDrawX.value - 20 <= event.offsetX &&
        event.offsetX <= initDrawX.value + 20 &&
        initDrawY.value - 20 <= event.offsetY &&
        event.offsetY <= initDrawY.value + 20
      )
    ) {
      paths.value.pop();
      currentPathIndex--;
      message.value = "make sure draw a full shape";
      setTimeout(() => (message.value = ""), 3000);
    }
    if (!highlightedNode.value) return;
    if (isIn(paths.value[currentPathIndex], highlightedNode.value)) {
      constraints.value.push({
        node: highlightedNode.value,
        shape: paths.value[currentPathIndex],
      });
    } else {
      paths.value.pop();
      currentPathIndex--;
      message.value = `make sure your shape is actually within ${highlightedNode.value.ref}`;
      setTimeout(() => (message.value = ""), 3000);
    }
    drawX.value = null;
    drawY.value = null;
    enableDrawConstraint.value = false;
  }
};

const handleDrag = (event: MouseEvent) => {
  if (enableDrawConstraint.value) {
    const canvas = event.target as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (isClicked.value) {
      drawX.value = event.offsetX;
      drawY.value = event.offsetY;
      paths.value[currentPathIndex].push([drawX.value, drawY.value]);
    }
  }
  switch (canvasMode.value) {
    case "view_layer":
    case "merge_modules": {
      const moduleRef = getModuleClicked(
        event.offsetX,
        event.offsetY,
        circuit.value?.layers[selectedLayer.value] ?? null
      );
      if (moduleRef) {
        highlightedModule.value = moduleRef;
        document.body.style.cursor = "pointer";
      } else {
        highlightedModule.value = null;
        document.body.style.cursor = "auto";
      }
      break;
    }
    case "view_module": {
      const componentRef = getComponentClicked(
        event.offsetX,
        event.offsetY,
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ] ?? null,
        true
      );
      if (componentRef) {
        highlightedComponent.value = componentRef;
        document.body.style.cursor = "pointer";
      } else {
        highlightedComponent.value = null;
        document.body.style.cursor = "auto";
      }
      break;
    }
    case "draw_traces": {
      const module =
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ];
      if (!module) {
        return;
      }
      const componentRef = getComponentClicked(
        event.offsetX,
        event.offsetY,
        module,
        true
      );
      if (componentRef) {
        highlightedComponent.value = componentRef;
      } else {
        highlightedComponent.value = null;
      }
      if (typeof selectedTrace.value === "string") {
        if (!circuit.value) {
          break;
        }
        if (!selectedModule.value) {
          break;
        }
        const pointsToDraw = [
          ...drawnPoints.value,
          ...getTraceBendPoints(
            getMousePosOnCanvas(event.offsetX, event.offsetY, module),
            drawnPoints.value,
            module
          ),
        ];
        circuit.value = updateTrace(
          pointsToDraw,
          selectedTrace.value,
          selectedModule.value,
          selectedLayer.value,
          circuit.value
        );
      }
      break;
    }
    case "move_module": {
      if (!circuit.value) {
        break;
      }
      if (!selectedModule.value) {
        break;
      }
      circuit.value = moveModule(
        event.offsetX,
        event.offsetY,
        selectedModule.value,
        selectedLayer.value,
        circuit.value
      );
      break;
    }
    case "move_component": {
      if (!circuit.value) {
        break;
      }
      if (!selectedModule.value) {
        break;
      }
      if (!selectedComponent.value) {
        break;
      }

      circuit.value = moveComponent(
        event.offsetX,
        event.offsetY,
        selectedComponent.value,
        selectedModule.value,
        selectedLayer.value,
        circuit.value
      );
      break;
    }
  }
  renderView();
};

const handleClick = (event: MouseEvent) => {
  if (!canvas.value) {
    return null;
  }
  switch (canvasMode.value) {
    case "view_layer": {
      const moduleRef = getModuleClicked(
        event.offsetX,
        event.offsetY,
        circuit.value?.layers[selectedLayer.value] ?? null
      );
      if (moduleRef) {
        if (selectedModule.value === moduleRef) {
          selectedModule.value = null;
        } else {
          const module =
            circuit.value?.layers[selectedLayer.value].modules[moduleRef];
          if (!module) {
            showModuleMenu.value = false;
            return null;
          }
          selectedModule.value = moduleRef;
          selectedModulePos.value = {
            x:
              canvas.value.getBoundingClientRect().left +
              module.pos.x +
              module.radius * 1.5,
            y:
              canvas.value.getBoundingClientRect().top +
              module.pos.y -
              module.radius,
          };
          selectedModuleRadius.value = module.radius;
          showModuleMenu.value = true;
        }
      } else {
        showModuleMenu.value = false;
        selectedModule.value = null;
      }
      break;
    }
    case "view_module": {
      const componentRef = getComponentClicked(
        event.offsetX,
        event.offsetY,
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ] ?? null,
        true
      );
      if (componentRef) {
        if (selectedComponent.value === componentRef) {
          selectedComponent.value = null;
        } else {
          const module =
            circuit.value?.layers[selectedLayer.value].modules[
              selectedModule.value ?? ""
            ];
          if (!module) {
            showComponentMenu.value = false;
            return null;
          }
          const component = module.components[componentRef ?? ""];
          if (!component) {
            showComponentMenu.value = false;
            return null;
          }
          selectedComponent.value = componentRef;
          selectedComponentPos.value = {
            x:
              canvas.value.getBoundingClientRect().left +
              250 +
              getZoomScale(module) * component.pos.x +
              getZoomScale(module) * (component.width / 2) * 1.5,
            y:
              canvas.value.getBoundingClientRect().top +
              250 +
              getZoomScale(module) * component.pos.y -
              getZoomScale(module) * (component.height / 2),
          };
          showComponentMenu.value = true;
        }
      } else {
        selectedComponent.value = null;
        showComponentMenu.value = false;
      }
      break;
    }
    case "move_module": {
      const module =
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ];
      if (!module) {
        break;
      }
      canvasMode.value = "view_layer";
      document.body.style.cursor = "auto";
      showModuleMenu.value = true;
      selectedModulePos.value = {
        x:
          canvas.value.getBoundingClientRect().left +
          module.pos.x +
          module.radius * 1.5,
        y:
          canvas.value.getBoundingClientRect().top +
          module.pos.y -
          module.radius,
      };
      selectedModuleRadius.value = module.radius;
      break;
    }
    case "move_component": {
      const module =
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ];
      if (!module) {
        showComponentMenu.value = false;
        return null;
      }
      const component = module.components[selectedComponent.value ?? ""];
      if (!component) {
        showComponentMenu.value = false;
        return null;
      }
      canvasMode.value = "view_module";
      document.body.style.cursor = "auto";
      showComponentMenu.value = true;
      selectedComponentPos.value = {
        x:
          canvas.value.getBoundingClientRect().left +
          250 +
          getZoomScale(module) * component.pos.x +
          getZoomScale(module) * (component.width / 2) * 1.5,
        y:
          canvas.value.getBoundingClientRect().top +
          250 +
          getZoomScale(module) * component.pos.y -
          getZoomScale(module) * (component.height / 2),
      };
      break;
    }
    case "merge_modules": {
      const moduleRef = getModuleClicked(
        event.offsetX,
        event.offsetY,
        circuit.value?.layers[selectedLayer.value] ?? null
      );
      if (moduleRef) {
        if (moduleRef === selectedModule.value) {
          break;
        }
        if (mergeModules.value.includes(moduleRef)) {
          mergeModules.value = mergeModules.value.filter(
            (ref) => ref !== moduleRef
          );
        } else {
          mergeModules.value = mergeModules.value.concat([moduleRef]);
        }
      }
      break;
    }
    case "draw_traces": {
      const module =
        circuit.value?.layers[selectedLayer.value].modules[
          selectedModule.value ?? ""
        ];
      if (!module) {
        break;
      }
      const componentRef = getComponentClicked(
        event.offsetX,
        event.offsetY,
        module,
        true
      );
      const pinNum = getPinClicked(
        event.offsetX,
        event.offsetY,
        componentRef,
        module,
        true
      );

      if (componentRef && pinNum) {
        const clickedPinPos = addPosition(
          module.components[componentRef].pos,
          module.components[componentRef].pin_coords[pinNum - 1]
        );
        const netName = getNetName(module.components[componentRef], pinNum - 1);
        if (
          typeof selectedTrace.value === "object" &&
          selectedTrace.value.length === 0
        ) {
          drawnPoints.value = [clickedPinPos];
          selectedTrace.value = getComponentConnections(componentRef, module)
            .filter((trace) => trace.a.pin === pinNum || trace.b.pin === pinNum)
            .map((trace) => trace.ref);
          canvasMessage.value = "Select the second pin to connect";
          break;
        } else if (
          typeof selectedTrace.value === "object" &&
          drawnPoints.value.length === 1
        ) {
          const firstPoint = drawnPoints.value[0];
          const traceToDraw = selectedTrace.value.reduce<string>(
            (result, tRef): string => {
              if (result.length > 0) {
                return result;
              }
              const trace = module.connections[tRef];
              if (!eqPosition(firstPoint, clickedPinPos)) {
                if (
                  (trace.a.ref === componentRef && trace.a.pin === pinNum) ||
                  (trace.b.ref === componentRef && trace.b.pin === pinNum)
                ) {
                  return trace.ref;
                }
              }
              return result;
            },
            ""
          );
          if (traceToDraw !== "") {
            selectedTrace.value = traceToDraw;
            canvasMessage.value = "Draw the line";
          }
          break;
        } else if (
          typeof selectedTrace.value === "string" &&
          drawnPoints.value.length >= 1
        ) {
          const trace = module.connections[selectedTrace.value];
          const firstPoint = drawnPoints.value[0];
          const pinPos = module.components[componentRef].pin_coords[pinNum - 1];
          if (
            trace.a.ref === componentRef &&
            trace.a.pin === pinNum &&
            !eqPosition(firstPoint, pinPos)
          ) {
            const bendPoints = getTraceBendPoints(
              trace.a.pos,
              drawnPoints.value,
              module
            );
            trace.points = drawnPoints.value.concat(bendPoints);
            canvasMode.value = "view_module";
            canvasMessage.value = "";
            showCanvasMessage.value = false;
            selectedTrace.value = [];
            drawnPoints.value = [];
            break;
          } else if (
            trace.b.ref === componentRef &&
            trace.b.pin === pinNum &&
            !eqPosition(firstPoint, pinPos)
          ) {
            const bendPoints = getTraceBendPoints(
              trace.b.pos,
              drawnPoints.value,
              module
            );
            trace.points = drawnPoints.value.concat(bendPoints);
            canvasMode.value = "view_module";
            canvasMessage.value = "";
            showCanvasMessage.value = false;
            selectedTrace.value = [];
            drawnPoints.value = [];
            break;
          } else {
            break;
          }
        }
      } else if (typeof selectedTrace.value === "string") {
        const points = getTraceBendPoints(
          getMousePosOnCanvas(event.offsetX, event.offsetY, module),
          drawnPoints.value,
          module
        );
        drawnPoints.value = drawnPoints.value.concat([points[0]]);
        break;
      }
    }
  }
  renderView();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    switch (canvasMode.value) {
      case "view_module": {
        canvasMode.value = "view_layer";
        document.body.style.cursor = "auto";
        selectedModule.value = null;
        showComponentMenu.value = false;
        break;
      }
      case "view_layer": {
        if (showModuleMenu.value) {
          showModuleMenu.value = false;
          break;
        } else if (selectedModule.value != null) {
          selectedModule.value = null;
          break;
        }
      }
      case "move_component": {
        if (!selectedModule.value) {
          return;
        }
        if (!selectedComponent.value) {
          return;
        }
        if (!circuit.value) {
          return;
        }
        if (!canvas.value) {
          return;
        }
        const module =
          circuit.value?.layers[selectedLayer.value].modules[
            selectedModule.value ?? ""
          ];
        if (!module) {
          showComponentMenu.value = false;
          return null;
        }
        const component = module.components[selectedComponent.value ?? ""];
        if (!component) {
          return;
        }
        circuit.value = moveComponent(
          selectedComponentPos.value.x -
            getZoomScale(module) * (component.width / 2) * 1.5 -
            canvas.value.getBoundingClientRect().left,
          selectedComponentPos.value.y +
            getZoomScale(module) * (component.height / 2) -
            canvas.value.getBoundingClientRect().top,
          selectedComponent.value,
          selectedModule.value,
          selectedLayer.value,
          circuit.value
        );
        canvasMode.value = "view_module";
        showComponentMenu.value = true;
        break;
      }
      case "move_module": {
        if (!selectedModule.value) {
          return;
        }
        if (!circuit.value) {
          return;
        }
        if (!canvas.value) {
          return;
        }
        const module =
          circuit.value?.layers[selectedLayer.value].modules[
            selectedModule.value
          ];
        if (!module) {
          return;
        }
        circuit.value = moveModule(
          selectedModulePos.value.x -
            module.radius * 1.5 -
            canvas.value.getBoundingClientRect().left,
          selectedModulePos.value.y +
            module.radius -
            canvas.value.getBoundingClientRect().top,
          selectedModule.value,
          selectedLayer.value,
          circuit.value
        );
        canvasMode.value = "view_layer";
        showModuleMenu.value = true;
        break;
      }
      case "merge_modules": {
        canvasMode.value = "view_layer";
        mergeModules.value = [];
        showModuleMenu.value = true;
        break;
      }
      case "draw_traces": {
        if (!selectedModule.value) {
          return;
        }
        if (!circuit.value) {
          return;
        }
        canvasMode.value = "view_module";
        drawnPoints.value = [];
        document.body.style.cursor = "auto";
        showCanvasMessage.value = false;
        canvasMessage.value = "";
        if (typeof selectedTrace.value === "string") {
          circuit.value = updateTrace(
            drawnPoints.value,
            selectedTrace.value,
            selectedModule.value,
            selectedLayer.value,
            circuit.value
          );
        }
        selectedTrace.value = [];
        break;
      }
    }
  }
  renderView();
};

const clearCanvas = () => {
  if (!canvas.value) {
    // alert("no canvas");
    return null;
  }
  const ctx = canvas.value?.getContext("2d");
  if (!ctx) {
    alert("no ctx");
    return null;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.restore();
};

const resetConstraints = () => {
  paths.value = [];
  currentPathIndex = -1;
  clearCanvas();
  // renderGraph();
  renderView();
};

const enterBreakoutMode = () => {
  inBreakoutMode.value = true;
};

const leaveBreakoutMode = () => {
  let pins = nextBreakoutNodes.value.length;
  if (0 <= pins && pins <= 4) {
    pins = 4;
  } else if (4 < pins && pins <= 6) {
    pins = 6;
  } else {
    pins = 12;
  }
  breakouts.value.push({
    pins: pins as 4 | 6 | 12,
    nodes: nextBreakoutNodes.value,
    ref: `B${breakouts.value.length}`,
  });

  nodes.value.forEach((node) => {
    node.color = "#ebbcba";
  });
  inBreakoutMode.value = false;
  // renderGraph();
  renderView();
};
const getSVG = () => {
  ws.send(
    JSON.stringify({
      label: "get_svg",
      // depth: stretchDepth.value / 10,
      // nodes: nodes.value,
      // stretchification: stretchification.value,
      // points: points.value,
      circuit: circuit.value,
    })
  );
};

const getProcessing = () => {
  ws.send(
    JSON.stringify({
      label: "give_processing_pwease",
      depth: stretchDepth.value / 10,
      nodes: nodes.value,
      stretchification: stretchification.value,
      points: points.value,
    })
  );
};
const onNewGraph = (newCircuit: Circuit) => {
  circuit.value = newCircuit;
  const layer_refs = Object.keys(circuit.value?.layers ?? {});
  document.addEventListener("keydown", handleKeyDown);
  if (layer_refs && layer_refs.length > 0) {
    selectedLayer.value = layer_refs[0];
    renderView();
  }
};
const onNewPath = (newNodes: PhysicalNode[], newPoints: any[]) => {
  clearCanvas();
  nodes.value = newNodes.map((node: PhysicalNode) => ({
    ...node,
    color: "#ebbcba",
  }));
  if (nodes_original.value.length == 0) {
    nodes_original.value = nodes.value;
  }
  points.value = newPoints;
  // renderGraph();
  renderView();
};
const { ws, open } = useWebSocket(
  "ws://localhost:8000/session",
  netlist.value,
  { stretchification: stretchification.value, depth: stretchDepth.value },
  onNewGraph,
  onNewPath
);
watch([stretchDepth, stretchification, time], (v) => {
  // clearCanvas()
  if (open.value) {
    console.log(v[0], v[1], v[2]);
    ws.send(
      JSON.stringify({
        label: "after_time",
        stretchification: v[0],
        depth: v[1],
        nodes: nodes_original.value,
        time: +time.value,
        constraints: constraints.value,
      })
    );
  }
});
</script>
