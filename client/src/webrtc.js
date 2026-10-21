import socket from "./socket";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNodes = {};
const pannerNodes = {};
const audioSources = {};

function setupAudioGraph(remoteUserId, stream) {
  removeAudioGraph(remoteUserId);

  const source = audioContext.createMediaStreamSource(stream);
  const pannerNode = audioContext.createStereoPanner();
  const gainNode = audioContext.createGain();

  // TEMPORARY: use 1 to test remote audio
  gainNode.gain.value = 1;
  pannerNode.pan.value = 0;

  source.connect(pannerNode);
  pannerNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  audioSources[remoteUserId] = source;
  gainNodes[remoteUserId] = gainNode;
  pannerNodes[remoteUserId] = pannerNode;

  console.log("Remote audio graph created:", remoteUserId);
}

export function setRemoteVolume(remoteUserId, volume) {
  const gainNode = gainNodes[remoteUserId];
  if (gainNode) {
    // smooth ramp instead of an instant jump — avoids audible clicks/pops
    gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), audioContext.currentTime, 0.05);
  }
}

export function setRemotePan(remoteUserId, pan) {
  const pannerNode = pannerNodes[remoteUserId];
  if (pannerNode) {
    pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
  }
}

export function removeAudioGraph(remoteUserId) {
  try {
    audioSources[remoteUserId]?.disconnect();
    pannerNodes[remoteUserId]?.disconnect();
    gainNodes[remoteUserId]?.disconnect();
  } catch (error) {
    console.warn("Audio graph cleanup:", error);
  }

  delete audioSources[remoteUserId];
  delete gainNodes[remoteUserId];
  delete pannerNodes[remoteUserId];
}

const peerConnections = {};
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
  pc.oniceconnectionstatechange = () => {
    console.log(`[${remoteUserId}] ICE connection state:`, pc.iceConnectionState);
  };
  pc.onconnectionstatechange = () => {
    console.log(`[${remoteUserId}] connection state:`, pc.connectionState);
  };

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc:ice-candidate", { to: remoteUserId, candidate: event.candidate });
    }
  };

  pc.ontrack = async (event) => {
  console.log("REMOTE TRACK RECEIVED:", remoteUserId);
  console.log("Track kind:", event.track.kind);
  console.log("Track enabled:", event.track.enabled);
  console.log("Track muted:", event.track.muted);

  const stream = event.streams[0];

  if (!stream) {
    console.error("No remote stream received");
    return;
  }

  console.log("Remote audio tracks:", stream.getAudioTracks());

  setupAudioGraph(remoteUserId, stream);
  await resumeAudioContext();
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
  const pc = peerConnections[remoteUserId];
  if (!pc) return false;
  if (pc.connectionState === "closed" || pc.connectionState === "failed") {
    delete peerConnections[remoteUserId];
    removeAudioGraph(remoteUserId);
    return false;
  }
  return true;
}

export async function resumeAudioContext() {
  if (audioContext.state !== "running") {
    await audioContext.resume();
  }

  console.log("AudioContext state:", audioContext.state);
}