let socket = io.connect("http://localhost:4000");
let peers = {}
let optionsRTC = {
    configuration: {
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
    }
}
let userVideo = document.querySelector("#localVideo");
let videoContainer = document.querySelector("#video_container")
let localStream = null;


////////////// SETUP //////////////
let displayMediaOptions = {
    video: {
        cursor: "always",
    },
    audio: true,
};

const success = (stream) => {
    userVideo.srcObject = stream;
    localStream = stream;
  
    init();
};

navigator.mediaDevices
  .getDisplayMedia(displayMediaOptions) // 화면 공유 옵션
  .then(success)
  .catch(() => {
    console.log("errors with the media device");
});


////////////// CONFIG //////////////
const configRTC = {
    iceServers: [
        // (구축되어있는) STUN server로 구현
        // https://www.metered.ca/tools/openrelay/
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
}

////////////// INIT //////////////
function init() {
    socket = io()

    socket.on('newUserArr', socket_id => {
        console.log(socket_id + " = new!");
        addPeer(socket_id, false);

        socket.emit('sayHiToNewbie', socket_id);
    })

    socket.on('newbieSaysThx', socket_id => {
        console.log("newbie thanks ", socket_id);
        addPeer(socket_id, true);
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal);
    })

    socket.on('disconnect', () => {
        console.log('disconnected')
    });
}

function addPeer(id, isInit) {
    peers[id] = new SimplePeer({
        initiator: isInit,
        stream: localStream,
        config: configRTC
    });

    peers[id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: id
        })
    });

    peers[id].on('stream', stream => {
        let newVideo = document.createElement('video');
        newVideo.srcObject = stream;
        newVideo.id = id;
        videoContainer.appendChild(newVideo);
    });
}