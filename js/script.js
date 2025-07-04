let map;
let inventories = [];
let currentInventory = null;
let allObjects = {};
let markerLayers = {};
let colors = ['#8B4513', '#2F4F4F', '#8B0000', '#006400', '#4B0082'];

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadInventories();
    setupEventListeners();
    initThreeViewer();
});

// Karte initialisieren
function initMap() {
    map = L.map('map').setView([52.5200, 13.4050], 11); // Berlin
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Inventare laden
async function loadInventories() {
    try {
        const response = await fetch('data/inventories.json');
        const data = await response.json();
        
        inventories = data.inventories.map(inv => ({
            id: inv.id,
            name: inv.metadata?.bibliographic?.title?.main || 'Unbenanntes Inventar',
            year: inv.metadata?.bibliographic?.publication?.year || 'Unbekannt',
            icon: '🏛️',
            color: getColorForInventory(inv.id),
            dataFile: `${inv.id}.json`,
            imageFolder: inv.id,
            fullTitle: inv.metadata?.bibliographic?.title?.full,
            subtitle: inv.metadata?.bibliographic?.title?.subtitle,
            publisher: inv.metadata?.bibliographic?.publication?.publisher,
            place: inv.metadata?.bibliographic?.publication?.place
        }));
        
        populateInventorySelector();
        
    } catch (error) {
        console.error('Fehler beim Laden der Inventare:', error);
        createDemoInventory();
    }
}

function getColorForInventory(inventoryId) {
    const colors = ['#8B4513', '#2F4F4F', '#8B0000', '#006400', '#4B0082', '#CD853F', '#4682B4', '#B22222'];
    const hash = inventoryId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
}

function createDemoInventory() {
    inventories = [{
        id: "dehio1906bd2",
        name: "Dehio Berlin 1906",
        year: "1906",
        icon: "🏛️",
        color: "#8B4513",
        dataFile: "dehio1906bd2.json",
        imageFolder: "dehio1906bd2"
    }];
    
    populateInventorySelector();
}

function populateInventorySelector() {
    const select = document.getElementById('inventory-select');
    select.innerHTML = '<option value="">-- Inventar wählen --</option>';
    inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = `${inventory.icon} ${inventory.name} (${inventory.year})`;
        option.title = inventory.fullTitle || inventory.name;
        select.appendChild(option);
    });
}

async function loadInventory(inventoryId) {
    if (allObjects[inventoryId]) return allObjects[inventoryId];
    
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return null;
    
    try {
        const response = await fetch(`data/${inventory.dataFile}`);
        const data = await response.json();
        
        data.objects.forEach(obj => {
            obj.inventoryId = inventoryId;
            obj.inventoryName = inventory.name;
            obj.inventoryColor = inventory.color;
        });
        
        allObjects[inventoryId] = data.objects;
        return data.objects;
        
    } catch (error) {
        console.error(`Fehler beim Laden von ${inventoryId}:`, error);
        return null;
    }
}

async function displayInventory(inventoryId) {
    const objects = await loadInventory(inventoryId);
    if (!objects) return;
    
    currentInventory = inventoryId;
    const inventory = inventories.find(inv => inv.id === inventoryId);
    
    clearAllMarkers();
    addMarkersForInventory(inventoryId, objects, inventory.color);
    
    displayObjectList(objects);
    updateActiveInventoriesDisplay();
}

async function displayAllInventories() {
    clearAllMarkers();
    
    for (const inventory of inventories) {
        const objects = await loadInventory(inventory.id);
        if (objects) {
            addMarkersForInventory(inventory.id, objects, inventory.color);
        }
    }
    
    updateActiveInventoriesDisplay();
}

function addMarkersForInventory(inventoryId, objects, color) {
    const layerGroup = L.layerGroup();
    
    objects.forEach(obj => {
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const marker = L.marker(obj.coordinates, { icon: customIcon })
            .bindPopup(`
                <b>${obj.name}</b><br>
                <small>${obj.inventoryName || 'Unbekanntes Inventar'}</small><br>
                ${obj.address}
            `)
            .on('click', () => showObjectDetail(obj.id, inventoryId));
        
        layerGroup.addLayer(marker);
    });
    
    markerLayers[inventoryId] = layerGroup;
    layerGroup.addTo(map);
}

function clearAllMarkers() {
    Object.values(markerLayers).forEach(layer => {
        map.removeLayer(layer);
    });
    markerLayers = {};
}

function displayObjectList(objects) {
    const objectList = document.getElementById('object-list');
    
    const html = objects.map(obj => `
        <div class="object-item" onclick="showObjectDetail('${obj.id}', '${obj.inventoryId}')">
            <h4>${obj.name}</h4>
            <p>${obj.address}</p>
            <small>${obj.category || 'Kategorie unbekannt'}</small>
            ${has3DModel(obj) ? '<span class="model-indicator">🏛️ 3D</span>' : ''}
        </div>
    `).join('');
    
    objectList.innerHTML = `<h3>Objekte (${objects.length})</h3>${html}`;
}

function updateActiveInventoriesDisplay() {
    const activeDiv = document.getElementById('active-inventories');
    const activeInventories = Object.keys(markerLayers);
    
    if (activeInventories.length === 0) {
        activeDiv.innerHTML = '<p>Keine Inventare aktiv</p>';
        return;
    }
    
    const html = activeInventories.map(inventoryId => {
        const inventory = inventories.find(inv => inv.id === inventoryId);
        return `
            <div class="inventory-badge" style="background-color: ${inventory.color}">
                ${inventory.icon} ${inventory.name}
            </div>
        `;
    }).join('');
    
    activeDiv.innerHTML = `<h4>Aktive Inventare:</h4>${html}`;
}

function setupEventListeners() {
    document.getElementById('inventory-select').addEventListener('change', function(e) {
        if (e.target.value) {
            document.getElementById('show-all-inventories').checked = false;
            displayInventory(e.target.value);
        }
    });
    
    document.getElementById('show-all-inventories').addEventListener('change', function(e) {
        if (e.target.checked) {
            document.getElementById('inventory-select').value = "";
            displayAllInventories();
        } else {
            clearAllMarkers();
            document.getElementById('object-list').innerHTML = '';
            updateActiveInventoriesDisplay();
        }
    });
    
    document.getElementById('close-detail').addEventListener('click', function() {
        document.getElementById('detail-view').classList.add('hidden');
        // 3D-Viewer auch resetten
        if(window.ThreeViewer) window.ThreeViewer.resetViewer();
    });
    
    document.getElementById('search').addEventListener('input', function(e) {
        searchObjects(e.target.value);
    });
    
    setup3DViewerListeners();
}

function setup3DViewerListeners() {
    const showImagesBtn = document.getElementById('show-images');
    const show3DBtn = document.getElementById('show-3d');
    const imagesContainer = document.getElementById('images-container');
    const modelViewer = document.getElementById('model-viewer');
    
    if (showImagesBtn) {
        showImagesBtn.addEventListener('click', function() {
            showImagesBtn.classList.add('active');
            if (show3DBtn) show3DBtn.classList.remove('active');
            imagesContainer.style.display = 'block';
            modelViewer.style.display = 'none';
        });
    }
    
    if (show3DBtn) {
        show3DBtn.addEventListener('click', function() {
            show3DBtn.classList.add('active');
            if (showImagesBtn) showImagesBtn.classList.remove('active');
            imagesContainer.style.display = 'none';
            modelViewer.style.display = 'block';
            
            if (window.ThreeViewer && !window.ThreeViewer.isInitialized) {
                window.ThreeViewer.initializeViewer();
            }
        });
    }
}

function has3DModel(obj) {
    return obj.model3D || obj.model || obj.threeDModel;
}

function get3DModelPath(obj, inventoryId) {
    if (obj.model3D) {
        if (obj.model3D.startsWith('http') || obj.model3D.startsWith('/')) return obj.model3D;
        return `images/models/${inventoryId}/${obj.model3D}`;
    }
    if (obj.model) {
        return obj.model.startsWith('http') ? obj.model : `images/models/${inventoryId}/${obj.model}`;
    }
    if (obj.threeDModel) {
        return obj.threeDModel.startsWith('http') ? obj.threeDModel : `images/models/${inventoryId}/${obj.threeDModel}`;
    }
    return null;
}

function showObjectDetail(objectId, inventoryId) {
    const objects = allObjects[inventoryId];
    if (!objects) return;
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;
    
    const inventory = inventories.find(inv => inv.id === inventoryId);
    
    const hasModel = has3DModel(obj);
    const modelPath = hasModel ? get3DModelPath(obj, inventoryId) : null;
    
    const images = Array.isArray(obj.images) ? obj.images : [obj.images];
    
    const detailHtml = `
        <div class="inventory-badge" style="background-color: ${inventory.color}">
            ${inventory.icon} ${inventory.name}
        </div>
        <h2>${obj.name}</h2>
        <p><strong>Adresse:</strong> ${obj.address}</p>
        
        <div class="view-toggle">
            <button id="show-images" class="active">📷 Bilder</button>
            ${hasModel ? '<button id="show-3d">🏛️ 3D-Modell</button>' : ''}
        </div>
        
        <div id="images-container">
            <div class="images-gallery">
                ${images.map(img => 
                    `<img src="${img.startsWith('http') ? img : 'images/objects/' + img}" alt="${obj.name}" onerror="this.style.display='none'">`
                ).join('')}
            </div>
            
            ${obj.grundriss ? `
                <div class="grundriss-section">
                    <h3>Grundriss</h3>
                    <img src="images/${obj.grundriss}" alt="Grundriss ${obj.name}" class="grundriss-image" onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            ${obj.faksimile ? `
                <div class="faksimile-section">
                    <h3>Originalseite ${obj.faksimile.page || ''}</h3>
                    ${obj.faksimile.local ? 
                        (Array.isArray(obj.faksimile.local) ? 
                            obj.faksimile.local.map(faks => {
                                const imageSrc = faks.startsWith('http') ? faks : `images/facsimiles/${faks}${faks.endsWith('.jpg') ? '' : '.jpg'}`;
                                return `<img src="${imageSrc}" alt="Faksimile ${obj.name}" class="faksimile-image" onerror="this.style.display='none'>`;
                            }).join('') :
                            (() => {
                                const imageSrc = obj.faksimile.local.startsWith('http') ? obj.faksimile.local : `images/facsimiles/${obj.faksimile.local}${obj.faksimile.local.endsWith('.jpg') ? '' : '.jpg'}`;
                                return `<img src="${imageSrc}" alt="Faksimile ${obj.name}" class="faksimile-image" onerror="this.style.display='none'>`;
                            })()
                        )
                        : ''
                    }
                    ${obj.faksimile.external && obj.faksimile.external.url ? `
                        <div class="external-links">
                            <h4>Externe Faksimile-Links:</h4>
                            ${Array.isArray(obj.faksimile.external.url) ?
                                obj.faksimile.external.url.map(url => `<a href="${url}" target="_blank">→ Faksimile anzeigen</a>`).join('') :
                                `<a href="${obj.faksimile.external.url}" target="_blank">→ Faksimile anzeigen</a>`
                            }
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
        
        <div id="model-viewer" style="display:none; width: 100%; height: 400px; margin-top: 10px;"></div>
    `;
    
    const detailView = document.getElementById('detail-view');
    detailView.innerHTML = detailHtml;
    detailView.classList.remove('hidden');
    
    setup3DViewerListeners();
    
    if (hasModel) {
        // Nach dem Rendern den 3D-Button event listener aktivieren
        document.getElementById('show-3d').addEventListener('click', () => {
            document.getElementById('show-3d').classList.add('active');
            document.getElementById('show-images').classList.remove('active');
            document.getElementById('images-container').style.display = 'none';
            document.getElementById('model-viewer').style.display = 'block';
            window.ThreeViewer.loadModel(modelPath);
        });
    }
}

// Suche nach Objekten über alle Inventare
function searchObjects(term) {
    term = term.toLowerCase();
    let results = [];
    
    for (const invId in allObjects) {
        const objs = allObjects[invId];
        results = results.concat(objs.filter(o =>
            o.name.toLowerCase().includes(term) ||
            (o.address && o.address.toLowerCase().includes(term))
        ));
    }
    
    if (results.length > 0) {
        displayObjectList(results);
    } else {
        document.getElementById('object-list').innerHTML = `<p>Keine Objekte gefunden für "${term}".</p>`;
    }
}

// --- Three.js 3D Viewer Setup ---
function initThreeViewer() {
    window.ThreeViewer = (function(){
        let scene, camera, renderer, controls;
        let model = null;
        let container = document.getElementById('model-viewer');
        let isInitialized = false;
        
        // Drei.js Module laden
        async function loadThreeModules() {
            if (window.THREE) return;
            // Dynamisches Laden ist hier beispielhaft, Three.js muss über <script> eingebunden sein.
            // Falls nicht, hier kann man CDN laden, oder statisch <script src="...three.min.js"> verwenden.
        }
        
        function initializeViewer() {
            if (isInitialized) return;
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf0f0f0);
            
            camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 2, 5);
            
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 1, 0);
            controls.update();
            
            // Licht
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
            hemiLight.position.set(0, 20, 0);
            scene.add(hemiLight);
            
            const dirLight = new THREE.DirectionalLight(0xffffff);
            dirLight.position.set(3, 10, 10);
            scene.add(dirLight);
            
            isInitialized = true;
            animate();
        }
        
        function animate() {
            requestAnimationFrame(animate);
            if (controls) controls.update();
            if (renderer && scene && camera) renderer.render(scene, camera);
        }
        
        function clearModel() {
            if (model) {
                scene.remove(model);
                model.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                model = null;
            }
        }
        
        function loadModel(path) {
            if (!isInitialized) initializeViewer();
            clearModel();
            const loader = new THREE.GLTFLoader();
            loader.load(path, gltf => {
                model = gltf.scene;
                scene.add(model);
                // Zentrieren
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);
                
                // Kamera Position anpassen
                const size = box.getSize(new THREE.Vector3()).length();
                camera.position.set(size, size, size);
                controls.target.set(0, 0, 0);
                controls.update();
            }, undefined, error => {
                console.error('3D-Modell konnte nicht geladen werden:', error);
            });
        }
        
        function resetViewer() {
            clearModel();
            if (renderer && container) {
                while (container.firstChild) container.removeChild(container.firstChild);
            }
            isInitialized = false;
        }
        
        return {
            initializeViewer,
            loadModel,
            resetViewer,
            get isInitialized() { return isInitialized; }
        };
    })();
}
