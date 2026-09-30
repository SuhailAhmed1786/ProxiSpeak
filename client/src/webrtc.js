import socket from "./socket";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNodes = {};    // userId -> GainNode
const pannerNodes = {};  // userId -> StereoPannerNode

function setupAudioGraph(remoteUserId, stream) {
  const source = audioContext.createMediaStreamSource(stream);
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();

  gainNode.gain.value = 1;
  pannerNode.pan.value = 0;

  source.connect(pannerNode);
  pannerNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNodes[remoteUserId] = gainNode;
  pannerNodes[remoteUserId] = pannerNode;
}

export function setRemoteVolume(remoteUserId, volume) {
  const gainNode = gainNodes[remoteUserId];
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

export function setRemotePan(remoteUserId, pan) {
  const pannerNode = pannerNodes[remoteUserId];
  if (pannerNode) {
    pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
  }
}

export function removeAudioGraph(remoteUserId) {
  delete gainNodes[remoteUserId];
  delete pannerNodes[remoteUserId];
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

  pc.onsignalingstatechange = () => {
    console.log(`[${remoteUserId}] signaling state:`, pc.signalingState);
  };

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
    onRemoteStream(remoteUserId, stream);
  };

  peerConnections[remoteUserId] = pc;
  return pc;
}

export async function callPeer(remoteUserId, onRemoteStream) {
  if (peerConnections[remoteUserId]) return;

  const pc = createPeerConnection(remoteUserId, onRemoteStream);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("webrtc:offer", { to: remoteUserId, offer });
}

// ---------------------------------------
// REPLACED: now returns a cleanup function, and guards against
// out-of-order / duplicate offer-answer handling via signalingState checks.
// ---------------------------------------
export function setupSignalingListeners(onRemoteStream) {
  const handleOffer = async ({ from, offer }) => {
    const pc = peerConnections[from] || createPeerConnection(from, onRemoteStream);

    if (pc.signalingState !== "stable") {
      console.warn(`Ignoring offer from ${from}, signaling state is ${pc.signalingState}`);
      return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc:answer", { to: from, answer });
  };

  const handleAnswer = async ({ from, answer }) => {
    const pc = peerConnections[from];
    if (!pc) return;

    if (pc.signalingState !== "have-local-offer") {
      console.warn(`Ignoring answer from ${from}, signaling state is ${pc.signalingState}`);
      return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async ({ from, candidate }) => {
    const pc = peerConnections[from];
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  };

  socket.on("webrtc:offer", handleOffer);
  socket.on("webrtc:answer", handleAnswer);
  socket.on("webrtc:ice-candidate", handleIceCandidate);

  return () => {
    socket.off("webrtc:offer", handleOffer);
    socket.off("webrtc:answer", handleAnswer);
    socket.off("webrtc:ice-candidate", handleIceCandidate);
  };
}

export function closePeer(remoteUserId) {
  const pc = peerConnections[remoteUserId];
  if (pc) {
    pc.close();
    delete peerConnections[remoteUserId];
  }
  removeAudioGraph(remoteUserId);
}

export function closeAllPeers() {
  Object.keys(peerConnections).forEach(closePeer);
}

export function peerExists(remoteUserId) {
  return !!peerConnections[remoteUserId];
}