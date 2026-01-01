const socket = io();

let myId = null;
let followMe = true;

socket.on("connect", () => {
    myId = socket.id;
});

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
                attribution: "© Bansi Tracker",
            },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
    },
    center: [0, 0],
    zoom: 2,
});

map.addControl(new maplibregl.NavigationControl());

const markers = {};

// 🟢 Send location (throttled)
let lastSent = 0;

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const now = Date.now();
            if (now - lastSent < 2000) return; // ⏱️ 2 sec throttle
            lastSent = now;

            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });

            // Follow ONLY my own location
            if (followMe && myId && markers[myId]) {
                map.easeTo({
                    center: [longitude, latitude],
                    zoom: 16,
                    duration: 800,
                });
            }
        },
        console.error,
        { enableHighAccuracy: true }
    );
}

// 🔵 Receive locations
socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    const lngLat = [longitude, latitude];

    if (!markers[id]) {
        markers[id] = new maplibregl.Marker({
            color: id === myId ? "blue" : "red",
        })
            .setLngLat(lngLat)
            .addTo(map);
    } else {
        markers[id].setLngLat(lngLat);
    }
});

// ❌ Remove disconnected users
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        markers[id].remove();
        delete markers[id];
    }
});

// 🧠 Stop auto-follow when user interacts
map.on("mousedown", () => (followMe = false));
map.on("wheel", () => (followMe = false));
map.on("touchstart", () => (followMe = false));
