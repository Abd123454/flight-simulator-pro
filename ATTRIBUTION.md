# Aircraft Model Attributions

## Current Models (Poly Pizza — CC0/CC-BY)

### Skyliner 737 (airliner)
- **Source:** Poly Pizza — "Boeing 747" by Miha Lunar
- **URL:** https://poly.pizza/m/49CLof4tP2V
- **License:** CC-BY 4.0
- **Triangles:** 1,904
- **Note:** This is a Boeing 747 model used as a substitute for the 737.
  A real 737-800 model (108.7k triangles, CC-BY) is available on Sketchfab
  but requires manual download (see "Recommended Upgrades" below).

### Falcon F-16 (fighter)
- **Source:** Poly Pizza — "Low poly Fighter" by Stephen Graybill
- **URL:** https://poly.pizza/m/1fi8ZIDdFCP
- **License:** CC0 (Public Domain)
- **Triangles:** 124
- **Note:** Very low-poly. The best Sketchfab F-16 (30.3k triangles) uses
  CC-BY-NC-SA (NonCommercial) which prevents use in this project.

### Acro Extra 300 (stunt)
- **Source:** Poly Pizza — "Small Airplane" by Vojtěch Balák
- **URL:** https://poly.pizza/m/7cvx6ex-xfL
- **License:** CC-BY 4.0
- **Triangles:** 584
- **Note:** Generic small airplane, not a true Extra 300 aerobatic plane.

### Heavy C-130 (cargo)
- **Source:** Poly Pizza — "Airplane" by Poly by Google
- **URL:** https://poly.pizza/m/8ciDd9k8wha
- **License:** CC-BY 4.0
- **Triangles:** 1,772
- **Note:** Generic airplane, lacks C-130's 4 turboprop engines and T-tail.

---

## Recommended Upgrades (requires manual download)

The following models are verified as CC-BY 4.0 (commercial use with attribution)
and would dramatically improve visual quality. To upgrade:

1. Create a free Sketchfab account at https://sketchfab.com
2. Open each model page below
3. Click "Download 3D Model" → choose glTF (.glb) format
4. Save to `public/models/` replacing the current files
5. Run `bun run dev` to verify

### Boeing 737-800 (replaces airliner.glb)
- **Source:** Sketchfab — by andriiharbut
- **URL:** https://sketchfab.com/3d-models/boeing-737-800-7a548b5ba64340f78f7c58d23781ffe9
- **License:** CC-BY 4.0 ✅
- **Triangles:** 108,700 (57× better than current)
- **Why:** Real 737-800 with 2 engines (current model is a 747 with 4 engines)

### C-130 Hercules (replaces cargo.glb)
- **Source:** Sketchfab — FAB 2471 C-130 Hercules
- **URL:** https://sketchfab.com/3d-models/fab-2471-c-130-hercules-free-f5fae27c4270472fac399055699facb4
- **License:** CC-BY 4.0 ✅
- **Triangles:** 100,400 (57× better than current)
- **Why:** Real C-130 with 4 turboprop engines and T-tail

### Extra 300 Aerobatics (replaces stunt.glb)
- **Source:** Sketchfab — by gerulf
- **URL:** https://sketchfab.com/3d-models/extra-300-aerobatics-stunt-plane-be47c3232cb042368a82f59c0ff87396
- **License:** CC-BY 4.0 ✅
- **Triangles:** 155,900 (267× better than current)
- **Why:** True aerobatic plane with propeller, correct wing shape

### F-16 Fighting Falcon
- **Status:** ❌ No CC-BY/CC0 model found with acceptable quality
- **Best available:** 30.3k triangles but CC-BY-NC-SA (NonCommercial)
- **Decision:** Keep current CC0 Poly Pizza model (124 triangles)
- **Future option:** FlightGear F-16 (GPL license, 50k+ triangles)
  requires .ac → .glb conversion via Blender

---

## Attribution Text (for in-app credits screen)

```
Aircraft models:
- 737: "Boeing 747" by Miha Lunar (CC-BY) via Poly Pizza
- F-16: "Low poly Fighter" by Stephen Graybill (CC0) via Poly Pizza
- Extra 300: "Small Airplane" by Vojtěch Balák (CC-BY) via Poly Pizza
- C-130: "Airplane" by Poly by Google (CC-BY) via Poly Pizza

Terrain elevation data: Open-Elevation API
Weather data: Open-Meteo API
```
