export type SurfaceMode = "mini" | "full";

let activeSurfaceMode: SurfaceMode = "mini";

export function setActiveSurfaceMode(mode: SurfaceMode): void {
	activeSurfaceMode = mode;
}

export function getActiveSurfaceMode(): SurfaceMode {
	return activeSurfaceMode;
}
