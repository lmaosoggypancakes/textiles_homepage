type Point = {
    x: number;
    y: number;
}
export const createZigzag = (a: Point, b: Point, freq: number, amp: number): [number, number][] => {
    const path: [number, number][] = []
    const dx = b.x-a.x
    const dy = b.y-a.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const numPartitions = Math.floor(dist / 50) // segment the line into chunks st. each bit is of length 50+
    const partitionLength = Math.round(dist/numPartitions)
    const partitionHeight = Math.round(dy/numPartitions)
    if (numPartitions == 0) {
        const newB: Point = {x: b.x, y: a.y}
        const newPath = _createHorizontalZigzag(a, newB, freq, amp)
        newPath.forEach(x => path.push(x))
        path.push([b.x, b.y])
        return path
    } else {
        for(let i = 0; i < numPartitions; i++) {
            const ap: Point = {
                x: a.x + i*partitionLength,
                y: a.y + i*partitionHeight
            };
            
            const bp: Point = {
                x: a.x+ (i+1)*partitionLength,
                y: a.y + i*partitionHeight
            }
            const newPath = _createHorizontalZigzag(ap,bp,freq,amp)
            newPath.forEach(p => path.push(p));
        }
        return path
    }
}

const _createHorizontalZigzag = (a: Point, b: Point, freq: number, amp: number): [number, number][] => {
    // emulate a sawtooth wave of given 2pi/freq and amp
    if (a.y != b.y) throw new Error("should be on same horizontal line");
    // given the freq and amp, how many cycles can we make to go from a to b?
    let proximity = b.x % freq;
    let attempts = 0;
    while(proximity != 0 || attempts != 1000) {
        // get a "close enough"
        freq += 0.01;
        attempts++;
        proximity = b.x % freq;
    }
    if (proximity != 0) throw new Error("failed")
    const freq_p = 2*Math.PI / freq;
    const dx = b.x-a.x;
    const cycles = dx/freq;
    const numPoints = cycles*4;
    const stepLength = dx/numPoints;
    const path: [number, number][] = []
    for(let i = 0; i < numPoints; i++) {
        switch(i % 4) {
            case 0:
                path.push([a.x+i*stepLength,a.y]);
                break;
            case 1:
                path.push([a.x+i*stepLength, a.y+amp]);
                break;
            case 2:
                path.push([a.x+i*stepLength,a.y])
                break;
            case 3:
                path.push([a.x+i*stepLength, a.y-amp])
        }
    }
    return path;
    
}

// TODO: port better path finding from the python lib 