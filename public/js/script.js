const socket = io();

const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            osm: {
                type: "raster",
                tiles: [
                    "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
            },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
    },
    center: [0, 0], 
    zoom: 2,       
});

map.addControl(new maplibregl.NavigationControl());

const markers = {};

let lastSent = 0;

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const now = Date.now();
            if (now - lastSent < 2000) return; 
            lastSent = now;

            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });
        },
        console.error,
        { enableHighAccuracy: true }
    );
}

socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    const lngLat = [longitude, latitude];

    if (!markers[id]) {
        markers[id] = new maplibregl.Marker({ color: "red" })
            .setLngLat(lngLat)
            .addTo(map);
    } else {
        markers[id].setLngLat(lngLat);
    }
});

socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        markers[id].remove();
        delete markers[id];
    }
});
