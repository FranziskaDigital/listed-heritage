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

// Inventare laden
async function loadInventories() {
    try {
        const response = await fetch('data/inventories.json');
        const data = await response.json();
        inventories = data.inventories;
        
        populateInventorySelector();
        
    } catch (error) {
        console.error('Fehler beim Laden der Inventare:', error);
    }
}

// Inventar-Auswahlmenü befüllen
function populateInventorySelector() {
    const select = document.getElementById('inventory-select');
    
    inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = `${inventory.icon} ${inventory.name} (${inventory.year})`;
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
                <small>${obj.inventoryName}</small><br>
                ${obj.address}
            `)
            .on('click', () => showObjectDetail(obj.id, inventoryId));
        
        layerGroup.addLayer(marker);
    });
    
    markerLayers[inventoryId] = layerGroup;
    layerGroup.addTo(map);
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
        }
    });
}

// Objektdetails anzeigen (erweitert)
function showObjectDetail(objectId, inventoryId) {
    const objects = allObjects[inventoryId];
    const obj = objects.find(o => o.id === objectId);
    if (!obj) return;
    
    const inventory = inventories.find(inv => inv.id === inventoryId);
    const basePath = `images/${inventory.imageFolder}`;
    
    const detailHtml = `
        <div class="inventory-badge" style="background-color: ${inventory.color}">
            ${inventory.icon} ${inventory.name}
        </div>
        <h2>${obj.name}</h2>
        <p><strong>Adresse:</strong> ${obj.address}</p>
        
        <div class="images-gallery">
            ${obj.images.map(img => 
                `<img src="${basePath}/objects/${img}" alt="${obj.name}">`
            ).join('')}
        </div>
        
        ${obj.faksimile ? `
            <div class="faksimile-section">
                <h3>Originalseite ${obj.faksimile.page || ''}</h3>
                <img src="${basePath}/faksimile/${obj.faksimile.local}" 
                     alt="Faksimile ${obj.name}" 
                     class="faksimile-image">
            </div>
        ` : ''}
        
        <div class="description">
            <h3>Beschreibung</h3>
            <p>${obj.description}</p>
        </div>
        
        ${obj.category ? `<p><strong>Kategorie:</strong> ${obj.category}</p>` : ''}
        ${obj.period ? `<p><strong>Epoche:</strong> ${obj.period}</p>` : ''}
    `;
    
    document.getElementById('detail-content').innerHTML = detailHtml;
    document.getElementById('detail-view').classList.remove('hidden');
}