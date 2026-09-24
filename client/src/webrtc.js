import socket from "./socket";
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNodes = {}; // userId -> GainNode

function setupAudioGraph(remoteUserId, stream) {
  const source = audioContext.createMediaStreamSource(stream);
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1; // start at full volume

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNodes[remoteUserId] = gainNode;
}

export function setRemoteVolume(remoteUserId, volume) {
  const gainNode = gainNodes[remoteUserId];
  if (gainNode) {
    // clamp 0..1 just in case
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

export function removeAudioGraph(remoteUserId) {
  delete gainNodes[remoteUserId];
}
const peerConnections = {}; // userId -> RTCPeerConnection
let localStream = null;

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export async function initLocalAudio() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return localStream;
}

function createPeerConnection(remoteUserId, onRemoteStream) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc:ice-candidate", {
        to: remoteUserId,
        candidate: event.candidate,
      });
    }
  };

  pc.ontrack = (event) => {
    const stream = event.streams[0];
    setupAudioGraph(remoteUserId, stream);
    onRemoteStream(remoteUserId, stream); // keep this if you still want an <audio> el for autoplay purposes
  };

  peerConnections[remoteUserId] = pc;
  return pc;
}

export async function callPeer(remoteUserId, onRemoteStream) {
  if (peerConnections[remoteUserId]) return; // already connected/connecting

  const pc = createPeerConnection(remoteUserId, onRemoteStream);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", { to: remoteUserId, offer });
}

export function setupSignalingListeners(onRemoteStream) {
  socket.on("webrtc:offer", async ({ from, offer }) => {
    const pc = peerConnections[from] || createPeerConnection(from, onRemoteStream);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc:answer", { to: from, answer });
  });

  socket.on("webrtc:answer", async ({ from, answer }) => {
    const pc = peerConnections[from];
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("webrtc:ice-candidate", async ({ from, candidate }) => {
    const pc = peerConnections[from];
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  });
}

export function closePeer(remoteUserId) {
  const pc = peerConnections[remoteUserId];
  if (pc) {
    pc.close();
    delete peerConnections[remoteUserId];
  }
}

export function closeAllPeers() {
  Object.keys(peerConnections).forEach(closePeer);
}