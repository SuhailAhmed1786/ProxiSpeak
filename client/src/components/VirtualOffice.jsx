
import { useEffect, useRef, useState } from "react";
import socket from "../socket";

import {
    initLocalAudio,
    setupSignalingListeners,
    callPeer,
    peerExists,
    setRemoteVolume,
    resumeAudioContext,
} from "../webrtc";

import { getAudioVolume } from "../utils/audioAttenuation";

const PROXIMITY_DISTANCE = 100;

const VirtualOffice = () => {
    const canvasRef = useRef(null);
    const remotePlayers = useRef({});
    const keys = useRef({});
    const lastEmitTime = useRef(0);

    const audioReadyRef = useRef(false);
    const cleanupSignaling = useRef(null);
    const connectingPeers = useRef(new Set());

    const [audioReady, setAudioReady] = useState(false);
    const [audioError, setAudioError] = useState("");

    const player = useRef({
        x: 200,
        y: 200,
        radius: 20,
        speed: 180,
        name: "Suhail",
    });

    // Calculate distance between two players.
    const getDistance = (p1, p2) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;

        return Math.sqrt(dx * dx + dy * dy);
    };

    // Return nearby players with their distances.
    const getNearbyPlayers = () => {
        return Object.values(remotePlayers.current)
            .map((remotePlayer) => ({
                ...remotePlayer,
                distance: getDistance(player.current, remotePlayer),
            }))
            .filter(
                (remotePlayer) =>
                    remotePlayer.distance <= PROXIMITY_DISTANCE
            );
    };

    // Initialize microphone and WebRTC signaling after user clicks.
    const handleJoinAudio = async () => {
        try {
            setAudioError("");
            await initLocalAudio();
            await resumeAudioContext();

            if (!cleanupSignaling.current) {
                cleanupSignaling.current =
                    setupSignalingListeners((remoteUserId, stream) => {
                        console.log(
                            "Remote audio stream received:",
                            remoteUserId,
                            stream
                        );
                    });
            }

            audioReadyRef.current = true;
            setAudioReady(true);

            console.log("Audio initialized successfully");
        } catch (error) {
            console.error("Audio initialization failed:", error);
            setAudioError(
                error.message || "Could not initialize microphone."
            );
        }
    };

    // Join the virtual office when the socket connects.
    useEffect(() => {
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
        };
    }, []);

    // Keyboard controls.
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

    // Get players already connected.
    useEffect(() => {
        const handlePlayersList = (players) => {
            remotePlayers.current = {};

            players.forEach((remotePlayer) => {
                if (
                    !remotePlayer.playerId ||
                    remotePlayer.playerId === socket.id
                ) {
                    return;
                }

                remotePlayers.current[remotePlayer.playerId] = {
                    playerId: remotePlayer.playerId,
                    x: remotePlayer.x,
                    y: remotePlayer.y,
                    radius: 20,
                    name: remotePlayer.name || remotePlayer.playerId,
                };
            });

            console.log("Existing players:", players);
        };

        socket.on("players:list", handlePlayersList);

        return () => {
            socket.off("players:list", handlePlayersList);
        };
    }, []);

    // Add players who join after us.
    useEffect(() => {
        const handlePlayerJoin = (remotePlayer) => {
            if (
                !remotePlayer.playerId ||
                remotePlayer.playerId === socket.id
            ) {
                return;
            }

            remotePlayers.current[remotePlayer.playerId] = {
                playerId: remotePlayer.playerId,
                x: remotePlayer.x,
                y: remotePlayer.y,
                radius: 20,
                name: remotePlayer.name || remotePlayer.playerId,
            };

            console.log("Player joined:", remotePlayer);
        };

        socket.on("player:join", handlePlayerJoin);

        return () => {
            socket.off("player:join", handlePlayerJoin);
        };
    }, []);

    // Update remote player positions.
    // Backend event name is player:moved.
    useEffect(() => {
        const handlePlayerMove = (data) => {
            if (!data.playerId || data.playerId === socket.id) {
                return;
            }

            if (!remotePlayers.current[data.playerId]) {
                remotePlayers.current[data.playerId] = {
                    playerId: data.playerId,
                    x: data.x,
                    y: data.y,
                    radius: 20,
                    name: data.name || data.playerId,
                };
            } else {
                const remotePlayer =
                    remotePlayers.current[data.playerId];

                remotePlayer.x = data.x;
                remotePlayer.y = data.y;

                if (data.name) {
                    remotePlayer.name = data.name;
                }
            }
        };

        socket.on("player:moved", handlePlayerMove);

        return () => {
            socket.off("player:moved", handlePlayerMove);
        };
    }, []);

    // Remove players who disconnect.
    useEffect(() => {
        const handlePlayerLeave = (data) => {
            const remoteId = data.playerId;

            if (!remoteId) return;

            delete remotePlayers.current[remoteId];
            connectingPeers.current.delete(remoteId);

            // Close the WebRTC connection if the module exports closePeer.
            // Add its import and call it here if available in your module.
        };

        socket.on("player:leave", handlePlayerLeave);

        return () => {
            socket.off("player:leave", handlePlayerLeave);
        };
    }, []);

    // Office background and furniture.
    const drawOffice = (ctx, width, height) => {
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, width - 40, height - 40);

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;

        for (let x = 20; x <= width - 20; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
        }

        for (let y = 20; y <= height - 20; y += 40) {
            ctx.beginPath();
            ctx.moveTo(20, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
        }

        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(100, 100, 160, 70);
        ctx.fillRect(700, 100, 180, 70);

        ctx.fillStyle = "#475569";
        ctx.font = "14px Arial";
        ctx.fillText("Meeting Table", 135, 140);
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

    // Draw an avatar and its name.
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
        ctx.fillRect(
            user.x - textWidth / 2 - 5,
            user.y - user.radius - 25,
            textWidth + 10,
            18
        );

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(name, user.x, user.y - user.radius - 12);
        ctx.textAlign = "left";
    };

    // Update local player position.
    const updatePlayer = (deltaTime) => {
        const p = player.current;

        let dx = 0;
        let dy = 0;

        if (keys.current.w || keys.current.arrowup) dy -= 1;
        if (keys.current.s || keys.current.arrowdown) dy += 1;
        if (keys.current.a || keys.current.arrowleft) dx -= 1;
        if (keys.current.d || keys.current.arrowright) dx += 1;

        if (dx === 0 && dy === 0) return false;

        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;

        p.x += dx * p.speed * deltaTime;
        p.y += dy * p.speed * deltaTime;

        p.x = Math.max(p.radius, Math.min(1000 - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(600 - p.radius, p.y));

        return true;
    };

    // Send player position to the backend.
    const sendPlayerPosition = (currentTime) => {
        if (currentTime - lastEmitTime.current < 50) return;

        lastEmitTime.current = currentTime;

        socket.emit("player:move", {
            userId: socket.id,
            x: player.current.x,
            y: player.current.y,
            name: player.current.name,
        });
    };

    // Main animation, proximity detection and audio volume updates.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        let animationFrameId;
        let previousTime = performance.now();

        const gameLoop = (currentTime) => {
            const deltaTime = Math.min(
                (currentTime - previousTime) / 1000,
                0.05
            );

            previousTime = currentTime;

            const moved = updatePlayer(deltaTime);

            if (moved && socket.connected) {
                sendPlayerPosition(currentTime);
            }

            const nearbyPlayers = getNearbyPlayers();

            // Start calls only after the user enables audio.
            // The lower socket ID initiates, avoiding simultaneous offers.
            if (audioReadyRef.current && socket.connected) {
                nearbyPlayers.forEach((remotePlayer) => {
                    const remoteId = remotePlayer.playerId;

                    if (
                        !remoteId ||
                        !socket.id ||
                        socket.id.localeCompare(remoteId) >= 0 ||
                        peerExists(remoteId) ||
                        connectingPeers.current.has(remoteId)
                    ) {
                        return;
                    }

                    connectingPeers.current.add(remoteId);

                    Promise.resolve()
                        .then(() => callPeer(remoteId, (userId, stream) => {
                            console.log("Received audio from:", userId);
                        }))
                        .catch((error) => {
                            console.error(
                                "WebRTC call failed:",
                                remoteId,
                                error
                            );
                        })
                        .finally(() => {
                            connectingPeers.current.delete(remoteId);
                        });
                });
            }

            // Attenuate sound according to distance.
            Object.values(remotePlayers.current).forEach((remotePlayer) => {
                const remoteId = remotePlayer.playerId;
                if (!remoteId) return;

                const distance = getDistance(player.current, remotePlayer);
                const volume = getAudioVolume(distance);

                if (peerExists(remoteId)) {
                    setRemoteVolume(remoteId, volume);
                }
            });

            // Draw the office and players once per frame.
            ctx.clearRect(0, 0, width, height);
            drawOffice(ctx, width, height);
            drawAvatar(ctx, player.current, true);

            Object.values(remotePlayers.current).forEach((remotePlayer) => {
                drawAvatar(ctx, remotePlayer, false);
            });

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Remove signaling listeners when this component unmounts.
    useEffect(() => {
        return () => {
            cleanupSignaling.current?.();
            cleanupSignaling.current = null;
        };
    }, []);

    return (
        <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>Proxy Speak Virtual Office</h2>

            <p>
                Use <strong>W A S D</strong> or
                <strong> Arrow Keys </strong> to move.
            </p>

            <button
                onClick={handleJoinAudio}
                disabled={audioReady}
            >
                {audioReady ? "Audio Enabled" : "Join Audio"}
            </button>

            {audioError && (
                <p style={{ color: "red" }}>{audioError}</p>
            )}

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
