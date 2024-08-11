import type { Circuit, Netlist, PhysicalNode } from "types";
import { reactive, ref } from "vue"

type onNewGraphFn = (c: Circuit) => void;
type onNewPathFn = (a: any[], b: PhysicalNode[]) => void;

export function useWebSocket(url: string, netlist: Netlist, initial_values: { stretchification: number, depth: number}, onNewGraph: onNewGraphFn, onNewPath: onNewPathFn) {
    const open = ref(false);
    const ws = new WebSocket(url);
    ws.onopen = () => {
        ws.send(
            JSON.stringify({
              label: "netlist",
              data: netlist,
            })
          );
        open.value = true;
        ws.send(
        JSON.stringify({
            label: "with_stretchification",
            stretchification: initial_values.stretchification,
            depth: initial_values.depth / 10,
        })
        );
    }

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        let blob, url;
        switch(data.label) {
            // handle basic messages from the ws that don't require anything from the client
            case "svg":
                blob = new Blob([data.file], { type: "image/svg+xml" });
                url = URL.createObjectURL(blob);
                window.open(url);
                break;
            case "processing":
                blob = new Blob([data.file], { type: "text/plain" });
                url = URL.createObjectURL(blob);
                window.open(url); 
                break;
            case "message":
                alert(data.message);
                break;
            case "paths":
                onNewPath(data.nodes, data.points);
                break;
            case "graph":
                onNewGraph(data.circuit)
                break;
            default:
                alert("unhandled label: " + data.label)
        }
    }
    //ws.what
    return {ws, open}
}