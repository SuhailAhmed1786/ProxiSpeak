import { useEffect, useRef, useState } from "react";

const VirtualOffice = () => {
    const canvasRef = useRef(null);

    const [avatar, setAvatar] = useState({
        x: 200,
        y: 150,
    });

    // Keyboard movement
    useEffect(() => {
        const handleKeyDown = (event) => {
            setAvatar((current) => {
                let x = current.x;
                let y = current.y;

                const speed = 5;
                const radius = 30;

                switch (event.key) {
                    case "w":
                    case "W":
                    case "ArrowUp":
                        y -= speed;
                        break;

                    case "s":
                    case "S":
                    case "ArrowDown":
                        y += speed;
                        break;

                    case "a":
                    case "A":
                    case "ArrowLeft":
                        x -= speed;
                        break;

                    case "d":
                    case "D":
                    case "ArrowRight":
                        x += speed;
                        break;

                    default:
                        return current;
                }

                // Boundary checking
                x = Math.max(
                    radius,
                    Math.min(600 - radius, x)
                );

                y = Math.max(
                    radius,
                    Math.min(400 - radius, y)
                );

                return {
                    x,
                    y,
                };
            });
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Draw avatar whenever position changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Clear canvas
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Background
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Draw avatar
        ctx.beginPath();

        ctx.fillStyle = "#1a58d4";

        ctx.arc(
            avatar.x,
            avatar.y,
            30,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Player name
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "suhail",
            avatar.x,
            avatar.y - 40
        );

    }, [avatar]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{
                border: "1px solid black",
            }}
        />
    );
};

export default VirtualOffice;