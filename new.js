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

////////////// CONFIG //////////////
const configRTC = {
    iceServers: [
        {
            urls: "turn:3.36.233.147:3478?transport=tcp",
            username: "guest",
            credential: "somepassword",
        }
    ],
}



////////////// INIT //////////////

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
      console.log("errors with the media device\n", e);
    })
).catch((e) => {
        console.log("errors with prompt\n", e);
    }
)


function init() {
    socket = io()

    socket.on('getInfo', data => {
        localID = data.socket_id;

        var now = new Date(); 
        var s = now.toLocaleString('en-us',{month:'long', day: 'numeric', hour:
        '2-digit', minute: '2-digit'}); 

        let info = document.getElementById("info");
        info.innerHTML += `접속 일시: ${s}<br />이름: ${localName}<br />`;

	let myinfo = document.getElementById("myInfo");
	myInfo.innerHTML = localName + "'s Screen";        

	let ppl = document.createElement('span');
        ppl.id = 'count';
        ppl.innerHTML = `참여 인원: ${data.count}명`;
        info.appendChild(ppl);

        socket.emit('setName', {
            new_id: data.socket_id,
            name: localName
        });
    })

    // initReceieve
    socket.on('newUserArr', data => {
        
        let ppl = document.getElementById('count');
        ppl.innerHTML = `참여 인원: ${data.count}명`;
        addPeer(data.newbieID, false, data.newbieName);
        
        socket.emit('sayHiToNewbie', {
            new_id: data.newbieID,
            name: localName
        });
    })

    // on initsend
    socket.on('newbieSaysThx', data => {
        addPeer(data.socket_id, true, data.addName);
    })

    socket.on('signal', data => {
        peers[data.socket_id][0].signal(data.signal);
    })

    socket.on('removePeer', data => {
        removePeer(data.socket_id)

        let ppl = document.getElementById('count');
        ppl.innerHTML = `참여 인원: ${data.count}명`;

    })
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

//////// mute /////////
function muteSound() {
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
        muteButton.innerHTML = localStream.getAudioTracks()[index].enabled ? '<i class="fa-solid fa-microphone fa-lg"></i>' : '<i class="fa-solid fa-microphone-slash fa-lg"></i>'
    }
}

////// delete disconnected //////
function removePeer(socket_id) {

    let videoEl = document.getElementById(socket_id)
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        let videoDiv = videoEl.parentNode
        videoDiv.parentNode.removeChild(videoDiv)
    }
    if (peers[socket_id][0]) peers[socket_id][0].destroy()
    delete peers[socket_id]
}
