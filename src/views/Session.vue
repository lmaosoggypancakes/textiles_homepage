<!--
    TODO:
    - allow movement of nodes beyond initial position
        - afterwards, any generations must be 'locked in'
    -
-->
<template>
    <main class="h-full flex">
        <div class="fixed w-96 h-full bg-surface transition-all rounded-bl-md left-0 z-10 flex flex-col relative"
            :class="!showSidebar && '-translate-x-96'">
            <button
                class="absolute w-16 h-16 -right-16 rounded-tr-md rounded-br-md bg-overlay hover:bg-surface transition-colors hover:border-surface hover:scale-95 p-2"
                @click="showSidebar = !showSidebar">
                <ChevronLeftIcon class="text-rose" v-if="showSidebar" />
                <ChevronRightIcon class="text-rose" v-else />
            </button>
            <div class="px-12 py-8 text-text grow">
                <p class="text-2xl font-bold">Configuration</p>
                <span>Stretchification</span>
                <input type="range" min="1" max="100" value="2" class="w-full" v-model="stretchification" />

                <span>y/w Ratio</span>
                <input type="range" min="1" max="30" value="11" class="w-full" v-model="stretchDepth" />

                <span>Time</span>
                <input type="range" min="0" max="100" value="0" class="w-full" v-model="time" />

                <div class="absolute bottom-2 space-y-2">
                    <Button @click="resetConstraints">Clear Constraints</Button>
                    <Button class="bg-rose hover:bg-rose/80 active:bg-rose/70" @click="enterBreakoutMode">Create Breakouts</Button>
                </div>
            </div>
        </div>
        <div class="h-full flex flex-col justify-center items-center mx-auto relative w-full">
            <span class=" bg-warning/40 text-warning rounded font-semibold px-4 py-1 mb-8"
                v-if="highlightedNode && enableDrawConstraint">Draw a (small) shape around {{ highlightedNode.ref }}</span>
            <span class=" bg-foam/40 text-foam rounded font-semibold px-4 py-1 mb-8"
                v-if="message">{{message}}</span>
            <span class="bg-foam/40 text-foam rounded font-semibold px-4 py-1 mb-8" v-if="inBreakoutMode">
                Choose the nodes to comprise a breakout <span class="font-bold underline cursor-pointer ml-4" @click="leaveBreakoutMode">done</span>
            </span>
            <canvas width="500" height="500" class="border-2 border-rose bg-rose/10 rounded-md z-20" ref="canvas"
                @mousemove="handleDrag" @mousedown="handleDrawStart" @mouseup="handleDrawEnd" @click="handleClick"></canvas>
            <div class="flex justify-center items-center mt-4">
                <Button class="rounded-r-none">Save</Button>
                <Button class="rounded-r-none rounded-l-none" @click="getSVG">SVG</Button>
                <Button class="rounded-l-none" @click="getProcessing">Processing</Button>
            </div>
            <ul class="absolute top-4 right-4 bg-surface rounded-md w-96 text-text px-4 py-6" v-if="highlightedNode">
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
                    <span class="float-right">{{ prettyVector(highlightedNode.vel) }}</span>
                </li>
                <li>
                    <span>Acceleration</span>
                    <span class="float-right">{{ prettyVector(highlightedNode.acc) }}</span>
                </li>
                <li>
                    <span>Pins</span>
                    <!-- <span class="float-right">{{  highlightedNode }}</span> -->
                </li>
                <li>
                    <span>Name</span>
                    <!-- <span class="float-right">{{  highlightedNode }}</span> -->
                </li>
                <Button class="mt-2" @click="enableDrawConstraint = true">Add Constraint</Button>
            </ul>
            <div class="absolute top-96 right-4 bg-surface rounded-md w-96 text-text px-4 py-6" v-if="breakouts.length > 0">
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
                            <li v-for="node in breakout.nodes">{{  node.ref }}</li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, render, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/vue/24/outline";
import { type PhysicalConnection, type PhysicalNode, type Constraint, type Breakout } from "types";
import { centroid, isIn } from "@/../util"

import svg from "@/assets/module.svg"
const img = new Image()
img.src = svg;

const canvas = ref<HTMLCanvasElement | null>(null)
const showSidebar = ref(true)
const message = ref("")
const isClicked = ref(false)
const route = useRoute();
const router = useRouter();

const nodes = ref<PhysicalNode[]>([])
const nodes_original = ref<PhysicalNode[]>([])
const points = ref([])
const constraints = ref<Constraint[]>([])

const enableDrawConstraint = ref(false)
const initDrawX = ref()
const initDrawY = ref()
const time = ref(0);

const highlightedNode = ref<PhysicalNode | null>(null);
const breakouts = ref<Breakout[]>([])
const nextBreakoutNodes = ref<PhysicalNode[]>([])
const inBreakoutMode = ref(false);
const drawX = ref()
const drawY = ref()

const stretchification = ref(1)
const stretchDepth = ref(11)
if (!route.query.netlist) {
    router.push("/")
}

const paths = ref<[number, number][][]>([])
const showBreakouts = ref(false)
let currentPathIndex = -1

const netlist = JSON.parse(route.query.netlist as string);

const prettyVector = (v: { angle: number, mag: number }) => {
    return `(${v.mag.toFixed(2)}, ${v.angle.toFixed(2)})`
}
function renderGraph(nodeList: PhysicalNode[] = nodes.value, pointList: [number, number][][] = points.value) {
    // clearCavnas()
    if (!canvas.value) return;
    
    const ctx = canvas.value?.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0,0,canvas.value.width, canvas.value.height)
    ctx.fillStyle = "#685A80"
    paths.value.forEach(path => {
        ctx.beginPath()
        ctx.strokeStyle = "#c4a7e7"
        ctx.lineWidth = 3;
        ctx.moveTo(path[0][0], path[0][1])
        path.forEach(point => {
            ctx.lineTo(point[0], point[1])
        })
        ctx.fill()
        ctx.stroke()
    })
    ctx.fillStyle = "#ebbcba"
    ctx.lineWidth = 4;
    nodeList.forEach(node => {
        ctx.strokeStyle = ctx.fillStyle = node.color;
        ctx.beginPath()
        ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.font = "18px serif"
        ctx.fillText(node.ref, node.x - 10, node.y + 4)
    })
    ctx.strokeStyle = ctx.fillStyle = "#9ccfd8"
    pointList.forEach(conn => {
        ctx.beginPath()
        ctx.moveTo(conn[0][0], conn[0][1])
        conn.forEach((point: any) => { // fix pls
            ctx.lineTo(point[1], point[2])
        })
        ctx.stroke()
    })

    ctx.strokeStyle = ctx.fillStyle = "#9ccfd8"
    breakouts.value.forEach(b => {
        const [x,y] = centroid(b.nodes);
        ctx.drawImage(img, x-75, y-125)
        // ctx.fillRect(x-25,y-25,50,50);
        // ctx.font = "18px serif"
        // ctx.fillStyle = "#191724"
        // ctx.fillText(b.ref, x-10,y+5)
    })
}

const handleDrawStart = (event: MouseEvent) => {
    if (enableDrawConstraint.value) {
        paths.value.push([])
        currentPathIndex++;
        drawX.value = event.offsetX;
        drawY.value = event.offsetY;
        isClicked.value = true;
        initDrawX.value = event.offsetX;
        initDrawY.value = event.offsetY;
        paths.value[currentPathIndex].push([drawX.value, drawY.value])
    }
}


const handleDrawEnd = (event: MouseEvent) => {
    if (enableDrawConstraint.value) {
        isClicked.value = false;
        if (!(initDrawX.value - 20 <= event.offsetX && event.offsetX <= initDrawX.value + 20 &&
            initDrawY.value - 20 <= event.offsetY && event.offsetY <= initDrawY.value + 20)) {
            paths.value.pop()
            currentPathIndex--;
            message.value = "make sure draw a full shape"
            setTimeout(() => message.value = "", 3000)
        }
        if (!highlightedNode.value) return
        if (isIn(paths.value[currentPathIndex], highlightedNode.value)) {
            constraints.value.push({node: highlightedNode.value, shape: paths.value[currentPathIndex]})            
        } else {
            paths.value.pop()
            currentPathIndex--;
            message.value = `make sure your shape is actually within ${highlightedNode.value.ref}`
            setTimeout(() => message.value = "", 3000)
        }
        drawX.value = null;
        drawY.value = null;
        enableDrawConstraint.value = false;
    }
}
const handleDrag = (event: MouseEvent) => {
    if (enableDrawConstraint.value) {
        const canvas = event.target as HTMLCanvasElement
        if (!canvas) return;
        const ctx = canvas.getContext("2d")
        if (!ctx) return;
        if (isClicked.value) {
            drawX.value = event.offsetX;
            drawY.value = event.offsetY;
            paths.value[currentPathIndex].push([drawX.value, drawY.value])
        }
    }
    nodes.value.forEach(node => {
        if (node.x - 28 <= event.offsetX && event.offsetX <= node.x + 28
            && node.y - 28 <= event.offsetY && event.offsetY <= node.y + 28) {
            if (inBreakoutMode.value) {
                node.color = "#c4a7e7"
            } else {
                node.color = "#9ccfd8"
            }
        } else {
            node.color = inBreakoutMode.value ? node.color : "#ebbcba"
        }
    })

    // clearCavnas()
    renderGraph()
}

const handleClick = (event: MouseEvent) => {
    let flag = false;
    nodes.value.forEach(node => {
        if (node.x - 28 <= event.offsetX && event.offsetX <= node.x + 28
            && node.y - 28 <= event.offsetY && event.offsetY <= node.y + 28) {
            if (inBreakoutMode.value) {
                node.color = "#c4a7e7"
                nextBreakoutNodes.value.push(node)
            } else {
                highlightedNode.value = node;
                flag = true;
            }
        }
    })
    renderGraph();
    if (!flag) highlightedNode.value = null;
}
const clearCavnas = () => {
    if (!canvas.value) {
        alert('no canvas')
        return
    }
    const ctx = canvas.value?.getContext("2d")
    if (!ctx) {
        alert("no ctx")
        return
    }
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
    ctx.restore()
}

const resetConstraints = () => {
    paths.value = []
    currentPathIndex = -1;
    clearCavnas();
    // renderGraph();
}

const enterBreakoutMode = () => {
    inBreakoutMode.value = true;
}

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
        ref: `B${breakouts.value.length}`
    })

    nodes.value.forEach(node => {
        node.color = "#ebbcba"
    })
    inBreakoutMode.value = false;
    renderGraph();
}
const getSVG = () => {
    ws.send(JSON.stringify({label: "give_svg_pwease", 
        depth: stretchDepth.value/10,
        nodes: nodes.value,
        stretchification: stretchification.value,
        points: points.value
    }))
}

const getProcessing = () => {
    ws.send(JSON.stringify({label: "give_processing_pwease", 
        depth: stretchDepth.value/10,
        nodes: nodes.value,
        stretchification: stretchification.value,
        points: points.value
    }))
}
const ws = new WebSocket("ws://localhost:8000/session")
const wsOpen = ref(false)
ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log(data.label)
    // console.log(`[${data.label}] ${data.message || data.nodes}`)
    if (data.label == "graph") {
        // renderInitialGraph(data.nodes, data.points)
    }
    if (data.label == "paths") {
        clearCavnas();
        
        nodes.value = data.nodes.map((node: PhysicalNode) => ({ ...node, color: "#ebbcba" }))
        if (nodes_original.value.length == 0) {
            nodes_original.value = nodes.value
        }
        // console.log(data.points.length)
        points.value = data.points
        renderGraph()
    }

    if (data.label == "svg") {
        const blob = new Blob([data.file], {type: "image/svg+xml"})
        const url = URL.createObjectURL(blob)
        window.open(url)
    }

    if (data.label == "processing") {
        const blob = new Blob([data.file], {type: "text/plain"})
        const url = URL.createObjectURL(blob)
        window.open(url)
    }

    if (data.label == "message") {
        alert(data.message)
    }
}
ws.onopen = () => {
    ws.send(JSON.stringify({
        label: "netlist",
        data: netlist
    }))
    wsOpen.value = true
    ws.send(JSON.stringify({
        label: "with_stretchification",
        stretchification: stretchification.value,
        depth: stretchDepth.value/10
    }))
}


watch([stretchDepth, stretchification, time], (v) => {
    // clearCavnas()
    if (wsOpen.value) {
        console.log(v[0], v[1], v[2 ])
        ws.send(JSON.stringify({
            label: "after_time",
            stretchification: v[0],
            depth: v[1],
            nodes: nodes_original.value,
            time: +time.value,
            constraints: constraints.value
        }))
    }   
})
</script>