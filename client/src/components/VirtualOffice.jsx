
import { useEffect, useRef } from "react";

const VirtualOffice = () => {
    const canvasRef = useRef(null);
    // Player position
        const player = useRef({
            x: 200,
            y: 150,
            radius: 30,
            speed: 180,            
            name: "suhail"
        });


    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Player position
        let playerX = 200;
        let playerY = 150;

        const drawPlayer = () => {
            // Clear previous drawing
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw player
            ctx.beginPath();
            ctx.fillStyle = "#2563eb"; // Blue color for the player        
            ctx.arc(
                playerX,
                playerY,
                30,
                0,
                Math.PI * 2
            );

            ctx.fill();
        };

        // Initial drawing
        drawPlayer();
       

        // Keyboard event
        const handleKeyDown = (event) => {

            if (event.key === "ArrowUp") {
                playerY -= 10;
            }

            if (event.key === "ArrowDown") {
                playerY += 10;
            }

            if (event.key === "ArrowLeft") {
                playerX -= 10;
            }

            if (event.key === "ArrowRight") {
                playerX += 10;
            }

            // Draw player again
            drawPlayer();
        };

        // const mouseMoveHandler = (event) => {
        //     const rect = canvas.getBoundingClientRect();
        //     const mouseX = event.clientX - rect.left;
        //     const mouseY = event.clientY - rect.top;  
        // }
        
        
        const handleKeyUp = (event) => {
            key.current[event.key.toLowerCase()] = false;
        }

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        // window.addEventListener("mousemove", mouseMoveHandler);

             
        // Cleanup
        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{
                border: "1px solid black"
            }}
        />
    );
};

export default VirtualOffice;



//VirtualOffice.jsx