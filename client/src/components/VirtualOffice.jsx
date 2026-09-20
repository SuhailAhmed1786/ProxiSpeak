import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const VirtualOffice = () => {

     const remotePlayers = useRef({});
   // Keyboard state
    const keys = useRef({});
    // Used to limit socket messages
    const lastEmitTime = useRef(0);

    const canvasRef = useRef(null);

      // Player position
    const player = useRef({
        x: 200,
        y: 200,
        radius: 20,
        speed: 180,
        name: "Suhail",
    });
 
   
    //socket connection
    // useEffect(() => {
    //     socket.on("connect", () => {
    //         console.log("Connected to server:", socket.id);
    //     });

    //     return () => {
    //         socket.off("connect");
    //     };
    // }, []);


    useEffect(() => {
    const handleConnect = () => {
        console.log("Connected:", socket.id);

        socket.emit("player:join", {
            playerId: socket.id,
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

     // --------------------------------------------------
    // GET EXISTING PLAYERS
    // --------------------------------------------------

    useEffect(() => {
    const handlePlayersList = (players) => {
        console.log("Existing players:", players);

        remotePlayers.current = {};

        players.forEach((remotePlayer) => {
            if (remotePlayer.playerId === socket.id) {
                return;
            }

            remotePlayers.current[remotePlayer.playerId] = {
                x: remotePlayer.x,
                y: remotePlayer.y,
                radius: 20,
                name: remotePlayer.name || remotePlayer.playerId,
            };
        });
    };

    socket.on("players:list", handlePlayersList);

    return () => {
        socket.off("players:list", handlePlayersList);
    };
}, []);

    // NEW PLAYER JOINED
    // --------------------------------------------------

    useEffect(() => {
        const handlePlayerJoin = (remotePlayer) => {
            console.log("Player joined:", remotePlayer);

            if (remotePlayer.playerId === socket.id) {
                return;
            }

            remotePlayers.current[remotePlayer.playerId] = {
                x: remotePlayer.x,
                y: remotePlayer.y,
                radius: 20,
                name: remotePlayer.name || remotePlayer.playerId,
            };
        };

        socket.on("player:join", handlePlayerJoin);

        return () => {
            socket.off("player:join", handlePlayerJoin);
        };
    }, []);

   
 // REMOTE PLAYER MOVEMENT

    useEffect(() => {
        const handlePlayerMove = (data) => {
            // Don't update ourselves
            if (data.playerId === socket.id) {
                return;
            }

            if (!remotePlayers.current[data.playerId]) {
                remotePlayers.current[data.playerId] = {
                    x: data.x,
                    y: data.y,
                    radius: 20,
                    name: data.name || data.playerId,
                };
            } else {
                remotePlayers.current[data.playerId].x = data.x;
                remotePlayers.current[data.playerId].y = data.y;
            }
        };

        socket.on("player:move", handlePlayerMove);

        return () => {
            socket.off("player:move", handlePlayerMove);
        };
    }, []);

     // --------------------------------------------------
    // REMOTE PLAYER LEFT
    // --------------------------------------------------

    useEffect(() => {
        const handlePlayerLeave = (data) => {
            console.log("Player left:", data.playerId);

            delete remotePlayers.current[data.playerId];
        };

        socket.on("player:leave", handlePlayerLeave);

        return () => {
            socket.off("player:leave", handlePlayerLeave);
        };
    }, []);

     const drawOffice = (ctx, width, height) => {
        // Background
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, width, height);

        // Office border
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 4;
        ctx.strokeRect(
            20,
            20,
            width - 40,
            height - 40
        );

        // Grid
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

        // ---------------------------------------
        // Office Furniture
        // ---------------------------------------

        // Table 1
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(100, 100, 160, 70);

        ctx.fillStyle = "#475569";
        ctx.font = "14px Arial";
        ctx.fillText("Meeting Table", 135, 140);

        // Table 2
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(700, 100, 180, 70);

        ctx.fillStyle = "#475569";
        ctx.fillText("Work Table", 760, 140);

        // Meeting room
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;

        ctx.strokeRect(100, 400, 250, 120);

        ctx.fillStyle = "#475569";
        ctx.font = "16px Arial";
        ctx.fillText("Meeting Room", 165, 465);

        // Small desk
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(500, 450, 150, 50);

        ctx.fillStyle = "#334155";
        ctx.font = "14px Arial";
        ctx.fillText("Desk", 555, 480);
    };

    // ---------------------------------------
    // Draw Avatar
    // ---------------------------------------

   const drawAvatar = (ctx, user, isCurrentUser = false) => {
        if (!user) return;

        // Player circle
        ctx.beginPath();
        ctx.arc(
            user.x,
            user.y,
            user.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = isCurrentUser
            ? "#2563eb"
            : "#ef4444";

        ctx.fill();

        // Border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Player name background
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

        // Player name
        ctx.fillStyle = "#ffffff";

        ctx.textAlign = "center";
        ctx.fillText(
            name,
            user.x,
            user.y - user.radius - 12
        );

        ctx.textAlign = "left";
    };

    // ---------------------------------------
    // Update Player Movement
    // ---------------------------------------

     const updatePlayer = (deltaTime) => {
        const p = player.current;

        let dx = 0;
        let dy = 0;

        // W / Arrow Up
        if (
            keys.current["w"] ||
            keys.current["arrowup"]
        ) {
            dy -= 1;
        }

        // S / Arrow Down
        if (
            keys.current["s"] ||
            keys.current["arrowdown"]
        ) {
            dy += 1;
        }

        // A / Arrow Left
        if (
            keys.current["a"] ||
            keys.current["arrowleft"]
        ) {
            dx -= 1;
        }

        // D / Arrow Right
        if (
            keys.current["d"] ||
            keys.current["arrowright"]
        ) {
            dx += 1;
        }

        // No movement
        if (dx === 0 && dy === 0) {
            return false;
        }

        // Normalize diagonal movement
        const length = Math.sqrt(
            dx * dx + dy * dy
        );

        dx /= length;
        dy /= length;

        // Update position
        p.x += dx * p.speed * deltaTime;
        p.y += dy * p.speed * deltaTime;

        // Canvas dimensions
        const width = 1000;
        const height = 600;

        // Boundary checking
        p.x = Math.max(
            p.radius,
            Math.min(width - p.radius, p.x)
        );

        p.y = Math.max(
            p.radius,
            Math.min(height - p.radius, p.y)
        );

        return true;
    };

    // SEND PLAYER POSITION
    // --------------------------------------------------

    const sendPlayerPosition = (currentTime) => {
        // Send maximum around 20 times per second
        if (currentTime - lastEmitTime.current < 50) {
            return;
        }

        lastEmitTime.current = currentTime;

        socket.emit("player:move", {
            x: player.current.x,
            y: player.current.y,
            name: player.current.name,
        });
    };


    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");

        const width = canvas.width;
        const height = canvas.height;

        let animationFrameId;
        let previousTime = performance.now();

        const gameLoop = (currentTime) => {
            const deltaTime =
                (currentTime - previousTime) / 1000;

            previousTime = currentTime;

            // Update local player
            const moved = updatePlayer(deltaTime);

            // Send movement if player moved
            if (moved) {
                sendPlayerPosition(currentTime);
            }

            // Clear canvas
            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            // Draw office
            drawOffice(
                ctx,
                width,
                height
            );

            // Draw local player
            drawAvatar(
                ctx,
                player.current,
                true
            );

            // Draw all remote players
            Object.values(
                remotePlayers.current
            ).forEach((remotePlayer) => {
                drawAvatar(
                    ctx,
                    remotePlayer,
                    false
                );
            });

            animationFrameId =
                requestAnimationFrame(gameLoop);
        };

        animationFrameId =
            requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(
                animationFrameId
            );
        };
    }, []);
   
    return (
        <div
            style={{
                padding: "20px",
                textAlign: "center",
            }}
        >
            <h2>Proxy Speak Virtual Office</h2>

            <p>
                Use <strong>W A S D</strong> or
                <strong> Arrow Keys </strong>
                to move.
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

            <div
                style={{
                    marginTop: "10px",
                }}
            >
                <span
                    style={{
                        marginRight: "20px",
                    }}
                >
                    🔵 You
                </span>

                <span>
                    🔴 Other Players
                </span>
            </div>
        </div>
    );
};

export default VirtualOffice;

