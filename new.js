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
let localID = null;

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
        localID = socket_id;

        var now = new Date(); 
        var s = now.toLocaleString('en-us',{month:'long', day: 'numeric', hour:
        '2-digit', minute: '2-digit', second: "2-digit"}); 

        let info = document.getElementById("info");
        info.innerHTML += `접속일시: ${s}<br />이름: ${localName}`;
        socket.emit('setName', {
            new_id: socket_id,
            name: localName
        });
    })

    // initReceieve
    socket.on('newUserArr', data => {
        console.log(data.newbieID + " = new!");
        // console.log(socket_id + " = new!");
        addPeer(data.newbieID, false, data.newbieName);
        // addPeer(socket_id, false);
        // peers[data.socket_id].push(data.name); // 이름 추가 -> addPeer에서!
        
        // console.log(data.name, " newbie name ", data.socket_id)
        socket.emit('sayHiToNewbie', {
            // new_id: data.socket_id,
            new_id: data.newbieID,
            name: localName
        });
        //initsenddddd
    })

    // on initsend
    socket.on('newbieSaysThx', data => {
        console.log("newbie thanks ", data.socket_id, data.addName);
        addPeer(data.socket_id, true, data.addName);
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
function addPeer(id, isInit, name) {
    peers[id] = [new SimplePeer({
        initiator: isInit,
        stream: localStream,
        config: configRTC
    })];

    peers[id].push(name);

    peers[id][0].on('signal', data => {
        socket.emit('signala', {
            signal: data,
            socket_id: id
        })
    });

    peers[id][0].on('stream', stream => {
        let newCol = document.createElement('div');
        newCol.setAttribute('class', 'col videoCol');
        newCol.innerHTML = `<h3>${name}'s Screen</h3>`;

        let newVideo = document.createElement('video');
        newVideo.style.width = 700;
        newVideo.style.height = 450;
        newVideo.srcObject = stream;
        newVideo.id = id;
        newVideo.dataset.name = peers[id][1];
        newVideo.autoplay = true;
        newCol.appendChild(newVideo);

        let videoContainer = document.querySelector("#video_container")
        videoContainer.appendChild(newCol);
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

function muteSound() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
        muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
    }
}