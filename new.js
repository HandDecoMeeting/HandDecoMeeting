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
let localName = null;

////////////// SETUP //////////////
let displayMediaOptions = {
    video: {
        cursor: "always",
    },
    audio: false,
};

var constraints = {
    audio: {echoCancellation: false},
    video: false
}


async function getScreenshareWithMic(){
    const screen = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    const audio = await navigator.mediaDevices.getUserMedia(constraints);
    userVideo.srcObject = screen;
    return new MediaStream([audio.getAudioTracks()[0], screen.getVideoTracks()[0]]);
}

setProfile()
.then(
    getScreenshareWithMic()
    .then(stream => {
        localStream = stream;
    
        init();
    })
    .catch((e) => {
        console.log(e);
      console.log("errors with the media device");
    })
)
.catch((e) => {
    console.log(e);
    console.log("errors with prompt");
}
)

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
        info.innerHTML += '<br /> name: ' + localName;
        socket.emit('setName', {
            new_id: socket_id,
            name: localName
        });
    })

    // initReceieve
    socket.on('newUserArr', socket_id => {
        console.log(socket_id + " = new!");
        addPeer(socket_id, false);
        socket.emit('sayHiToNewbie', {
            new_id: socket_id,
            name: localName
        });
        //initsenddddd
    })

    // on initsend
    socket.on('newbieSaysThx', socket_id => {
        console.log("newbie thanks ", socket_id);
        addPeer(socket_id, true);
    })

    socket.on('signal', data => {
        peers[data.socket_id][0].signal(data.signal);
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
    peers[id] = [new SimplePeer({
        initiator: isInit,
        stream: localStream,
        config: configRTC
    })];

    peers[id][0].on('signal', data => {
        socket.emit('signala', {
            signal: data,
            socket_id: id
        })
    });

    peers[id][0].on('stream', stream => {
        let videoContainer = document.querySelector("#video_container")
        let newVideo = document.createElement('video');
        newVideo.style.width = 700;
        newVideo.style.height = 500;
        newVideo.srcObject = stream;
        newVideo.id = id;
        newVideo.autoplay = true
        videoContainer.appendChild(newVideo);
    });

}


/////// setprofile //////
async function setProfile(socketID)
{
    while(!localName)
    {
        localName = await prompt("이름을 입력하세요.", "익명");
    }
}