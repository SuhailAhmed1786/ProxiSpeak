import { useEffect, useRef } from "react";
import socket, { getPersistentUserId } from "../socket";
import {
    initLocalAudio,
    callPeer,
    setupSignalingListeners,
    closePeer,
    closeAllPeers,
    setRemoteVolume,
    setRemotePan,
    peerExists,
    resumeAudioContext,
} from "../webrtc";

const ENTER_RADIUS = 100;

const userId = getPersistentUserId(); // stable across reconnects, computed once at module load

const VirtualOffice = () => {
    const remotePlayers = useRef({});
    const keys = useRef({});
    const lastEmitTime = useRef(0);
    const canvasRef = useRef(null);
    const PROXIMITY_DISTANCE = 100;

    const player = useRef({
        x: 200,
        y: 200,
        radius: 20,
        speed: 180,
        name: "Suhail",
    });
    const updateAudioForAllPeers = () => {
        Object.entries(remotePlayers.current).forEach(([remoteUserId, remotePlayer]) => {
            const dist = Math.hypot(
                player.current.x - remotePlayer.x,
                player.current.y - remotePlayer.y
            );

            if (dist <= ENTER_RADIUS && !peerExists(remoteUserId) && userId < remoteUserId) {
                callPeer(remoteUserId, attachRemoteAudio);
            }

            const volume = Math.max(0, 1 - dist / ENTER_RADIUS);
            setRemoteVolume(remoteUserId, volume);

            const dx = remotePlayer.x - player.current.x;
            const pan = Math.max(-1, Math.min(1, dx / ENTER_RADIUS));
            setRemotePan(remoteUserId, pan);
        });
    };
    const attachRemoteAudio = (remoteUserId, stream) => {
        let audioEl = document.getElementById(`audio-${remoteUserId}`);
        if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = `audio-${remoteUserId}`;
            audioEl.autoplay = true;
            audioEl.muted = true; // Web Audio graph handles actual output — avoid a double audio path
            document.body.appendChild(audioEl);
        }
        audioEl.srcObject = stream;
    };

    const removeRemoteAudio = (remoteUserId) => {
        const audioEl = document.getElementById(`audio-${remoteUserId}`);
        if (audioEl) audioEl.remove();
    };

    // ---------------------------------------
    // Connection, join, WebRTC signaling setup
    // ---------------------------------------
    useEffect(() => {
        initLocalAudio().catch((err) => console.error("Mic access denied:", err));

        const cleanupSignaling = setupSignalingListeners((remoteUserId, stream) => {
            attachRemoteAudio(remoteUserId, stream);
        });

        const handleConnect = () => {
            socket.emit("player:join", {
                userId,
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
            cleanupSignaling();
            closeAllPeers();
        };
    }, []);

    // ---------------------------------------
    // Keyboard input
    // ---------------------------------------
    useEffect(() => {
        const handleKeyDown = (event) => {
            keys.current[event.key.toLowerCase()] = true;
            resumeAudioContext(); // browsers block audio until a user gesture happens
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
                if (p.userId === userId) return;
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
            if (p.userId === userId) return;

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
    // Remote player movement + proximity-based WebRTC (volume + pan)
    // Connection is established once and kept alive — never torn down
    // just because of distance. Only volume/pan change with distance.
    // ---------------------------------------
    useEffect(() => {
        const handlePlayerMoved = ({ userId: remoteUserId, x, y }) => {
            if (remoteUserId === userId) return;

            if (!remotePlayers.current[remoteUserId]) {
                remotePlayers.current[remoteUserId] = { x, y, radius: 20, name: remoteUserId };
            } else {
                remotePlayers.current[remoteUserId].x = x;
                remotePlayers.current[remoteUserId].y = y;
            }
        };

        socket.on("player:moved", handlePlayerMoved);
        return () => socket.off("player:moved", handlePlayerMoved);
    }, []);

    // ---------------------------------------
    // Remote player left (actual disconnect) — only place connections are closed
    // ---------------------------------------
    useEffect(() => {
        const handlePlayerLeft = ({ userId: remoteUserId }) => {
            console.log("Player left:", remoteUserId);
            delete remotePlayers.current[remoteUserId];
            closePeer(remoteUserId);
            removeRemoteAudio(remoteUserId);
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
            updateAudioForAllPeers();
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
