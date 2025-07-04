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
        
        // Inventare aus der verschachtelten Struktur extrahieren und normalisieren
        inventories = data.inventories.map(inv => ({
            id: inv.id,
            name: inv.metadata?.bibliographic?.title?.main || 'Unbenanntes Inventar',
            year: inv.metadata?.bibliographic?.publication?.year || 'Unbekannt',
            icon: '🏛️', // Standard-Icon
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
        // Fallback: Demo-Inventar erstellen
        createDemoInventory();
    }
}

// Farbe für Inventar basierend auf ID generieren
function getColorForInventory(inventoryId) {
    const colors = ['#8B4513', '#2F4F4F', '#8B0000', '#006400', '#4B0082', '#CD853F', '#4682B4', '#B22222'];
    const hash = inventoryId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
}

// Demo-Inventar für Test ohne inventories.json
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

// Inventar-Auswahlmenü befüllen
function populateInventorySelector() {
    const select = document.getElementById('inventory-select');
    
    inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = `${inventory.icon} ${inventory.name} (${inventory.year})`;
        option.title = inventory.fullTitle || inventory.name; // Tooltip mit vollem Titel
        select.appendChild(option);
    });
}

// Spezifisches Inventar laden
async function loadInventory(inventoryId) {
    if (allObjects[inventoryId]) {
        return allObjects[inventoryId];
    }
    
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return null;
    
    try {
        const response = await fetch(`data/${inventory.dataFile}`);
        const data = await response.json();
        
        // Objekte mit Inventar-Info erweitern
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

// Inventar anzeigen
async function displayInventory(inventoryId) {
    const objects = await loadInventory(inventoryId);
    if (!objects) return;
    
    currentInventory = inventoryId;
    const inventory = inventories.find(inv => inv.id === inventoryId);
    
    // Bestehende Marker entfernen
    clearAllMarkers();
    
    // Neue Marker hinzufügen
    addMarkersForInventory(inventoryId, objects, inventory.color);
    
    // Sidebar aktualisieren
    displayObjectList(objects);
    updateActiveInventoriesDisplay();
}

// Alle Inventare gleichzeitig anzeigen
async function displayAllInventories() {
    clearAllMarkers();
    
    for (let i = 0; i < inventories.length; i++) {
        const inventory = inventories[i];
        const objects = await loadInventory(inventory.id);
        if (objects) {
            addMarkersForInventory(inventory.id, objects, inventory.color);
        }
    }
    
    updateActiveInventoriesDisplay();
}

// Marker für ein Inventar hinzufügen
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

// Alle Marker löschen
function clearAllMarkers() {
    Object.values(markerLayers).forEach(layer => {
        map.removeLayer(layer);
    });
    markerLayers = {};
}

// Objektliste anzeigen
function displayObjectList(objects) {
    const objectList = document.getElementById('object-list');
    
    const html = objects.map(obj => `
        <div class="object-item" onclick="showObjectDetail('${obj.id}', '${obj.inventoryId}')">
            <h4>${obj.name}</h4>
            <p>${obj.address}</p>
            <small>${obj.category || 'Kategorie unbekannt'}</small>
            ${obj.model3D ? '<span class="model-indicator">🏛️ 3D</span>' : ''}
        </div>
    `).join('');
    
    objectList.innerHTML = `<h3>Objekte (${objects.length})</h3>${html}`;
}

// Aktive Inventare anzeigen
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

// Event Listeners
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
    
    // Detail-View schließen
    document.getElementById('close-detail').addEventListener('click', function() {
        document.getElementById('detail-view').classList.add('hidden');
    });
    
    // Suchfunktion
    document.getElementById('search').addEventListener('input', function(e) {
        searchObjects(e.target.value);
    });
    
    // 3D-Viewer Event Listeners
    setup3DViewerListeners();
}

// 3D-Viewer Event Listeners
function setup3DViewerListeners() {
    const showImagesBtn = document.getElementById('show-images');
    const show3DBtn = document.getElementById('show-3d');
    const imagesContainer = document.getElementById('images-container');
    const modelViewer = document.getElementById('model-viewer');
    
    if (showImagesBtn) {
        showImagesBtn.addEventListener('click', function() {
            showImagesBtn.classList.add('active');
            show3DBtn.classList.remove('active');
            imagesContainer.style.display = 'block';
            modelViewer.style.display = 'none';
        });
    }
    
    if (show3DBtn) {
        show3DBtn.addEventListener('click', function() {
            show3DBtn.classList.add('active');
            showImagesBtn.classList.remove('active');
            imagesContainer.style.display = 'none';
            modelViewer.style.display = 'block';
            
            // 3D-Viewer initialisieren, wenn noch nicht geschehen
            if (window.ThreeViewer && !window.ThreeViewer.isInitialized) {
                window.ThreeViewer.initializeViewer();
            }
        });
    }
}

// Prüfen ob 3D-Modell verfügbar ist
function has3DModel(obj) {
    return obj.model3D || obj.model || obj.threeDModel;
}

// 3D-Modell-Pfad extrahieren
function get3DModelPath(obj, inventoryId) {
    if (obj.model3D) {
        // Wenn vollständiger Pfad oder URL
        if (obj.model3D.startsWith('http') || obj.model3D.startsWith('/')) {
            return obj.model3D;
        }
        // Relativer Pfad
        return `models/${inventoryId}/${obj.model3D}`;
    }
    
    if (obj.model) {
        return obj.model.startsWith('http') ? obj.model : `models/${inventoryId}/${obj.model}`;
    }
    
    if (obj.threeDModel) {
        return obj.threeDModel.startsWith('http') ? obj.threeDModel : `models/${inventoryId}/${obj.threeDModel}`;
    }
    
    return null;
}

// Objektdetails anzeigen (erweiterte Version)
function showObjectDetail(objectId, inventoryId) {
    const objects = allObjects[inventoryId];
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;
    
    const inventory = inventories.find(inv => inv.id === inventoryId);
    const basePath = `images/${inventory.imageFolder}`;
    
    // Prüfen ob 3D-Modell verfügbar
    const hasModel = has3DModel(obj);
    const modelPath = hasModel ? get3DModelPath(obj, inventoryId) : null;
    
    // Bilder-Array normalisieren
    const images = Array.isArray(obj.images) ? obj.images : [obj.images];
    
    const detailHtml = `
        <div class="inventory-badge" style="background-color: ${inventory.color}">
            ${inventory.icon} ${inventory.name}
        </div>
        <h2>${obj.name}</h2>
        <p><strong>Adresse:</strong> ${obj.address}</p>
        
        <!-- View Toggle Buttons -->
        <div class="view-toggle">
            <button id="show-images" class="active">📷 Bilder</button>
            ${hasModel ? '<button id="show-3d">🏛️ 3D-Modell</button>' : ''}
        </div>
        
        <!-- Bilder Container -->
        <div id="images-container">
            <div class="images-gallery">
                ${images.map(img => 
                    `<img src="${img.startsWith('http') ? img : 'images/objects/' + img}" alt="${obj.name}" onerror="this.style.display='none'"`
                ).join('')}
            </div>
            
            ${obj.grundriss ? `
                <div class="grundriss-section">
                    <h3>Grundriss</h3>
                    <img src="images/${obj.grundriss}" 
                         alt="Grundriss ${obj.name}" 
                         class="grundriss-image"
                         onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            ${obj.faksimile ? `
                <div class="faksimile-section">
                    <h3>Originalseite ${obj.faksimile.page || ''}</h3>
                    
                    ${obj.faksimile.local ? `
                        ${Array.isArray(obj.faksimile.local) ? 
                            obj.faksimile.local.map(faks => {
                                const imageSrc = faks.startsWith('http') ? faks : `images/facsimiles/${faks}${faks.endsWith('.jpg') ? '' : '.jpg'}`;
                                return `<img src="${imageSrc}" 
                                            alt="Faksimile ${obj.name}" 
                                            class="faksimile-image"
                                            onerror="this.style.display='none'">`;
                            }).join('') :
                            (() => {
                                const imageSrc = obj.faksimile.local.startsWith('http') ? obj.faksimile.local : `images/facsimiles/${obj.faksimile.local}${obj.faksimile.local.endsWith('.jpg') ? '' : '.jpg'}`;
                                return `<img src="${imageSrc}" 
                                            alt="Faksimile ${obj.name}" 
                                            class="faksimile-image"
                                            onerror="this.style.display='none'">`;
                            })()
                        }
                    ` : ''}
                    
                    ${obj.faksimile.external && obj.faksimile.external.url ? `
                        <div class="external-links">
                            <h4>Externe Faksimile-Links:</h4>
                            ${Array.isArray(obj.faksimile.external.url) ?
                                obj.faksimile.external.url.map(url => 
                                    `<a href="${url}" target="_blank">→ Faksimile anzeigen</a>`
                                ).join('<br>') :
                                `<a href="${obj.faksimile.external.url}" target="_blank">→ Faksimile anzeigen</a>`
                            }
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
        
        <!-- 3D-Modell Container -->
        ${hasModel ? `
            <div id="model-viewer" style="display: none;">
                <div class="loading-indicator" id="loading-indicator">
                    <p>3D-Modell wird geladen...</p>
                </div>
                <div class="model-controls">
                    <button id="reset-view" title="Ansicht zurücksetzen">🔄</button>
                    <button id="wireframe-toggle" title="Wireframe an/aus">📐</button>
                    <button id="fullscreen-toggle" title="Vollbild">⛶</button>
                </div>
                <div class="model-info" id="model-info">
                    Maus: Drehen | Scrollrad: Zoomen | Rechtsklick: Verschieben
                </div>
            </div>
        ` : ''}
        
        <div class="description">
            <h3>Beschreibung</h3>
            <p>${obj.description}</p>
        </div>
        
        ${obj.category ? `<p><strong>Kategorie:</strong> ${obj.category}</p>` : ''}
        ${obj.period ? `<p><strong>Epoche:</strong> ${obj.period}</p>` : ''}
        ${hasModel ? `<p><strong>3D-Modell:</strong> Verfügbar</p>` : ''}
    `;
    
    document.getElementById('detail-content').innerHTML = detailHtml;
    document.getElementById('detail-view').classList.remove('hidden');
    
    // Event Listeners für die neuen Buttons einrichten
    setup3DViewerListeners();
    
    // 3D-Modell laden wenn verfügbar
    if (hasModel && window.ThreeViewer && modelPath) {
        // Verzögerung um sicherzustellen, dass DOM bereit ist
        setTimeout(() => {
            window.ThreeViewer.loadModel(modelPath);
        }, 100);
    }
    
    // Zum Marker auf der Karte zoomen
    map.setView(obj.coordinates, 16);
}

// Suchfunktion
function searchObjects(searchTerm) {
    if (!searchTerm.trim()) {
        // Alle aktuell geladenen Objekte anzeigen
        if (currentInventory && allObjects[currentInventory]) {
            displayObjectList(allObjects[currentInventory]);
        }
        return;
    }
    
    const term = searchTerm.toLowerCase();
    let allCurrentObjects = [];
    
    // Sammle alle aktuell angezeigten Objekte
    Object.keys(markerLayers).forEach(inventoryId => {
        if (allObjects[inventoryId]) {
            allCurrentObjects = allCurrentObjects.concat(allObjects[inventoryId]);
        }
    });
    
    const filteredObjects = allCurrentObjects.filter(obj => 
        obj.name.toLowerCase().includes(term) ||
        obj.description.toLowerCase().includes(term) ||
        obj.address.toLowerCase().includes(term) ||
        (obj.category && obj.category.toLowerCase().includes(term))
    );
    
    displayObjectList(filteredObjects);
}