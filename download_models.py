import os
import requests
import json

# --- CONFIGURATION ---
SAVE_DIR = "assets/models"
MANIFEST_FILE = "assets/manifest.json"

if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

# --- THE MEGA LIST (100+ Source URLs) ---
# Sources: Khronos Official, Google ModelViewer, Three.js Examples
# We use standard repo patterns to find the .glb files
models_to_fetch = [
    # [Google Model Viewer Assets]
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Astronaut.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Canoe.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Chair.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Horse.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/NeilArmstrong.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/RobotExpressive.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/RocketShip.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Shishkebab.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/odd-shape-labeled.glb",
    "https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/shishkebab.glb",
    
    # [Three.js Examples]
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Flamingo.glb",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Parrot.glb",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Stork.glb",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/PrimaryIonDrive.glb",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/LittlestTokyo.glb",
    
    # [Babylon.js Assets]
    "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/ufo.glb",
    "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/shark.glb",
    "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/seagulf.glb",
    "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/vintageFan_animated.glb",
]

# [Khronos Sample Models - Standard Pattern]
# These usually follow: Models/{Name}/glTF-Binary/{Name}.glb
khronos_names = [
    "AlphaBlendModeTest", "AnimatedMorphCube", "AntiqueCamera", "AttenuationTest", 
    "Avocado", "BarramundiFish", "BoomBox", "Box", "BoxInterleaved", "BoxTextured", 
    "BoxVertexColors", "Buggy", "CesiumMan", "CesiumMilkTruck", "ClearcoatTest", 
    "Corset", "DamagedHelmet", "DragonAttenuation", "Duck", "EmissiveStrengthTest", 
    "EnvironmentTest", "FlightHelmet", "Fox", "GearboxAssy", "GlamVelvetSofa", 
    "InterpolationTest", "IridescenceDielectricSpheres", "IridescenceLamp", 
    "IridescenceSuzanne", "Lantern", "MaterialsVariantsShoe", "MetalRoughSpheres", 
    "MorphPrimitivesTest", "MosquitoInAmber", "MultiUVTest", "NormalTangentMirrorTest", 
    "NormalTangentTest", "OrientationTest", "ReciprocatingSaw", "RecursiveSkeletons", 
    "RiggedFigure", "RiggedSimple", "SciFiHelmet", "SheenChair", "SheenCloth", 
    "SimpleMeshes", "SimpleMorph", "SimpleSkin", "SimpleSparseness", 
    "SpecGlossVsMetalRough", "StainedGlassLamp", "Suzanne", "TextureCoordinateTest", 
    "TextureLinearInterpolationTest", "TextureSettingsTest", "TextureTransformTest", 
    "ToyCar", "TransmissionRoughnessTest", "TransmissionTest", "Triangle", 
    "TriangleWithoutIndices", "TwoSidedPlane", "UnicodeHeart", "UnlitTest", 
    "VertexColorTest", "WaterBottle", "AnisotropyBarnLamp", "AnisotropyDisc",
    "Camera_01_4k", "ClothFolds", "DamagedHelmet", "DigitalHand", "DragonAttenuation"
]

base_khronos = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models"
for name in khronos_names:
    models_to_fetch.append(f"{base_khronos}/{name}/glTF-Binary/{name}.glb")

# --- EXECUTION ---
successful_models = []

print(f"🚀 Starting Massive Download: {len(models_to_fetch)} Models Queued...")

for i, url in enumerate(models_to_fetch):
    filename = url.split('/')[-1]
    file_path = os.path.join(SAVE_DIR, filename)
    
    # Skip if exists (to save time)
    if os.path.exists(file_path):
        print(f"[{i+1}] ⏩ Skipping {filename} (Already exists)")
        successful_models.append(filename)
        continue

    print(f"[{i+1}] ⬇️ Downloading {filename}...")
    try:
        r = requests.get(url, stream=True, timeout=10)
        if r.status_code == 200:
            with open(file_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"    ✅ Success")
            successful_models.append(filename)
        else:
            print(f"    ❌ Error {r.status_code}: Link unavailable")
    except Exception as e:
        print(f"    ❌ Failed: {e}")

# --- GENERATE MANIFEST ---
# This file is crucial. It tells the app.js what models are actually available.
print("\n📝 Generating Manifest File...")
with open(MANIFEST_FILE, 'w') as f:
    json.dump(successful_models, f)

print(f"\n✨ DONE! {len(successful_models)} models ready in '{SAVE_DIR}'")
print(f"📂 Manifest created at '{MANIFEST_FILE}'")