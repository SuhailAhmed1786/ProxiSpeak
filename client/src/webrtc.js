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

  if (!gainNode) {
    return;
  }

  const safeVolume = Math.max(0, Math.min(1, volume));

  gainNode.gain.setTargetAtTime(
    safeVolume,
    audioContext.currentTime,
    0.05
  );
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
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const tracks = localStream.getAudioTracks();

  console.log("LOCAL MICROPHONE:", tracks.map((track) => ({
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    label: track.label,
  })));

  return localStream;
}

function createPeerConnection(remoteUserId, onRemoteStream) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onsignalingstatechange = () => {
    console.log(`[${remoteUserId}] signaling state:`, pc.signalingState);
  };
  pc.oniceconnectionstatechange = () => {
  console.log(
    `[${remoteUserId}] ICE connection state:`,
    pc.iceConnectionState
  );
};
  pc.onconnectionstatechange = () => {
    console.log(`[${remoteUserId}] connection state:`, pc.connectionState);
  };

 localStream.getTracks().forEach((track) => {
  pc.addTrack(track, localStream);
});

console.log(
  "OUTGOING AUDIO SENDERS:",
  pc.getSenders().map((sender) => ({
    kind: sender.track?.kind,
    enabled: sender.track?.enabled,
    muted: sender.track?.muted,
    readyState: sender.track?.readyState,
  }))
);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc:ice-candidate", { to: remoteUserId, candidate: event.candidate });
    }
  };

 
pc.ontrack = (event) => {
  const stream = event.streams[0];
  const track = event.track;

  console.log("Remote track received:", track.kind);
  console.log("Track enabled:", track.enabled);
  console.log("Track muted:", track.muted);
  console.log("Track state:", track.readyState);
  track.onunmute = () => {
    console.log("REMOTE AUDIO IS ACTIVE");
  };

  track.onmute = () => {
    console.warn("REMOTE AUDIO BECAME MUTED");
  };

  setupAudioGraph(remoteUserId, stream);
  onRemoteStream(remoteUserId, stream);
};

  peerConnections[remoteUserId] = pc;
  return pc;
}

export async function callPeer(remoteUserId, onRemoteStream) {
  console.log("CREATING OFFER FOR:", remoteUserId);
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
  console.log("ANSWER RECEIVED FROM:", from);

  const pc = peerConnections[from];

  if (!pc) {
    console.error("No peer connection found for:", from);
    return;
  }

  console.log("State before answer:", pc.signalingState);

  try {
    await pc.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log("Answer applied. State:", pc.signalingState);
  } catch (error) {
    console.error("Failed to apply answer:", error);
  }
};

const handleIceCandidate = async ({ from, candidate }) => {
  const pc = peerConnections[from];

  if (!pc || !pc.remoteDescription) {
    if (!pendingIceCandidates[from]) {
      pendingIceCandidates[from] = [];
    }

    pendingIceCandidates[from].push(candidate);
    console.log("Queued ICE candidate from:", from);
    return;
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
    console.log("ICE candidate added from:", from);
  } catch (error) {
    console.error("Error adding ICE candidate:", error);
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