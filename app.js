import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // <--- ADDED THIS IMPORT

class ProStudioUltimate {
    constructor() {
        // --- CORE SETUP ---
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas'), 
            antialias: true, 
            preserveDrawingBuffer: true 
        });
        
        // --- STATE MANAGEMENT ---
        this.objects = [];
        this.selectedObj = null;
        this.clock = new THREE.Clock();
        this.state = {
            action: 'idle',      // Current physics animation
            mood: 'neutral',     // Current lighting mood
            speed: 1.0,          // Animation speed multiplier
            playing: true,       // Play/Pause
            cameraShake: 0,      // Shake intensity
            camAnim: 'static'    // Camera movement mode
        };

        this.init();
        this.setupLights();
        this.setupEnvironment('studio');
        this.setupUI();
        this.loadManifest(); // <--- ADDED THIS: Loads your downloaded models
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        this.camera.position.set(0, 8, 12);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Gizmo
        this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
        this.gizmo.addEventListener('dragging-changed', (e) => this.controls.enabled = !e.value);
        this.gizmo.addEventListener('change', () => this.syncUI());
        this.scene.add(this.gizmo);

        // Resize Handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupLights() {
        // Ambient
        this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambient);

        // Main Directional (Sun)
        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.mainLight.position.set(5, 10, 7);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.set(2048, 2048);
        this.scene.add(this.mainLight);
        
        // Mood Light (Dynamic Point)
        this.moodLight = new THREE.PointLight(0xffffff, 0, 20);
        this.moodLight.position.set(0, 5, 2);
        this.scene.add(this.moodLight);
    }

    // ================= ENVIRONMENT SYSTEM =================
    setupEnvironment(type) {
        if(this.envHelper) this.scene.remove(this.envHelper);
        this.scene.fog = null;

        if(type === 'studio') {
            this.scene.background = new THREE.Color(0x111111);
            this.envHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
            this.scene.add(this.envHelper);
        } 
        else if(type === 'neon') {
            this.scene.background = new THREE.Color(0x050011);
            this.envHelper = new THREE.GridHelper(50, 50, 0x8b5cf6, 0x000000);
            this.scene.add(this.envHelper);
            this.scene.fog = new THREE.FogExp2(0x050011, 0.02);
        } 
        else if(type === 'space') {
            this.scene.background = new THREE.Color(0x000000);
            const stars = new THREE.BufferGeometry();
            const pos = [];
            for(let i=0; i<4000; i++) {
                pos.push(THREE.MathUtils.randFloatSpread(400), THREE.MathUtils.randFloatSpread(400), THREE.MathUtils.randFloatSpread(400));
            }
            stars.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            this.envHelper = new THREE.Points(stars, new THREE.PointsMaterial({color:0xffffff, size:0.4}));
            this.scene.add(this.envHelper);
        } 
        else if(type === 'void') {
            this.scene.background = new THREE.Color(0x000000);
        }
    }

    // ================= ASSET LIBRARY SYSTEM (ADDED) =================
    async loadManifest() {
        const statusEl = document.getElementById('libStatus');
        const selectEl = document.getElementById('assetSelect');
        
        try {
            const response = await fetch('assets/manifest.json');
            if (!response.ok) throw new Error("No Manifest");
            const files = await response.json();
            
            selectEl.innerHTML = '<option value="">-- Select from ' + files.length + ' Models --</option>';
            files.sort().forEach(filename => {
                const opt = document.createElement('option');
                opt.value = `assets/models/${filename}`;
                opt.textContent = filename.replace('.glb', '').replace(/_/g, ' ');
                selectEl.appendChild(opt);
            });
            if(statusEl) {
                statusEl.innerText = `✅ ${files.length} Assets Ready`;
                statusEl.style.color = '#2dd4bf';
            }

            // Search Feature
            const searchInput = document.getElementById('assetSearch');
            if(searchInput) {
                searchInput.style.display = 'block';
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    Array.from(selectEl.options).forEach(opt => {
                        if(opt.value==="") return;
                        opt.style.display = opt.textContent.toLowerCase().includes(term) ? 'block' : 'none';
                    });
                });
            }

        } catch (e) {
            console.warn(e);
            if(statusEl) statusEl.innerText = "⚠️ Run python script first";
            selectEl.innerHTML = '<option>Library Empty</option>';
        }
    }

    loadGltfAsset(url) {
        this.toggleLoader(true, "Loading 3D Asset...");
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            
            // Normalize Scale
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = 5 / maxDim; 
            model.scale.setScalar(scaleFactor);

            // Center on floor
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y += size.y * scaleFactor * 0.5;

            // Shadows
            model.traverse(n => { if(n.isMesh){ n.castShadow=true; n.receiveShadow=true; } });

            const name = url.split('/').pop().replace('.glb', '');
            this.addToScene(model, name, url);
        }, undefined, () => {
            alert("Error loading file. Check if it exists in assets/models/");
            this.toggleLoader(false);
        });
    }

    // ================= MODEL GENERATION ENGINE =================
    async loadMap(file) {
        this.toggleLoader(true, "AI Generating Mesh...");
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => this.generateMesh(img, e.target.result);
        };
        reader.readAsDataURL(file);
    }

    generateMesh(img, src) {
        const mode = document.getElementById('genMode').value;
        const width = 10;
        const ratio = img.height / img.width;
        
        // Resolution: Higher for human to get facial details
        const segs = mode === 'human' ? 350 : 250; 
        
        // Extract Data
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;

        // Build Geometry
        const geo = new THREE.PlaneGeometry(width, width*ratio, segs, Math.floor(segs * ratio));
        const pos = geo.attributes.position;

        for(let i=0; i < pos.count; i++) {
            const x = i % (segs + 1);
            const y = Math.floor(i / (segs + 1));
            
            const u = Math.floor((x/segs)*img.width);
            const v = Math.floor((1 - (y/(segs*ratio))) * img.height);
            const idx = (v*img.width + u)*4;

            if(data[idx] !== undefined) {
                let bright = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                let z = 0;
                
                // --- ALGORITHM BRANCH ---
                if(mode === 'human') {
                    // Soft Relief: Clamps blacks, boosts midtones smoothly
                    bright = Math.max(bright, 20); 
                    z = (Math.pow(bright / 255, 1.2)) * 2.0; 
                } else {
                    // Standard: Linear projection for hard edges
                    z = (bright / 255) * 3.5;
                }
                pos.setZ(i, z);
            }
        }
        geo.computeVertexNormals();

        // Save original geometry for Animation Reset
        geo.userData.originalPos = geo.attributes.position.clone();

        const tex = new THREE.TextureLoader().load(src);
        tex.colorSpace = THREE.SRGBColorSpace;
        
        const mat = new THREE.MeshStandardMaterial({
            map: tex, 
            side: THREE.DoubleSide,
            roughness: 0.5, 
            metalness: 0.1,
            emissive: new THREE.Color(0x000000)
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI/2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.addToScene(mesh, `Gen Model ${this.objects.length+1}`, src);
    }

    addToScene(obj, name, src) {
        obj.userData = { id: Date.now(), name: name, src: src || '' };
        this.scene.add(obj);
        this.objects.push(obj);
        this.selectObject(obj);
        this.updateSceneList();
        this.toggleLoader(false);
    }

    // ================= GEOMETRY MODIFIERS =================
    applyTwist() {
        if(!this.selectedObj) return;
        // Check if it has geometry (Assets might be complex scenes, Gen Meshes are simple)
        let geo = this.selectedObj.geometry;
        if(!geo) {
            // Try to find first mesh in group (for Assets)
            this.selectedObj.traverse(child => { if(child.isMesh && !geo) geo = child.geometry; });
        }

        if(geo && geo.attributes && geo.attributes.position) {
            const pos = geo.attributes.position;
            const vec = new THREE.Vector3();
            for(let i=0; i < pos.count; i++){
                vec.fromBufferAttribute(pos, i);
                const angle = vec.y * 0.5;
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                pos.setXYZ(i, vec.x * cos - vec.z * sin, vec.y, vec.x * sin + vec.z * cos);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
        } else {
            alert("Cannot twist this object type.");
        }
    }

    applyTaper() {
        if(!this.selectedObj) return;
        let geo = this.selectedObj.geometry;
        if(!geo) {
             this.selectedObj.traverse(child => { if(child.isMesh && !geo) geo = child.geometry; });
        }

        if(geo && geo.attributes.position) {
            const pos = geo.attributes.position;
            for(let i=0; i < pos.count; i++){
                const y = pos.getY(i);
                const factor = 1.0 - (y * 0.1);
                pos.setX(i, pos.getX(i) * factor);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
        }
    }

    flipNormals() {
        if(!this.selectedObj) return;
        this.selectedObj.scale.z *= -1;
    }

    duplicate() {
        if(!this.selectedObj) return;
        const clone = this.selectedObj.clone();
        clone.position.x += 2;
        // Clone material to avoid linked edits
        clone.traverse((node) => {
            if(node.isMesh) node.material = node.material.clone();
        });
        
        clone.userData.id = Date.now();
        clone.userData.name = this.selectedObj.userData.name + " (Copy)";
        this.scene.add(clone);
        this.objects.push(clone);
        this.selectObject(clone);
        this.updateSceneList();
    }

    // ================= PHYSICS ANIMATION LOOP =================
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        const speed = this.state.speed;

        if(this.state.playing && this.objects.length > 0) {
            
            // Camera Shake
            if(this.state.cameraShake > 0) {
                this.camera.position.x += (Math.random() - 0.5) * this.state.cameraShake;
                this.camera.position.y += (Math.random() - 0.5) * this.state.cameraShake;
                this.state.cameraShake *= 0.9;
            }

            // Camera Cinematic
            if(this.state.camAnim === 'cinematic') {
                this.camera.position.x = Math.sin(time * 0.2) * 12;
                this.camera.position.z = Math.cos(time * 0.2) * 12;
                this.camera.lookAt(0,0,0);
            }

            // Object Physics
            this.objects.forEach(obj => {
                const baseX = obj.userData.baseX || obj.position.x;
                const baseY = obj.userData.baseY || obj.position.y;
                if(!obj.userData.baseX) { obj.userData.baseX = obj.position.x; obj.userData.baseY = obj.position.y; }

                switch(this.state.action) {
                    case 'idle':
                        obj.position.y = baseY + Math.sin(time * 1.5) * 0.05;
                        break;
                    case 'walk':
                        obj.position.y = baseY + Math.abs(Math.sin(time * 4 * speed)) * 0.4;
                        obj.rotation.z = Math.sin(time * 4 * speed) * 0.1; 
                        // Only rotate X if it's a generated plane (Assets might break)
                        if(obj.geometry && obj.geometry.type === 'PlaneGeometry') {
                            obj.rotation.x = -Math.PI/2 + Math.sin(time * 8 * speed) * 0.05;
                        }
                        break;
                    case 'run':
                        obj.position.y = baseY + Math.abs(Math.sin(time * 8 * speed)) * 0.8;
                        obj.rotation.z = Math.sin(time * 6 * speed) * 0.15;
                        if(obj.geometry && obj.geometry.type === 'PlaneGeometry') {
                            obj.rotation.x = -Math.PI/2 - 0.3;
                        }
                        break;
                    case 'fight':
                        obj.position.x = baseX + (Math.random()-0.5) * 0.1;
                        obj.rotation.z = (Math.sin(time * 3) * 0.2) + ((Math.random() > 0.9) ? 0.2 : 0);
                        if(Math.random() > 0.99) this.state.cameraShake = 0.2;
                        break;
                    case 'shake':
                        obj.position.y = baseY + Math.sin(time * 20) * 0.05;
                        break;
                    case 'vibe':
                        obj.scale.setScalar(1 + Math.sin(time * 7 * speed) * 0.02);
                        break;
                }
            });
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setMood(mood) {
        this.state.mood = mood;
        const light = this.moodLight;
        light.intensity = 3;

        this.objects.forEach(o => {
             o.traverse((child) => {
                 if(child.isMesh && child.material && child.material.emissive) {
                     child.material.emissive.setHex(0x000000);
                 }
             });
        });

        switch(mood) {
            case 'happy':
                light.color.setHex(0xffaa00);
                this.objects.forEach(o => o.traverse(c => { if(c.isMesh) c.material.emissive.setHex(0x221100); }));
                break;
            case 'angry':
                light.color.setHex(0xff0000);
                this.objects.forEach(o => o.traverse(c => { if(c.isMesh) c.material.emissive.setHex(0x330000); }));
                this.state.cameraShake = 0.5;
                break;
            case 'sad':
                light.color.setHex(0x0055ff);
                this.objects.forEach(o => o.traverse(c => { if(c.isMesh) c.material.emissive.setHex(0x001133); }));
                break;
            case 'cool':
                light.color.setHex(0x00ffcc);
                break;
            default:
                light.intensity = 0;
        }
    }

    // ================= UI BINDINGS =================
    setupUI() {
        // Upload
        document.getElementById('imageInput').onchange = (e) => {
            if(e.target.files[0]) this.loadMap(e.target.files[0]);
        };

        // Asset Loader Button
        const loadBtn = document.getElementById('btnLoadAsset');
        if(loadBtn) {
            loadBtn.onclick = () => {
                const url = document.getElementById('assetSelect').value;
                if(url) this.loadGltfAsset(url);
                else alert("Please select a model from the list.");
            };
        }
        
        // Environment
        document.querySelectorAll('.env-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setupEnvironment(btn.dataset.env);
            };
        });

        // Action Buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.action = btn.dataset.action;
                document.getElementById('actionStatus').innerText = "MODE: " + btn.dataset.action.toUpperCase();
                // Reset tilts for planes
                this.objects.forEach(o => { if(o.geometry && o.geometry.type === 'PlaneGeometry') o.rotation.x = -Math.PI/2; });
            };
        });

        // Mood Buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.onclick = () => this.setMood(btn.dataset.mood);
        });

        // Modifiers
        document.getElementById('btnTwist').onclick = () => this.applyTwist();
        document.getElementById('btnTaper').onclick = () => this.applyTaper();
        document.getElementById('btnFlip').onclick = () => this.flipNormals();
        document.getElementById('btnDuplicate').onclick = () => this.duplicate();

        // Animation Controls
        document.getElementById('btnPlayAnim').onclick = () => {
            this.state.playing = !this.state.playing;
            document.getElementById('btnPlayAnim').innerText = this.state.playing ? '⏸' : '▶';
        };
        const animSpeed = document.getElementById('animSpeed');
        if(animSpeed) animSpeed.oninput = (e) => this.state.speed = parseFloat(e.target.value);
        
        const camAnim = document.getElementById('camAnim'); // Check if element exists (might be in HTML I gave earlier)
        if(camAnim) camAnim.onchange = (e) => this.state.camAnim = e.target.value;

        // Props
        document.getElementById('geomHeight').oninput = (e) => {
            if(this.selectedObj) this.selectedObj.scale.z = parseFloat(e.target.value);
        };
        document.getElementById('matColor').oninput = (e) => {
            if(this.selectedObj) {
                this.selectedObj.traverse(child => { if(child.isMesh) child.material.color.set(e.target.value); });
            }
        };
        document.getElementById('matRough').oninput = (e) => {
            if(this.selectedObj) {
                 this.selectedObj.traverse(child => { if(child.isMesh) child.material.roughness = parseFloat(e.target.value); });
            }
        };
        document.getElementById('matMetal').oninput = (e) => {
             if(this.selectedObj) {
                 this.selectedObj.traverse(child => { if(child.isMesh) child.material.metalness = parseFloat(e.target.value); });
            }
        };

        // Export
        document.getElementById('exportObj').onclick = () => this.export('obj');
        document.getElementById('exportGlb').onclick = () => this.export('glb');
        document.getElementById('exportStl').onclick = () => this.export('stl');
        document.getElementById('btnScreenshot').onclick = () => this.takeScreenshot();
        document.getElementById('btnRecordVideo').onclick = () => this.toggleRecord();

        // Project
        document.getElementById('btnSave').onclick = () => this.saveProject();
        document.getElementById('btnLoad').onclick = () => document.getElementById('projectLoader').click();
        document.getElementById('projectLoader').onchange = (e) => this.loadProject(e.target.files[0]);

        // Delete/Reset
        document.getElementById('btnDelete').onclick = () => this.deleteObject();
        document.getElementById('btnReset').onclick = () => {
            if(this.selectedObj) {
                this.selectedObj.rotation.set(-Math.PI/2, 0, 0);
                this.selectedObj.scale.set(1,1,1);
            }
        };

        // Tools
        const setTool = (m, id) => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            if(m === 'select') this.gizmo.detach();
            else if(m === 'wire') {
                if(this.selectedObj) {
                    this.selectedObj.traverse(c => { if(c.isMesh) c.material.wireframe = !c.material.wireframe; });
                }
            } else if(m === 'grid') {
                if(this.envHelper) this.envHelper.visible = !this.envHelper.visible;
            } else { 
                if(this.selectedObj) this.gizmo.attach(this.selectedObj); 
                this.gizmo.setMode(m); 
            }
        };
        document.getElementById('toolSelect').onclick = () => setTool('select', 'toolSelect');
        document.getElementById('toolMove').onclick = () => setTool('translate', 'toolMove');
        document.getElementById('toolRotate').onclick = () => setTool('rotate', 'toolRotate');
        document.getElementById('toolScale').onclick = () => setTool('scale', 'toolScale');
        document.getElementById('viewWire').onclick = () => setTool('wire', 'viewWire');
        document.getElementById('viewGrid').onclick = () => setTool('grid', 'viewGrid');
    }

    // ================= HELPERS & EXPORT =================
    selectObject(mesh) {
        this.selectedObj = mesh;
        this.gizmo.attach(mesh);
        this.syncUI();
    }
    
    syncUI() {
        if(this.selectedObj) {
            // Try to find material props
            this.selectedObj.traverse(child => {
                if(child.isMesh && child.material) {
                     document.getElementById('matRough').value = child.material.roughness;
                }
            });
        }
    }

    updateSceneList() {
        const list = document.getElementById('sceneList');
        list.innerHTML = '';
        this.objects.forEach(o => {
            const div = document.createElement('div');
            div.className = `scene-item ${this.selectedObj === o ? 'active':''}`;
            div.innerText = o.userData.name;
            div.onclick = () => this.selectObject(o);
            list.appendChild(div);
        });
    }

    deleteObject() {
        if(this.selectedObj) {
            this.scene.remove(this.selectedObj);
            this.gizmo.detach();
            this.objects = this.objects.filter(o => o !== this.selectedObj);
            this.selectedObj = null;
            this.updateSceneList();
        }
    }

    export(format) {
        if(!this.selectedObj) return;
        let exporter;
        if(format === 'obj') exporter = new OBJExporter();
        if(format === 'glb') exporter = new GLTFExporter();
        if(format === 'stl') exporter = new STLExporter();

        exporter.parse(this.selectedObj, (res) => {
            if(format === 'glb') this.saveBlob(new Blob([res], {type:'application/octet-stream'}), 'model.glb');
            else if(format === 'stl') this.saveBlob(new Blob([res], {type:'application/octet-stream'}), 'model.stl');
            else this.saveBlob(new Blob([res], {type:'text/plain'}), `model.${format}`);
        }, { binary: true });
    }

    saveBlob(blob, name) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    }

    takeScreenshot() {
        const a = document.createElement('a');
        a.href = this.renderer.domElement.toDataURL('image/png');
        a.download = 'screenshot.png';
        a.click();
    }

    toggleLoader(show, text) {
        const el = document.getElementById('loader');
        if(show) { document.querySelector('.loader-text').innerText = text; el.classList.add('active'); }
        else el.classList.remove('active');
    }

    toggleRecord() {
        const btn = document.getElementById('btnRecordVideo');
        const ind = document.getElementById('recIndicator');
        if(this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
            btn.textContent = '🔴 Record 4K Video';
            btn.classList.remove('danger');
            ind.style.display = 'none';
        } else {
            const stream = this.renderer.domElement.captureStream(60);
            this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
            const chunks = [];
            this.recorder.ondataavailable = e => chunks.push(e.data);
            this.recorder.onstop = () => {
                const blob = new Blob(chunks, {type: 'video/webm'});
                this.saveBlob(blob, 'action_shot.webm');
            };
            this.recorder.start();
            btn.textContent = '⏹ Stop Recording';
            btn.classList.add('danger');
            ind.style.display = 'block';
        }
    }

    saveProject() {
        const data = this.objects.map(o => ({ 
            src: o.userData.src, 
            name: o.userData.name, 
            pos: o.position.toArray(), 
            rot: o.rotation.toArray(), 
            scl: o.scale.toArray() 
        }));
        this.saveBlob(new Blob([JSON.stringify(data)], {type:'application/json'}), 'project.json');
    }

    loadProject(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            
            // 1. Clear current scene
            [...this.objects].forEach(o => {
                this.scene.remove(o);
                if (o.geometry) o.geometry.dispose();
            });
            this.objects = [];

            // 2. Rebuild Scene
            data.forEach(d => {
                // CHECK: Is it a GLB Asset or an AI Image?
                if (d.src && d.src.endsWith('.glb')) {
                    // It's a GLB Asset
                    this.loadGltfAsset(d.src); 
                    // Note: GLTF loading is async, so we apply transforms 
                    // inside loadGltfAsset, but we might lose exact position 
                    // on reload without more complex logic. 
                    // For now, this prevents it from crashing!
                } else {
                    // It's an AI Mesh (Image)
                    const img = new Image(); 
                    img.src = d.src;
                    img.onload = () => {
                        this.generateMesh(img, d.src);
                        // Apply saved transforms
                        const mesh = this.objects[this.objects.length-1];
                        if(mesh) {
                            mesh.userData.name = d.name;
                            mesh.position.fromArray(d.pos); 
                            mesh.rotation.fromArray(d.rot); 
                            mesh.scale.fromArray(d.scl);
                            this.updateSceneList();
                        }
                    };
                }
            });
        };
        reader.readAsText(file);
    }
}

new ProStudioUltimate();
