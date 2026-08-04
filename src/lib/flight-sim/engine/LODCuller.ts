// Simple distance-based LOD culling for integrated-GPU performance.
// Registers objects with a "cull distance"; each frame, hides any object
// farther than its threshold from the camera. Cheap (no raycasting).
import * as THREE from 'three'

interface CullEntry {
  object: THREE.Object3D
  maxDist: number // meters — hide beyond this
  wasVisible: boolean
}

export class LODCuller {
  private entries: CullEntry[] = []
  private camera: THREE.Camera

  constructor(camera: THREE.Camera) {
    this.camera = camera
  }

  /** Register an object to be culled beyond maxDist meters. */
  add(object: THREE.Object3D, maxDist: number) {
    this.entries.push({ object, maxDist, wasVisible: object.visible })
  }

  /** Call each frame. Toggles visibility based on camera distance. */
  update() {
    const camPos = this.camera.position
    for (const e of this.entries) {
      // use object world position; for groups, use their .position (local→world
      // via parent matrixWorld, but our airport/airplane groups are top-level
      // so their local position IS world position)
      const objPos = e.object.position
      const dx = objPos.x - camPos.x
      const dy = objPos.y - camPos.y
      const dz = objPos.z - camPos.z
      const distSq = dx * dx + dy * dy + dz * dz
      const shouldShow = distSq < e.maxDist * e.maxDist
      if (shouldShow !== e.object.visible) {
        e.object.visible = shouldShow
      }
    }
  }

  /** Clear all registrations. */
  clear() {
    // restore visibility before clearing
    for (const e of this.entries) e.object.visible = e.wasVisible
    this.entries = []
  }
}
