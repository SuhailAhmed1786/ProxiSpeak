import { useEffect, useRef } from "react";
import socket from "../socket";
import { initLocalAudio, callPeer, setupSignalingListeners, closePeer, closeAllPeers,setRemoteVolume } from "../webrtc";

const PROXIMITY_RADIUS = 100;

const VirtualOffice = () => {
    const remotePlayers = useRef({});
    const keys = useRef({});
    const lastEmitTime = useRef(0);
    const canvasRef = useRef(null);

    const player = useRef({
        x: 200,
        y: 200,
        radius: 20,
        speed: 180,
        name: "Suhail",
    });

    // ---------------------------------------
    // Helper: attach/remove remote audio elements
    // ---------------------------------------
    const attachRemoteAudio = (remoteUserId, stream) => {
        let audioEl = document.getElementById(`audio-${remoteUserId}`);
        if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = `audio-${remoteUserId}`;
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
        }
        audioEl.srcObject = stream;
    };

    const removeRemoteAudio = (remoteUserId) => {
        const audioEl = document.getElementById(`audio-${remoteUserId}`);
        if (audioEl) audioEl.remove();
    };

    // ---------------------------------------
    // Connection, join, WebRTC setup
    // ---------------------------------------
    useEffect(() => {
        initLocalAudio().catch((err) => console.error("Mic access denied:", err));

        setupSignalingListeners((remoteUserId, stream) => {
            attachRemoteAudio(remoteUserId, stream);
        });

        const handleConnect = () => {
            console.log("Connected:", socket.id);
            socket.emit("player:join", {
                userId: socket.id,
                x: player.current.x,
                y: player.current.y,
                name: player.current.name,
            });
        };

        socket.on("connect", handleConnect);
        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off("connect", handleConnect);
            closeAllPeers();
        };
    }, []);

    // ---------------------------------------
    // Keyboard input
    // ---------------------------------------
    useEffect(() => {
        const handleKeyDown = (event) => {
            keys.current[event.key.toLowerCase()] = true;
        };
        const handleKeyUp = (event) => {
            keys.current[event.key.toLowerCase()] = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // ---------------------------------------
    // Existing players on join
    // ---------------------------------------
    useEffect(() => {
        const handlePlayersCurrent = (players) => {
            console.log("Existing players:", players);
            remotePlayers.current = {};

            players.forEach((p) => {
                if (p.userId === socket.id) return;
                remotePlayers.current[p.userId] = {
                    x: p.x,
                    y: p.y,
                    radius: 20,
                    name: p.name || p.userId,
                };
            });
        };

        socket.on("players:current", handlePlayersCurrent);
        return () => socket.off("players:current", handlePlayersCurrent);
    }, []);

    // ---------------------------------------
    // New player joined
    // ---------------------------------------
    useEffect(() => {
        const handlePlayerNew = (p) => {
            console.log("Player joined:", p);
            if (p.userId === socket.id) return;

            remotePlayers.current[p.userId] = {
                x: p.x,
                y: p.y,
                radius: 20,
                name: p.name || p.userId,
            };
        };

        socket.on("player:new", handlePlayerNew);
        return () => socket.off("player:new", handlePlayerNew);
    }, []);

    // ---------------------------------------
    // Remote player movement + proximity-based WebRTC
    // ---------------------------------------
    useEffect(() => {
        const handlePlayerMoved = ({ userId, x, y }) => {
            if (userId === socket.id) return;

            if (!remotePlayers.current[userId]) {
                remotePlayers.current[userId] = { x, y, radius: 20, name: userId };
            } else {
                remotePlayers.current[userId].x = x;
                remotePlayers.current[userId].y = y;
            }

            const dist = Math.hypot(player.current.x - x, player.current.y - y);

            if (dist <= PROXIMITY_RADIUS) {
            if (!peerExists(userId)) {
                if (socket.id < userId) callPeer(userId, attachRemoteAudio);
            }
            // linear falloff: 1.0 at distance 0, 0.0 at the radius edge
            const volume = 1 - dist / PROXIMITY_RADIUS;
            setRemoteVolume(userId, volume);
            } else {
            closePeer(userId);
            removeRemoteAudio(userId);
            }
        };

        socket.on("player:moved", handlePlayerMoved);
        return () => socket.off("player:moved", handlePlayerMoved);
    }, []);

    // ---------------------------------------
    // Remote player left
    // ---------------------------------------
    useEffect(() => {
        const handlePlayerLeft = ({ userId }) => {
            console.log("Player left:", userId);
            delete remotePlayers.current[userId];
            closePeer(userId);
            removeRemoteAudio(userId);
        };

        socket.on("player:left", handlePlayerLeft);
        return () => socket.off("player:left", handlePlayerLeft);
    }, []);

    // ---------------------------------------
    // Office rendering
    // ---------------------------------------
    const drawOffice = (ctx, width, height) => {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, width - 40, height - 40);

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 20; x <= width - 20; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
        }
        for (let y = 20; y <= height - 20; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(20, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
        }

        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(100, 100, 160, 70);
        ctx.fillStyle = "#475569";
        ctx.font = "14px Arial";
        ctx.fillText("Meeting Table", 135, 140);

        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(700, 100, 180, 70);
        ctx.fillStyle = "#475569";
        ctx.fillText("Work Table", 760, 140);

        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 400, 250, 120);
        ctx.fillStyle = "#475569";
        ctx.font = "16px Arial";
        ctx.fillText("Meeting Room", 165, 465);

        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(500, 450, 150, 50);
        ctx.fillStyle = "#334155";
        ctx.font = "14px Arial";
        ctx.fillText("Desk", 555, 480);
    };

    const drawAvatar = (ctx, user, isCurrentUser = false) => {
        if (!user) return;

        ctx.beginPath();
        ctx.arc(user.x, user.y, user.radius, 0, Math.PI * 2);
        ctx.fillStyle = isCurrentUser ? "#2563eb" : "#ef4444";
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();

        const name = user.name || "Player";
        ctx.font = "bold 12px Arial";
        const textWidth = ctx.measureText(name).width;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(user.x - textWidth / 2 - 5, user.y - user.radius - 25, textWidth + 10, 18);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(name, user.x, user.y - user.radius - 12);
        ctx.textAlign = "left";
    };

    // ---------------------------------------
    // Movement + game loop
    // ---------------------------------------
    const updatePlayer = (deltaTime) => {
        const p = player.current;
        let dx = 0;
        let dy = 0;

        if (keys.current["w"] || keys.current["arrowup"]) dy -= 1;
        if (keys.current["s"] || keys.current["arrowdown"]) dy += 1;
        if (keys.current["a"] || keys.current["arrowleft"]) dx -= 1;
        if (keys.current["d"] || keys.current["arrowright"]) dx += 1;

        if (dx === 0 && dy === 0) return false;

        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;

        p.x += dx * p.speed * deltaTime;
        p.y += dy * p.speed * deltaTime;

        const width = 1000;
        const height = 600;
        p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(height - p.radius, p.y));

        return true;
    };

    const sendPlayerPosition = (currentTime) => {
        if (currentTime - lastEmitTime.current < 50) return;
        lastEmitTime.current = currentTime;

        socket.emit("player:move", {
            x: player.current.x,
            y: player.current.y,
            name: player.current.name,
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        let animationFrameId;
        let previousTime = performance.now();

        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - previousTime) / 1000;
            previousTime = currentTime;

            const moved = updatePlayer(deltaTime);
            if (moved) sendPlayerPosition(currentTime);

            ctx.clearRect(0, 0, width, height);
            drawOffice(ctx, width, height);
            drawAvatar(ctx, player.current, true);

            Object.values(remotePlayers.current).forEach((remotePlayer) => {
                drawAvatar(ctx, remotePlayer, false);
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>Proxy Speak Virtual Office</h2>
            <p>
                Use <strong>W A S D</strong> or <strong>Arrow Keys</strong> to move.
            </p>

            <canvas
                ref={canvasRef}
                width={1000}
                height={600}
                style={{
                    border: "1px solid #333",
                    backgroundColor: "#f5f5f5",
                    maxWidth: "100%",
                }}
            />

            <div style={{ marginTop: "10px" }}>
                <span style={{ marginRight: "20px" }}>🔵 You</span>
                <span>🔴 Other Players</span>
            </div>
        </div>
    );
};

export default VirtualOffice;