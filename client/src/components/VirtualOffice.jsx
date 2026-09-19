import { useEffect, useRef } from "react";
import socket from "../socket";

const VirtualOffice = () => {
    const canvasRef = useRef(null);

    const player = useRef({
        x: 200,
        y: 150,
        radius: 30,
        speed: 180,
        name: "suhail",
    });

    const remotePlayers = useRef({});
    const keys = useRef({});

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            ctx.beginPath();
            ctx.fillStyle = "#2563eb";
            ctx.arc(player.current.x, player.current.y, player.current.radius, 0, Math.PI * 2);
            ctx.fill();

            Object.values(remotePlayers.current).forEach((p) => {
                ctx.beginPath();
                ctx.fillStyle = "#ef4444";
                ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        const handleKeyDown = (event) => {
            keys.current[event.key.toLowerCase()] = true;
        };
        const handleKeyUp = (event) => {
            keys.current[event.key.toLowerCase()] = false;
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        let animationFrameId;
        let lastTime = performance.now();
        const speed = player.current.speed;

        const loop = (currentTime) => {
            const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
            lastTime = currentTime;

            const p = player.current;
            let dirX = 0;
            let dirY = 0;

            if (keys.current["arrowup"] || keys.current["w"]) dirY -= 1;
            if (keys.current["arrowdown"] || keys.current["s"]) dirY += 1;
            if (keys.current["arrowleft"] || keys.current["a"]) dirX -= 1;
            if (keys.current["arrowright"] || keys.current["d"]) dirX += 1;

            if (dirX !== 0 || dirY !== 0) {
                const len = Math.hypot(dirX, dirY);
                dirX /= len;
                dirY /= len;
            }

            const moved = dirX !== 0 || dirY !== 0;
            p.x += dirX * speed * dt;
            p.y += dirY * speed * dt;

            p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
            p.y = Math.max(p.radius, Math.min(height - p.radius, p.y));

            if (moved && socket.connected) {
                socket.emit("player:move", { x: p.x, y: p.y });
            }

            draw();
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        // ---------------------------------------
        // Join only once the socket is actually connected,
        // and re-join automatically if we ever reconnect
        // (a reconnect gets a new socket.id, so we must re-register).
        // ---------------------------------------
        const joinWorld = () => {
            socket.emit("player:join", {
                userId: socket.id,
                x: player.current.x,
                y: player.current.y,
            });
        };

        if (socket.connected) {
            joinWorld();
        }
        socket.on("connect", joinWorld);

        socket.on("players:current", (players) => {
            remotePlayers.current = {};
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

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            cancelAnimationFrame(animationFrameId);
            socket.emit("player:leave");

            socket.off("connect", joinWorld);
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