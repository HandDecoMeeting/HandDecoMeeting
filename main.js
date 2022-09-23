let socket = io.connect("http://localhost:4000");
let UserVideo = document.querySelector("#localVideo");
let partnerVideo = document.querySelector("#remoteVideo");
let call_container = document.querySelector("#call_container");
let incoming_call = document.querySelector("#incoming_call");
let myInfo = document.querySelector("#myInfo");
let yourID;
let candidate_to_add;
let otherPerson;
let pc = new RTCPeerConnection({
  configuration: {
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  },
});

// setup pc for webRTC
pc.onicecandidate = (e) => {
  console.log("이 작업은 언제 되는걸까?")
  // call을 누르니까 되네?
  // callee는 answer 누르니까 뜬다
  // 찾아보니까 이 onIceCandidate는
  // setLocalDescription 할때 일어난대

  console.log(e);
  if (e.candidate) {
    console.log("otherPerson ", otherPerson);
    if (otherPerson == yourID) {
      console.log("shouldn't send any here");
    } else {
      socket.emit("candidate", { candidate: JSON.stringify(e.candidate) });
    }
  }
};

pc.oniceconnectionstatechange = (e) => {};

pc.ontrack = (e) => {
  partnerVideo.srcObject = e.streams[0];
};

const success = (stream) => {
  UserVideo.srcObject = stream;
  pc.addStream(stream);
};

let displayMediaOptions = {
  video: {
    cursor: "always",
  },
  audio: true,
};

navigator.mediaDevices
  .getDisplayMedia(displayMediaOptions) // 화면 공유 옵션
  .then(success)
  .catch(() => {
    console.log("errors with the media device");
  });

// call a user
function call_user(person_to_call) {
  pc.createOffer({ // callee에게 전달할 sdp 생성
    // session description protocol로 미디어 정보를 교환
    mandatory: {
      offerToReceiveAudio: false,
      offerToReceiveVideo: true,
    },
  }).then(
    (sdp) => {
      socket.emit("callUser", {
        sdp: JSON.stringify(sdp),
        userToCall: person_to_call,
        from: yourID,
      });

      pc.setLocalDescription(sdp); // 로컬 sdp로 설정
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
      offerToReceiveAudio: false,
      offerToReceiveVideo: true,
    },
  }).then(
    (sdp) => {
      socket.emit("acceptedCall", {
        sdp: JSON.stringify(sdp),
        guy_I_accepted_call_from: guy_I_accepted_call_from,
      });

      pc.setLocalDescription(sdp);
      // callee도 자기 sdp local에 설정
    },
    (e) => {}
  );
}

// function call_user(person_to_call) {
//   createOffer(person_to_call);
// }

socket.on("yourID", (id) => {
  yourID = id;
  myInfo.innerHTML=`${id}`
});

// when call -> do for everyone else
socket.on("allUsers", (users) => {
  call_container.innerHTML = "";
  let all_users = Object.keys(users);

  all_users.forEach((user_id) => {
    if (user_id == yourID) {
      // nothing
    }
    else {
      call_container.innerHTML += `
      <button class="call_button" data-person_to_call=${user_id}>Call ${user_id}</button>
      `;
    }
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
  // callee는 이 정보를 remote로 설정
  createAnswer(guy_I_accepted_call_from);
  // 이 candidate는 어디서 튀어나온건지
  const candidate = JSON.parse(candidate_to_add);
  pc.addIceCandidate(new RTCIceCandidate(candidate));
}

//recv from other
socket.on("recv", (data) => {
  console.log("이 recv는 언제 실행되는겨")
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
    <p>someone is ${data.from}</p>
    <div>
      <button id="answer">Answer</button>
      <button id="decline">Decline</button>
    </div>
  `;

  let answer = document.querySelector("#answer");
  let decline = document.querySelector("#decline");

  answer.addEventListener("click", (e) => {
    acceptCall(data.sdp, data.from);
    incoming_call.innerHTML = "";
  });
  decline.addEventListener("click", (e) => {
    console.log("Declined call");
    // decline 로직 없음
    // 일단 그냥 사라지는거로 표기
    incoming_call.innerHTML = "";
  });
});

socket.on("callAccepted", (data) => {
  // caller은 callee의 sdp를 자신의 remote로 설정
  pc.setRemoteDescription(JSON.parse(data.sdp));
});

function addCandidate() {
  const candidate = JSON.parse(candidate_to_add);

  pc.addIceCandidate(new RTCIceCandidate(candidate));
}
