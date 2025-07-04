// Three.js 3D-Viewer für Denkmäler
window.ThreeViewer = (function() {
    let scene, camera, renderer, controls, model;
    let isInitialized = false;
    let isWireframe = false;
    let currentModelPath = null;
    
    function initializeViewer() {
        if (isInitialized) return;
        
        const container = document.getElementById('model-viewer');
        const loadingIndicator = document.getElementById('loading-indicator');
        
        // Scene Setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        // Camera Setup
        camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(5, 5, 5);
        
        // Renderer Setup
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(renderer.domElement);
        
        // Controls Setup (vereinfacht, da OrbitControls nicht verfügbar)
        setupBasicControls();
        
        // Lighting Setup
        setupLighting();
        
        // Event Listeners
        setupEventListeners();
        
        // Window Resize Handler
        window.addEventListener('resize', onWindowResize);
        
        isInitialized = true;
        loadingIndicator.style.display = 'none';
        
        // Animation Loop
        animate();
    }
    
    function setupBasicControls() {
        // Einfache Maus-Kontrollen ohne OrbitControls
        const container = document.getElementById('model-viewer');
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        let targetRotationOnMouseDownX = 0;
        let targetRotationOnMouseDownY = 0;
        let mouseXOnMouseDown = 0;
        let mouseYOnMouseDown = 0;
        
        container.addEventListener('mousedown', function(event) {
            event.preventDefault();
            isMouseDown = true;
            mouseXOnMouseDown = event.clientX;
            mouseYOnMouseDown = event.clientY;
            targetRotationOnMouseDownX = targetRotationX;
            targetRotationOnMouseDownY = targetRotationY;
        });
        
        container.addEventListener('mouseup', function(event) {
            event.preventDefault();
            isMouseDown = false;
        });
        
        container.addEventListener('mousemove', function(event) {
            if (!isMouseDown) return;
            
            mouseX = event.clientX - mouseXOnMouseDown;
            mouseY = event.clientY - mouseYOnMouseDown;
            
            targetRotationY = targetRotationOnMouseDownY + (mouseX - mouseXOnMouseDown) * 0.02;
            targetRotationX = targetRotationOnMouseDownX + (mouseY - mouseYOnMouseDown) * 0.02;
        });
        
        // Zoom mit Mausrad
        container.addEventListener('wheel', function(event) {
            event.preventDefault();
            const delta = event.deltaY > 0 ? 1.1 : 0.9;
            camera.position.multiplyScalar(delta);
        });
        
        // Animation für smooth rotation
        function updateRotation() {
            if (scene.children.length > 0) {
                const modelGroup = scene.children.find(child => child.userData.isModel);
                if (modelGroup) {
                    modelGroup.rotation.x = targetRotationX;
                    modelGroup.rotation.y = targetRotationY;
                }
            }
        }
        
        // Update-Funktion für Controls
        window.updateControls = updateRotation;
    }
    
    function setupLighting() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        // Directional Light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Point Light
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
        pointLight.position.set(-10, 10, -10);
        scene.add(pointLight);
    }
    
    function setupEventListeners() {
        // Reset View Button
        document.getElementById('reset-view').addEventListener('click', resetView);
        
        // Wireframe Toggle Button
        document.getElementById('wireframe-toggle').addEventListener('click', toggleWireframe);
        
        // Fullscreen Toggle Button
        document.getElementById('fullscreen-toggle').addEventListener('click', toggleFullscreen);
    }
    
    function loadModel(modelPath) {
        if (currentModelPath === modelPath) return;
        
        currentModelPath = modelPath;
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = 'block';
        
        // Altes Modell entfernen
        if (model) {
            scene.remove(model);
        }
        
        // Hier würden Sie den entsprechenden Loader verwenden
        // Beispiel für verschiedene Formate:
        
        const fileExtension = modelPath.split('.').pop().toLowerCase();
        
        switch (fileExtension) {
            case 'obj':
                loadOBJModel(modelPath);
                break;
            case 'gltf':
            case 'glb':
                loadGLTFModel(modelPath);
                break;
            case 'ply':
                loadPLYModel(modelPath);
                break;
            default:
                console.warn('Unsupported model format:', fileExtension);
                loadingIndicator.style.display = 'none';
                break;
        }
    }
    
    function loadOBJModel(modelPath) {
        // Placeholder für OBJ-Loader
        // In einer echten Implementierung würden Sie hier den OBJLoader verwenden
        console.log('Loading OBJ model:', modelPath);
        createPlaceholderModel();
    }
    
    function loadGLTFModel(modelPath) {
        // Placeholder für GLTF-Loader
        console.log('Loading GLTF model:', modelPath);
        createPlaceholderModel();
    }
    
    function loadPLYModel(modelPath) {
        // Placeholder für PLY-Loader
        console.log('Loading PLY model:', modelPath);
        createPlaceholderModel();
    }
    
    function createPlaceholderModel() {
        // Erstellt ein einfaches Demo-Modell als Platzhalter
        const geometry = new THREE.BoxGeometry(2, 3, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        model = new THREE.Group();
        model.userData.isModel = true;
        
        // Basis des Denkmals
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16),
            new THREE.MeshLambertMaterial({ color: 0x696969 })
        );
        base.position.y = -1.5;
        model.add(base);
        
        // Hauptkörper
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 0;
        model.add(body);
        
        // Spitze
        const top = new THREE.Mesh(
            new THREE.ConeGeometry(1, 1, 8),
            new THREE.MeshLambertMaterial({ color: 0x654321 })
        );
        top.position.y = 2;
        model.add(top);
        
        scene.add(model);
        
        // Kamera Position anpassen
        camera.position.set(5, 3, 5);
        camera.lookAt(0, 0, 0);
        
        document.getElementById('loading-indicator').style.display = 'none';
    }
    
    function resetView() {
        if (camera) {
            camera.position.set(5, 5, 5);
            camera.lookAt(0, 0, 0);
        }
        
        if (model) {
            model.rotation.set(0, 0, 0);
        }
    }
    
    function toggleWireframe() {
        isWireframe = !isWireframe;
        
        if (model) {
            model.traverse(function(child) {
                if (child.isMesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            material.wireframe = isWireframe;
                        });
                    } else {
                        child.material.wireframe = isWireframe;
                    }
                }
            });
        }
    }
    
    function toggleFullscreen() {
        const container = document.getElementById('model-viewer');
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    function onWindowResize() {
        if (!isInitialized) return;
        
        const container = document.getElementById('model-viewer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    
    function animate() {
        requestAnimationFrame(animate);
        
        if (window.updateControls) {
            window.updateControls();
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // Public API
    return {
        initializeViewer: initializeViewer,
        loadModel: loadModel,
        resetView: resetView,
        toggleWireframe: toggleWireframe
    };
})();