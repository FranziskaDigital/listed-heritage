// script.js
document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView([52.5200, 13.4050], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let inventories = [];
    let currentInventory = null;
    let allObjects = {};
    let markerLayers = {};

    // Initialisierung
    initMap();
    loadInventories();
    setupEventListeners();

    function initMap() {
        // Karte initialisieren (wird in index.html definiert)
    }

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
                imageFolder: inv.id
            }));
            populateInventorySelector();
        } catch (error) {
            console.error('Fehler beim Laden der Inventare:', error);
            createDemoInventory();
        }
    }

    function getColorForInventory(inventoryId) {
        const colors = ['#8B4513', '#2F4F4F', '#8B0000', '#006400', '#4B0082'];
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
        inventories.forEach(inventory => {
            const option = document.createElement('option');
            option.value = inventory.id;
            option.textContent = `${inventory.icon} ${inventory.name} (${inventory.year})`;
            select.appendChild(option);
        });
    }

    function setupEventListeners() {
        document.getElementById('inventory-select').addEventListener('change', function(e) {
            if (e.target.value) {
                displayInventory(e.target.value);
            }
        });

        document.getElementById('show-all-inventories').addEventListener('change', function(e) {
            if (e.target.checked) {
                displayAllInventories();
            } else {
                clearAllMarkers();
            }
        });

        document.getElementById('search').addEventListener('input', function(e) {
            searchObjects(e.target.value);
        });

        document.getElementById('close-detail').addEventListener('click', function() {
            document.getElementById('detail-view').classList.add('hidden');
        });
    }

    async function displayInventory(inventoryId) {
        const objects = await loadInventory(inventoryId);
        currentInventory = inventoryId;
        clearAllMarkers();
        addMarkersForInventory(inventoryId, objects);
        displayObjectList(objects);
    }

    async function loadInventory(inventoryId) {
        if (allObjects[inventoryId]) return allObjects[inventoryId];
        const inventory = inventories.find(inv => inv.id === inventoryId);
        try {
            const response = await fetch(`data/${inventory.dataFile}`);
            const data = await response.json();
            data.objects.forEach(obj => {
                obj.inventoryId = inventoryId;
                obj.inventoryName = inventory.name;
            });
            allObjects[inventoryId] = data.objects;
            return data.objects;
        } catch (error) {
            console.error(`Fehler beim Laden von ${inventoryId}:`, error);
            return null;
        }
    }

    function addMarkersForInventory(inventoryId, objects) {
        const layerGroup = L.layerGroup();
        objects.forEach(obj => {
            const marker = L.marker(obj.coordinates, {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${getColorForInventory(inventoryId)}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                    iconSize: [16, 16]
                })
            }).bindPopup(`
                <b>${obj.name}</b><br>
                ${obj.address}
            `).on('click', () => showObjectDetail(obj.id, inventoryId));
            layerGroup.addLayer(marker);
        });
        markerLayers[inventoryId] = layerGroup;
        layerGroup.addTo(map);
    }

    function clearAllMarkers() {
        Object.values(markerLayers).forEach(layer => map.removeLayer(layer));
        markerLayers = {};
    }

    function displayObjectList(objects) {
        const objectList = document.getElementById('object-list');
        const html = objects.map(obj => `
            <div class="object-item" onclick="showObjectDetail('${obj.id}', '${obj.inventoryId}')">
                <h4>${obj.name}</h4>
                <p>${obj.address}</p>
            </div>
        `).join('');
        objectList.innerHTML = `<h3>Objekte (${objects.length})</h3>${html}`;
    }

    function showObjectDetail(objectId, inventoryId) {
        const obj = allObjects[inventoryId].find(o => o.id === objectId);
        const detailHtml = `
            <div class="inventory-badge" style="background-color: ${getColorForInventory(inventoryId)}">
                ${inventories.find(inv => inv.id === inventoryId).icon} ${inventories.find(inv => inv.id === inventoryId).name}
            </div>
            <h2>${obj.name}</h2>
            <p><strong>Adresse:</strong> ${obj.address}</p>
            <div class="view-toggle">
                <button id="show-images" class="active">📷 Bilder</button>
                <button id="show-3d">🏛️ 3D-Modell</button>
            </div>
            <div id="images-container">
                ${obj.images.map(img => `<img src="images/objects/${img}" alt="${obj.name}">`).join('')}
            </div>
            <div id="model-viewer" style="display: none;"></div>
        `;
        document.getElementById('detail-content').innerHTML = detailHtml;
        document.getElementById('detail-view').classList.remove('hidden');
        
        // 3D-Modell-Viewer initialisieren
        if (obj.models) {
            init3DViewer(obj.models);
        }
    }

    function init3DViewer(modelPath) {
        const container = document.getElementById('model-viewer');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const loader = new THREE.GLTFLoader();
        loader.load(`images/models/${modelPath}`, function(gltf) {
            scene.add(gltf.scene);
            const model = gltf.scene;
            model.scale.set(0.1, 0.1, 0.1);
            camera.position.z = 5;
            animate();
        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
    }

    // Weitere Hilfsfunktionen (z.B. für die Suche) hier implementieren
});