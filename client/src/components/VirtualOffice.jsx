import { useEffect, useRef } from "react";
import { socket } from "../socket"; // adjust path if socket.js lives elsewhere

const VirtualOffice = () => {
    const canvasRef = useRef(null);

    // Local player state
    const player = useRef({
        x: 200,
        y: 150,
        radius: 30,
        speed: 180,
        name: "suhail",
    });

    // Remote players: { userId: { x, y } }
    const remotePlayers = useRef({});

    // Track pressed keys properly
    const keys = useRef({});

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const width = canvas.width;
        const height = canvas.height;

        // ---------------------------------------
        // Draw everything
        // ---------------------------------------
        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Local player (blue)
            ctx.beginPath();
            ctx.fillStyle = "#2563eb";
            ctx.arc(player.current.x, player.current.y, player.current.radius, 0, Math.PI * 2);
            ctx.fill();

            // Remote players (red)
            Object.values(remotePlayers.current).forEach((p) => {
                ctx.beginPath();
                ctx.fillStyle = "#ef4444";
                ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        // ---------------------------------------
        // Keyboard handling (fixed)
        // ---------------------------------------
        const handleKeyDown = (event) => {
            keys.current[event.key.toLowerCase()] = true;
        };

        const handleKeyUp = (event) => {
            keys.current[event.key.toLowerCase()] = false; // was "key.current" — bug fixed
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // ---------------------------------------
        // Movement loop (frame-based, not per-keypress)
        // ---------------------------------------
        let animationFrameId;
        let previousTime = performance.now();

        const step = 5; // pixels per frame while a key is held

        const loop = (currentTime) => {
            const p = player.current;
            let moved = false;

            if (keys.current["arrowup"] || keys.current["w"]) {
                p.y -= step;
                moved = true;
            }
            if (keys.current["arrowdown"] || keys.current["s"]) {
                p.y += step;
                moved = true;
            }
            if (keys.current["arrowleft"] || keys.current["a"]) {
                p.x -= step;
                moved = true;
            }
            if (keys.current["arrowright"] || keys.current["d"]) {
                p.x += step;
                moved = true;
            }

            // Basic boundary clamp
            p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
            p.y = Math.max(p.radius, Math.min(height - p.radius, p.y));

            if (moved) {
                socket.emit("player:move", { x: p.x, y: p.y });
            }

            draw();
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        // ---------------------------------------
        // Socket events
        // ---------------------------------------
        socket.emit("player:join", {
            userId: socket.id, // fine for now; swap for a persistent id later if you add auth
            x: player.current.x,
            y: player.current.y,
        });

        socket.on("players:current", (players) => {
            players.forEach((p) => {
                if (p.userId !== socket.id) {
                    remotePlayers.current[p.userId] = { x: p.x, y: p.y };
                }
            });
        });

        socket.on("player:new", (p) => {
            if (p.userId !== socket.id) {
                remotePlayers.current[p.userId] = { x: p.x, y: p.y };
            }
        });

        socket.on("player:moved", ({ userId, x, y }) => {
            remotePlayers.current[userId] = { x, y };
        });

        socket.on("player:left", ({ userId }) => {
            delete remotePlayers.current[userId];
        });

        // ---------------------------------------
        // Cleanup
        // ---------------------------------------
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            cancelAnimationFrame(animationFrameId);

            socket.off("players:current");
            socket.off("player:new");
            socket.off("player:moved");
            socket.off("player:left");
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{ border: "1px solid black" }}
        />
    );
};

export default VirtualOffice;