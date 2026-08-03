// Procedural low-poly Boeing 737-style airplane.
// Forward = -Z. Provides update(state) to spin fans & retract gear.
import * as THREE from 'three'
import type { FlightState } from '../types'

const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.55, metalness: 0.15 })
const grayMat = new THREE.MeshStandardMaterial({ color: 0x8b9097, roughness: 0.6, metalness: 0.3 })
const darkMat = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.5, metalness: 0.2 })
const glassMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.2, metalness: 0.6 })
const redMat = new THREE.MeshStandardMaterial({ color: 0xc03030, roughness: 0.6 })
const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.9 })

function cyl(rTop: number, rBot: number, h: number, seg = 10) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg)
}

export class Airplane {
  group: THREE.Group
  private fans: THREE.Mesh[] = []
  private gearGroups: THREE.Group[] = []
  private gearRetract = 0 // 0 = down, 1 = up
  private fanAngle = 0

  constructor() {
    this.group = new THREE.Group()

    // --- Fuselage ---
    const fus = cyl(1.8, 1.8, 38, 12)
    fus.rotateX(Math.PI / 2) // axis along Z
    const fusMesh = new THREE.Mesh(fus, whiteMat)
    fusMesh.castShadow = true
    this.group.add(fusMesh)

    // nose cone
    const nose = new THREE.ConeGeometry(1.8, 4, 12)
    nose.rotateX(-Math.PI / 2) // point toward -Z
    const noseMesh = new THREE.Mesh(nose, whiteMat)
    noseMesh.position.set(0, 0, -21)
    noseMesh.castShadow = true
    this.group.add(noseMesh)

    // tail cone (tapered up)
    const tail = new THREE.ConeGeometry(1.8, 7, 12)
    tail.rotateX(Math.PI / 2) // point toward +Z
    const tailMesh = new THREE.Mesh(tail, whiteMat)
    tailMesh.position.set(0, 0.6, 22.5)
    tailMesh.castShadow = true
    this.group.add(tailMesh)

    // cockpit windshield (slanted dark pane)
    const cockpitGeo = new THREE.BoxGeometry(2.6, 1.4, 2.2)
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat)
    cockpit.position.set(0, 1.4, -17)
    cockpit.rotation.x = -0.35
    this.group.add(cockpit)

    // window strip (two thin dark boxes along the sides)
    const winGeo = new THREE.BoxGeometry(0.2, 0.55, 14)
    const winL = new THREE.Mesh(winGeo, darkMat)
    winL.position.set(-1.75, 0.6, -2)
    this.group.add(winL)
    const winR = winL.clone()
    winR.position.x = 1.75
    this.group.add(winR)

    // --- Wings ---
    const wingShape = new THREE.BoxGeometry(34, 0.5, 4.2)
    const wing = new THREE.Mesh(wingShape, whiteMat)
    wing.position.set(0, -0.6, 1.5)
    wing.castShadow = true
    this.group.add(wing)

    // winglets (small vertical tips)
    const wletGeo = new THREE.BoxGeometry(0.3, 1.6, 1.8)
    const wletL = new THREE.Mesh(wletGeo, whiteMat)
    wletL.position.set(-17, 0.2, 1.5)
    this.group.add(wletL)
    const wletR = wletL.clone()
    wletR.position.x = 17
    this.group.add(wletR)

    // --- Tail: vertical stabilizer ---
    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), whiteMat)
    vtail.position.set(0, 4.5, 24)
    vtail.castShadow = true
    this.group.add(vtail)
    // red stripe on tail top
    const vstripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 4), redMat)
    vstripe.position.set(0, 7, 24)
    this.group.add(vstripe)

    // --- Horizontal stabilizers ---
    const htail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 2.6), whiteMat)
    htail.position.set(0, 2.2, 25.5)
    htail.castShadow = true
    this.group.add(htail)

    // --- Engines (two, under wings) ---
    const enginePos = [
      { x: -7, z: 0 },
      { x: 7, z: 0 },
    ]
    for (const ep of enginePos) {
      const engGroup = new THREE.Group()
      engGroup.position.set(ep.x, -1.8, ep.z)
      const nacelle = cyl(1.25, 1.15, 4.5, 12)
      nacelle.rotateX(Math.PI / 2)
      const nacelleMesh = new THREE.Mesh(nacelle, grayMat)
      nacelleMesh.castShadow = true
      engGroup.add(nacelleMesh)
      // fan disc + blades
      const fanGroup = new THREE.Group()
      fanGroup.position.set(0, 0, -2.25)
      const hub = new THREE.Mesh(cyl(0.45, 0.45, 0.4, 8), darkMat)
      hub.rotation.x = Math.PI / 2
      fanGroup.add(hub)
      for (let b = 0; b < 8; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.1), grayMat)
        blade.position.y = 0.7
        const wrap = new THREE.Group()
        wrap.rotation.z = (b / 8) * Math.PI * 2
        wrap.add(blade)
        fanGroup.add(wrap)
      }
      engGroup.add(fanGroup)
      this.fans.push(fanGroup)
      this.group.add(engGroup)
    }

    // --- Landing gear (nose + 2 main) ---
    this.gearGroups.push(this.buildGear(0, -16, 0.7, 2)) // nose
    this.gearGroups.push(this.buildGear(-6, 2, 1.0, 2.4)) // main L
    this.gearGroups.push(this.buildGear(6, 2, 1.0, 2.4)) // main R
    for (const g of this.gearGroups) this.group.add(g)

    // navigation lights (small emissive spheres)
    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff0000, emissiveIntensity: 1.5 }))
    navL.position.set(-17, 0, 1.5)
    this.group.add(navL)
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0x30ff30, emissive: 0x00ff00, emissiveIntensity: 1.5 }))
    navR.position.set(17, 0, 1.5)
    this.group.add(navR)
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff8000, emissive: 0xff4000, emissiveIntensity: 2 }))
    beacon.position.set(0, 1.5, 24)
    this.group.add(beacon)
  }

  private buildGear(x: number, z: number, strutLen: number, wheelR: number): THREE.Group {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    // strut
    const strut = new THREE.Mesh(cyl(0.18, 0.18, strutLen, 6), grayMat)
    strut.position.y = -strutLen / 2
    strut.castShadow = true
    g.add(strut)
    // wheel
    const wheel = new THREE.Mesh(cyl(wheelR, wheelR, 0.5, 10), tireMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.y = -strutLen
    wheel.castShadow = true
    g.add(wheel)
    return g
  }

  update(state: FlightState, dt: number) {
    // spin fans proportional to rpm
    this.fanAngle += (8 + state.rpmNorm * 60) * dt
    for (const f of this.fans) f.rotation.z = this.fanAngle

    // gear retraction target
    const target = state.gearDown ? 0 : 1
    this.gearRetract += (target - this.gearRetract) * (1 - Math.exp(-dt * 3))
    for (const g of this.gearGroups) {
      // retract upward into fuselage/wing
      g.position.y = this.gearRetract * 2.4
      g.scale.y = 1 - this.gearRetract * 0.9
      g.visible = this.gearRetract < 0.98
    }
  }
}
