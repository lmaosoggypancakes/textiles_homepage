<!--
    TODO:
    - allow movement of nodes beyond initial position
        - afterwards, any generations must be 'locked in'
    -
-->
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
      <ul
        class="absolute top-4 right-4 bg-surface rounded-md w-96 text-text px-4 py-6"
        v-if="highlightedNode"
      >
        <span class="font-bold">Node Properties</span>
        <div class="border-b-2 border-highlight my-2"></div>
        <li>
          <span>Ref</span>
          <span class="float-right">{{ highlightedNode.ref }}</span>
        </li>
        <li>
          <span>X</span>
          <span class="float-right">{{ highlightedNode.x.toFixed(2) }}</span>
        </li>
        <li>
          <span>Y</span>
          <span class="float-right">{{ highlightedNode.y.toFixed(2) }}</span>
        </li>
        <li>
          <span>Velocity</span>
          <span class="float-right">{{
            prettyVector(highlightedNode.vel)
          }}</span>
        </li>
        <li>
          <span>Acceleration</span>
          <span class="float-right">{{
            prettyVector(highlightedNode.acc)
          }}</span>
        </li>
        <li>
          <span>Pins</span>
          <!-- <span class="float-right">{{  highlightedNode }}</span> -->
        </li>
        <li>
          <span>Name</span>
          <!-- <span class="float-right">{{  highlightedNode }}</span> -->
        </li>
        <Button class="mt-2" @click="enableDrawConstraint = true"
          >Add Constraint</Button
        >
      </ul>
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
    :module_ref="selectedModule ?? ''"
    @editModule="editModuleHandler"
    @move="moveModuleHandler"
    @moveLayer="moveLayerHandler"
    @mergeModules="mergeModulesHandler"
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
    @rotate="rotateHandler"
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
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  type PhysicalNode,
  type Constraint,
  type Breakout,
  type Circuit,
  type Position,
} from "../../types";
import { isIn } from "@/../util";

import svg from "@/assets/module.svg";
import { _renderCircuit, _renderLayer, _renderModule } from "@/features/render";
import {
  getComponentClicked,
  getModuleClicked,
  moveComponent,
  moveModule,
} from "@/features/handleUser";
import ModuleMenu from "@/components/ModuleMenu.vue";
import { ArrowsPointingInIcon } from "@heroicons/vue/24/outline";
import ComponentMenu from "@/components/ComponentMenu.vue";
const img = new Image();
img.src = svg;

const selectedLayer = ref("");

const selectedModule = ref<string | null>(null);
const selectedModulePos = ref<Position>({ x: 0.0, y: 0.0 });
const highlightedModule = ref<string | null>(null);
const showModuleMenu = ref<boolean>(false);

const selectedComponent = ref<string | null>(null);
const selectedComponentPos = ref<Position>({ x: 0.0, y: 0.0 });
const highlightedComponent = ref<string | null>(null);
const showComponentMenu = ref<boolean>(false);

const canvasMode = ref<
  "view_layer" | "view_module" | "move_module" | "move_component"
>("view_layer");

const canvas = ref<HTMLCanvasElement | null>(null);
const message = ref("");
const isClicked = ref(false);
const route = useRoute();
const router = useRouter();

const nodes = ref<PhysicalNode[]>([]);
const nodes_original = ref<PhysicalNode[]>([]);
const points = ref([]);
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

if (!route.query.netlist) {
  router.push("/");
}

const circuit = ref<Circuit | null>(null);

const paths = ref<[number, number][][]>([]);
const showBreakouts = ref(false);
let currentPathIndex = -1;

const netlist = JSON.parse(route.query.netlist as string);

const prettyVector = (v: { angle: number; mag: number }) => {
  return `(${v.mag.toFixed(2)}, ${v.angle.toFixed(2)})`;
};

function getCtx(): CanvasRenderingContext2D | null {
  if (!canvas.value) {
    alert("no canvas");
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
  if (canvasMode.value === "view_layer" || canvasMode.value === "move_module") {
    renderLayer();
  } else if (
    canvasMode.value === "view_module" ||
    canvasMode.value === "move_component"
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

function mergeModulesHandler() {}

function viewLayerHandler() {
  canvasMode.value = "view_layer";
  showModuleMenu.value = false;
  renderView();
}

function moveComponentHandler() {
  canvasMode.value = "move_component";
  showComponentMenu.value = false;
  renderView();
}

function rotateHandler() {
  canvasMode.value = "view_module";
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
  console.log(canvasMode.value);
  switch (canvasMode.value) {
    case "view_layer": {
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
    case "move_module": {
      if (!circuit.value) {
        return null;
      }
      if (!selectedModule.value) {
        return null;
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
        return null;
      }
      if (!selectedModule.value) {
        return null;
      }
      if (!selectedComponent.value) {
        return null;
      }

      circuit.value = moveComponent(
        event.offsetX,
        event.offsetY,
        selectedComponent.value,
        selectedModule.value,
        selectedLayer.value,
        circuit.value
      );
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
          const component =
            circuit.value?.layers[selectedLayer.value].modules[
              selectedModule.value ?? ""
            ].components[componentRef ?? ""];
          if (!component) {
            showComponentMenu.value = false;
            return null;
          }
          selectedComponent.value = componentRef;
          selectedComponentPos.value = {
            x:
              canvas.value.getBoundingClientRect().left +
              250 +
              5.0 * component.pos.x +
              5.0 * (component.width / 2) * 1.5,
            y:
              canvas.value.getBoundingClientRect().top +
              250 +
              5.0 * component.pos.y -
              5.0 * (component.height / 2),
          };
          showComponentMenu.value = true;
        }
      } else {
        selectedComponent.value = null;
        highlightedComponent.value = null;
      }
      break;
    }
    case "move_module": {
      canvasMode.value = "view_layer";
      document.body.style.cursor = "auto";
      selectedModule.value = null;
      break;
    }
    case "move_component": {
      canvasMode.value = "view_module";
      document.body.style.cursor = "auto";
      selectedComponent.value = null;
      break;
    }
  }
  renderView();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    canvasMode.value = "view_layer";
    document.body.style.cursor = "auto";
    selectedModule.value = null;
    renderView();
  }
};

const clearCanvas = () => {
  if (!canvas.value) {
    alert("no canvas");
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
      label: "give_svg_pwease",
      depth: stretchDepth.value / 10,
      nodes: nodes.value,
      stretchification: stretchification.value,
      points: points.value,
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
const ws = new WebSocket("ws://localhost:8000/session");
const wsOpen = ref(false);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.label);
  // console.log(`[${data.label}] ${data.message || data.nodes}`)
  if (data.label == "graph") {
    circuit.value = data.circuit;
    const layer_refs = Object.keys(circuit.value?.layers ?? {});
    document.addEventListener("keydown", handleKeyDown);
    if (layer_refs && layer_refs.length > 0) {
      selectedLayer.value = layer_refs[0];
      renderView();
    }
  }
  if (data.label == "paths") {
    clearCanvas();
    nodes.value = data.nodes.map((node: PhysicalNode) => ({
      ...node,
      color: "#ebbcba",
    }));
    if (nodes_original.value.length == 0) {
      nodes_original.value = nodes.value;
    }
    console.log(data.points);
    points.value = data.points;
    // renderGraph();
    renderView();
  }

  if (data.label == "svg") {
    const blob = new Blob([data.file], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  if (data.label == "processing") {
    const blob = new Blob([data.file], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  if (data.label == "message") {
    alert(data.message);
  }
};
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      label: "netlist",
      data: netlist,
    })
  );
  wsOpen.value = true;
  ws.send(
    JSON.stringify({
      label: "with_stretchification",
      stretchification: stretchification.value,
      depth: stretchDepth.value / 10,
    })
  );
};

watch([stretchDepth, stretchification, time], (v) => {
  // clearCanvas()
  if (wsOpen.value) {
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
