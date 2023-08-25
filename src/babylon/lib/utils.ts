import {Vector3} from "@babylonjs/core/Maths/math.vector";

export const clamp = (value: any, min: any, max: any) => Math.max(Math.min(value, max), min)
export const lerp = (start: any, end: any, speed: any) => start + (end - start) * speed;

export const lerp3 = (p1: any, p2: any, t: any) => {
    const x = lerp(p1.x, p2.x, t);
    const y = lerp(p1.y, p2.y, t);
    const z = lerp(p1.z, p2.z, t);
    return new Vector3(x, y, z);
}

export const firstPersonCamera = {
    middle: {
        position: new Vector3(0, 1.75, 0.25),
        fov: 1.25,
        mouseMin: -45,
        mouseMax: 45,
    },
};

export const thirdPersonCamera = {
    middle: {
        position: new Vector3(0, 1.35, -5),
        fov: 0.8,
        mouseMin: -5,
        mouseMax: 45,
    },
    leftRun: {
        position: new Vector3(0.7, 1.35, -4),
        fov: 0.8,
        mouseMin: -35,
        mouseMax: 45,
    },
    rightRun: {
        position: new Vector3(-0.7, 1.35, -4),
        fov: 0.8,
        mouseMin: -35,
        mouseMax: 45,
    },
    far: {
        position: new Vector3(0, 1.5, -6),
        fov: 1.5,
        mouseMin: -5,
        mouseMax: 45,
    },
};