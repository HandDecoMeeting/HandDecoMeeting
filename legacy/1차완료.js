let socket; // = io.connect("http://localhost:4000");
let peers = {}
let optionsRTC = {
    configuration: {
        offerToReceiveAudio: false,
        offerToReceiveVideo: true,
    }
}
let userVideo = document.querySelector("#localVideo");
let localStream = null;


////////////// SETUP //////////////
let displayMediaOptions = {
    video: {
        cursor: "always",
    },
    audio: false,
};

const success = (stream) => {
   
};

// async function getScreenshareWithMic(){
//     const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
//     const audio = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
//     return new MediaStream([audio.getAudioTracks()[0], stream.getVideoTracks()[0]]);
//   }

// getScreenshareWithMic()
// .then(success => {
//     UserVideo.srcObject = success;
//     localStream = stream;

//     init();
// })
// .catch(() => {
//   console.log("errors with the media device");
// })

navigator.mediaDevices
  .getDisplayMedia(displayMediaOptions) // 화면 공유 옵션
    .then ( stream => {
        userVideo.srcObject = stream;
        localStream = stream;
      
        init();
    })
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

    socket.on('getInfo', socket_id => {
        let info = document.getElementById("myInfo");
        info.innerHTML += ' '+socket_id;
    })

    // initReceieve
    socket.on('newUserArr', socket_id => {
        console.log(socket_id + " = new!");
        addPeer(socket_id, false);
        socket.emit('sayHiToNewbie', socket_id);
        //initsenddddd
    })

    // on initsend
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

/**
 * Creates a new peer connection and sets the event listeners
 * @param {String} id 
 *                 ID of the peer
 * @param {Boolean} isInit
 *                  Set to true if the peer initiates the connection process.
 *                  Set to false if the peer receives the connection. 
 */
function addPeer(id, isInit) {
    peers[id] = new SimplePeer({
        initiator: isInit,
        stream: localStream,
        config: configRTC
    });
    
    peers[id].on('signal', data => {
        socket.emit('signala', {
            signal: data,
            socket_id: id
        })
    });

    peers[id].on('stream', stream => {
        let videoContainer = document.querySelector("#video_container")
        let newVideo = document.createElement('video');
        newVideo.srcObject = stream;
        newVideo.id = id;
        newVideo.autoplay = true
        videoContainer.appendChild(newVideo);
    });

}