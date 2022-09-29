let socket = io.connect("http://localhost:4000");
let UserVideo = document.querySelector("#localVideo");
let partnerVideo = document.querySelector("#remoteVideo");
//let UserAudio = document.querySelector('#localAudio');
//let partnerAudio = document.querySelector('#remoteAudio');
let call_container = document.querySelector("#call_container");
let incoming_call = document.querySelector("#incoming_call");
let yourID;
let candidate_to_add;
let otherPerson;
let pc = new RTCPeerConnection({
  configuration: {
    offerToReceiveAudio: true,//
    offerToReceiveVideo: true,
  },
});
//let audioTrack, videoTrack, stream;

// setup pc for webRTC
// 피어들이 offer와 answer 받으면 icecandidate이벤트 실행
pc.onicecandidate = (e) => {
  if (e.candidate) {
    if (otherPerson == yourID) {
      console.log("shouldn't send any here");
    } else {
      socket.emit("candidate", { candidate: JSON.stringify(e.candidate) });
    }
  }
};

pc.oniceconnectionstatechange = (e) => {};

/*
try {
  const stream = openMediaDevices({'video':true, 'audio':true});
  console.log('Got MediaStream:', stream);
} catch(error) {
  console.error('Error accessing media devices.', error);
}*/
/*
const success = (stream) => {
  UserVideo.srcObject = stream;
  pc.addStream(stream);
};*/

const openMediaDevices = async (constraints) => { // 내장 마이크
  return await navigator.mediaDevices.getUserMedia(constraints);
}

let displayMediaOptions = { // 공유화면 옵션 설정
  video: {
    cursor: "always",
  },
  audio: false,
};

const success = (stream) => {
  UserVideo.srcObject = stream;
  pc.addStream(stream);

async function getScreenshareWithMic(){
  const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  const audio = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
  return new MediaStream([audio.getAudioTracks()[0], stream.getVideoTracks()[0]]);
}

getScreenshareWithMic()
.then(success)
  console.log("errors with the user media");
};

pc.ontrack = (e) => {
  partnerVideo.srcObject = e.streams[0];//new MediaStream([e.track]); //상대의 stream받아와서 video.srcObject로 넣어주면 실시간으로 영상 볼 수 있음
}; 
/*
navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
.then(async displayStream => {
    [videoTrack] = displayStream.getVideoTracks();
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    }).then((audioStream) => {
      [audioTrack] = audioStream.getAudioTracks();
      stream = new MediaStream([videoTrack, audioTrack]);
    })
    //displayStream.addTrack(audioTrack); // do stuff
    // or 
    //stream = new MediaStream([videoTrack, audioTrack]); // do stuff
})
.then(success)
.catch(console.error);*/
/*
const capture = async () => {
  const videoConstraints = { video: true };
  const audioConstraints = { audio: true };
  const screen = await navigator.mediaDevices.getUserMedia(videoConstraints);
  navigator.mediaDevices.getDisplayMedia(videoConstraints);

  // Display them on video elements
  UserVideo.srcObject = screen;
  pc.addStream(screen);
  // Both getDisplayMedia and getUserMedia
  // can capture sound however, I found
  // it's easier to reason with if the audio is
  // captured and stored separately
  const audio = await navigator.mediaDevices.getDisplayMedia(audioConstraints);

  // return the 3 streams that we will later need to
  // combine with a MediaRecorder
  stream = new MediaStream([screen, audio]);
}

success;*/
/*
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: false
  })
  .then(success)
  //.then(pc.addTrack(track, e.streams[0]))
  .catch(() => {
    console.log("errors with the user media");
  });
 
  let displayMediaOptions = { // 공유화면 옵션 설정
    video: {
      cursor: "always",
    },
    audio: false,
  };

navigator.mediaDevices // 화면 공유
  .getDisplayMedia(displayMediaOptions)
  .then(success)
  .catch(() => {
    console.log("errors with the display media");
  });*/

/*
async function startRecording() {
  videoStream = await navigator.mediaDevices.getDisplayMedia({
    video: {MediaSource: "screen"},
  });

  audioStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });

  var audioTrack = audioStream.getAudioTracks()[0];

  videoStream.addTrack(audioTrack);

  recorder = new MediaRecorder(videoStream);

  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = (e) => {
    const completeBlob = new Blob(chunks, { type: "video/mp4" });
    videoFile = new File([completeBlob], "recording.mp4");
    console.log(videoFile);

    console.log(completeBlob);
    vimeoCall(videoFile);
  };

  recorder.start();
}
*/

/*
async function openCall(pc) {
  const gumStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true
  });
  for (const track of gumStream.getTracks()) {
    pc.addTrack(track, gumStream);
  }
}

/*let inboundStream = null;

pc.ontrack = (ev) => {
  if (ev.streams && ev.streams[0]) {
    videoElem.srcObject = ev.streams[0];
  } else {
    if (!inboundStream) {
      inboundStream = new MediaStream();
      videoElem.srcObject = inboundStream;
    }
    inboundStream.addTrack(ev.track);
  }
};*/

// call a user
function createOffer(person_to_call) {
  pc.createOffer({
    mandatory: {
      offerToReceiveAudio: true,//
      offerToReceiveVideo: true,
    },
  }).then(
    (sdp) => {
      socket.emit("callUser", {
        sdp: JSON.stringify(sdp),
        userToCall: person_to_call,
        from: yourID,
      });

      pc.setLocalDescription(sdp);
    },
    (e) => {}
  );
}

// new RTC description
function setRemoteDescription(sdp) {
  const desc = JSON.parse(sdp);

  pc.setRemoteDescription(new RTCSessionDescription(desc));
}

//accept call
function createAnswer(guy_I_accepted_call_from) {
  pc.createAnswer({
    mandatory: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    },
  }).then(
    (sdp) => {
      socket.emit("acceptedCall", {
        sdp: JSON.stringify(sdp),
        guy_I_accepted_call_from: guy_I_accepted_call_from,
      });

      pc.setLocalDescription(sdp);
    },
    (e) => {}
  );
}

function call_user(person_to_call) {
  createOffer(person_to_call);
}

socket.on("yourID", (id) => {
  yourID = id;
});

// when call -> do for everyone else
socket.on("allUsers", (users) => {
  call_container.innerHTML = "";
  let all_users = Object.keys(users);

  all_users.forEach((user_id) => {
    call_container.innerHTML += `
    <button class="call_button" data-person_to_call=${user_id}>Call</button>
    `;
  });
  let call_buttons = document.querySelectorAll(".call_button");
  call_buttons.forEach((call_button) => {
    call_button.addEventListener("click", (e) => {
      call_user(call_button.dataset.person_to_call);
    });
  });
});

// when accept call
function acceptCall(sdp, guy_I_accepted_call_from) {
  setRemoteDescription(sdp);
  createAnswer(guy_I_accepted_call_from);
  const candidate = JSON.parse(candidate_to_add);
  pc.addIceCandidate(new RTCIceCandidate(candidate));
}

//recv from other
socket.on("recv", (data) => {
  if (data.id == yourID) {
    otherPerson = data.id;
  } else {
    otherPerson = data.id;
    candidate_to_add = data.candidate;
  }
});

// call from other
socket.on("hey", (data) => {
  incoming_call.innerHTML = `
    <h1>Someone is calling you</h1>
    <div>
      <button id="answer">Answer</button>
      <button id="decline">Decline</button>
    </div>
  `;

  let answer = document.querySelector("#answer");
  let decline = document.querySelector("#decline");

  answer.addEventListener("click", (e) => {
    acceptCall(data.sdp, data.from);
  });
  decline.addEventListener("click", (e) => {
    console.log("Declined call");
  });
});

socket.on("callAccepted", (data) => {
  pc.setRemoteDescription(JSON.parse(data.sdp));
});

function addCandidate() {
  const candidate = JSON.parse(candidate_to_add);

  pc.addIceCandidate(new RTCIceCandidate(candidate));
}