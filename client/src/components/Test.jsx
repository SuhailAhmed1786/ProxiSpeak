
// import { useEffect, useRef } from "react";

// const VirtualOffice = () => {
//     const canvasRef = useRef(null);

//     // Player position
//     const player = useRef({
//         x: 200,
//         y: 200,
//         radius: 20,
//         speed: 180,
//         name: "Suhail",
//     });

//     // Second dummy user
//     const dummyPlayer = useRef({
//         x: 650,
//         y: 350,
//         radius: 20,
//         name: "Ali",
//     });

//     // Keyboard state
//     const keys = useRef({});

//     useEffect(() => {
//         const canvas = canvasRef.current;
//         const ctx = canvas.getContext("2d");

//         const width = 1000;
//         const height = 600;

//         canvas.width = width;
//         canvas.height = height;

//         // ---------------------------------------
//         // Keyboard Events
//         // ---------------------------------------

//         const handleKeyDown = (event) => {
//             keys.current[event.key.toLowerCase()] = true;

//             // Prevent page scrolling with arrow keys
//             if (
//                 ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
//                     event.key.toLowerCase()
//                 )
//             ) {
//                 event.preventDefault();
//             }
//         };

//         const handleKeyUp = (event) => {
//             keys.current[event.key.toLowerCase()] = false;
//         };

//         window.addEventListener("keydown", handleKeyDown);
//         window.addEventListener("keyup", handleKeyUp);

//         // ---------------------------------------
//         // Draw Background
//         // ---------------------------------------

//         const drawOffice = () => {
//             // Background
//             ctx.fillStyle = "#f1f5f9";
//             ctx.fillRect(0, 0, width, height);

//             // Office border
//             ctx.strokeStyle = "#334155";
//             ctx.lineWidth = 4;

//             ctx.strokeRect(
//                 20,
//                 20,
//                 width - 40,
//                 height - 40
//             );

//             // Grid
//             ctx.strokeStyle = "#e2e8f0";
//             ctx.lineWidth = 1;

//             const gridSize = 40;

//             for (let x = 20; x <= width - 20; x += gridSize) {
//                 ctx.beginPath();
//                 ctx.moveTo(x, 20);
//                 ctx.lineTo(x, height - 20);
//                 ctx.stroke();
//             }

//             for (let y = 20; y <= height - 20; y += gridSize) {
//                 ctx.beginPath();
//                 ctx.moveTo(20, y);
//                 ctx.lineTo(width - 20, y);
//                 ctx.stroke();
//             }

//             // ---------------------------------------
//             // Office Furniture
//             // ---------------------------------------

//             // Table 1
//             ctx.fillStyle = "#cbd5e1";
//             ctx.fillRect(100, 100, 160, 70);

//             ctx.fillStyle = "#475569";
//             ctx.font = "14px Arial";
//             ctx.fillText("Meeting Table", 135, 140);

//             // Table 2
//             ctx.fillStyle = "#cbd5e1";
//             ctx.fillRect(700, 100, 180, 70);

//             ctx.fillStyle = "#475569";
//             ctx.fillText("Work Table", 760, 140);

//             // Meeting room
//             ctx.strokeStyle = "#64748b";
//             ctx.lineWidth = 2;

//             ctx.strokeRect(100, 400, 250, 120);

//             ctx.fillStyle = "#475569";
//             ctx.font = "16px Arial";
//             ctx.fillText("Meeting Room", 165, 465);

//             // Small desk
//             ctx.fillStyle = "#94a3b8";
//             ctx.fillRect(500, 450, 150, 50);

//             ctx.fillStyle = "#334155";
//             ctx.font = "14px Arial";
//             ctx.fillText("Desk", 555, 480);
//         };

//         // ---------------------------------------
//         // Draw Avatar
//         // ---------------------------------------

//         const drawAvatar = (user, isCurrentUser = false) => {
//             // Avatar circle
//             ctx.beginPath();

//             ctx.arc(
//                 user.x,
//                 user.y,
//                 user.radius,
//                 0,
//                 Math.PI * 2
//             );

//             ctx.fillStyle = isCurrentUser
//                 ? "#2563eb"
//                 : "#ef4444";

//             ctx.fill();

//             // Avatar border
//             ctx.strokeStyle = "#ffffff";
//             ctx.lineWidth = 3;
//             ctx.stroke();

//             // Name background
//             ctx.font = "14px Arial";

//             const textWidth = ctx.measureText(user.name).width;

//             ctx.fillStyle = "rgba(255,255,255,0.9)";

//             ctx.fillRect(
//                 user.x - textWidth / 2 - 6,
//                 user.y + user.radius + 5,
//                 textWidth + 12,
//                 22
//             );

//             // Name
//             ctx.fillStyle = "#0f172a";

//             ctx.fillText(
//                 user.name,
//                 user.x - textWidth / 2,
//                 user.y + user.radius + 20
//             );
//         };

//         // ---------------------------------------
//         // Update Player Movement
//         // ---------------------------------------

//         const updatePlayer = (deltaTime) => {
//             const p = player.current;

//             let directionX = 0;
//             let directionY = 0;

//             // WASD
//             if (keys.current["w"]) {
//                 directionY -= 1;
//             }

//             if (keys.current["s"]) {
//                 directionY += 1;
//             }

//             if (keys.current["a"]) {
//                 directionX -= 1;
//             }

//             if (keys.current["d"]) {
//                 directionX += 1;
//             }

//             // Arrow keys
//             if (keys.current["arrowup"]) {
//                 directionY -= 1;
//             }

//             if (keys.current["arrowdown"]) {
//                 directionY += 1;
//             }

//             if (keys.current["arrowleft"]) {
//                 directionX -= 1;
//             }

//             if (keys.current["arrowright"]) {
//                 directionX += 1;
//             }

//             // Normalize diagonal movement
//             if (directionX !== 0 || directionY !== 0) {
//                 const length = Math.sqrt(
//                     directionX * directionX +
//                     directionY * directionY
//                 );

//                 directionX /= length;
//                 directionY /= length;
//             }

//             // Update position
//             p.x += directionX * p.speed * deltaTime;
//             p.y += directionY * p.speed * deltaTime;

//             // ---------------------------------------
//             // Boundary Collision
//             // ---------------------------------------

//             const minX = 20 + p.radius;
//             const maxX = width - 20 - p.radius;

//             const minY = 20 + p.radius;
//             const maxY = height - 20 - p.radius;

//             p.x = Math.max(
//                 minX,
//                 Math.min(maxX, p.x)
//             );

//             p.y = Math.max(
//                 minY,
//                 Math.min(maxY, p.y)
//             );
//         };

//         // ---------------------------------------
//         // Animation Loop
//         // ---------------------------------------

//         let animationFrameId;
//         let previousTime = performance.now();

//         const gameLoop = (currentTime) => {
//             const deltaTime =
//                 (currentTime - previousTime) / 1000;

//             previousTime = currentTime;

//             // Update player
//             updatePlayer(deltaTime);

//             // Clear Canvas
//             ctx.clearRect(
//                 0,
//                 0,
//                 width,
//                 height
//             );

//             // Draw everything
//             drawOffice();

//             drawAvatar(
//                 player.current,
//                 true
//             );

//             drawAvatar(
//                 dummyPlayer.current,
//                 false
//             );

//             animationFrameId =
//                 requestAnimationFrame(gameLoop);
//         };

//         animationFrameId =
//             requestAnimationFrame(gameLoop);

//         // ---------------------------------------
//         // Cleanup
//         // ---------------------------------------

//         return () => {
//             window.removeEventListener(
//                 "keydown",
//                 handleKeyDown
//             );

//             window.removeEventListener(
//                 "keyup",
//                 handleKeyUp
//             );

//             cancelAnimationFrame(
//                 animationFrameId
//             );
//         };
//     }, []);

//     return (
//         <div
//             style={{
//                 width: "100%",
//                 overflowX: "auto",
//             }}
//         >
//             <canvas
//                 ref={canvasRef}
//                 style={{
//                     display: "block",
//                     border: "1px solid #cbd5e1",
//                     borderRadius: "12px",
//                     maxWidth: "100%",
//                     backgroundColor: "#f1f5f9",
//                 }}
//             />

//             <div
//                 style={{
//                     marginTop: "15px",
//                     padding: "12px 16px",
//                     backgroundColor: "#f8fafc",
//                     borderRadius: "8px",
//                     border: "1px solid #e2e8f0",
//                     fontFamily: "Arial",
//                     color: "#334155",
//                 }}
//             >
//                 <strong>Controls:</strong>{" "}
//                 Use <b>W A S D</b> or{" "}
//                 <b>Arrow Keys</b> to move your avatar.
//             </div>
//         </div>
//     );
// };

// export default VirtualOffice;
