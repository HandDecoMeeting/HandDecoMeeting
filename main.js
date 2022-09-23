let socket = io.connect("http://localhost:4000");
let UserVideo = document.querySelector("#localVideo");
let partnerVideo = document.querySelector("#remoteVideo");
let call_container = document.querySelector("#call_container");
let incoming_call = document.querySelector("#incoming_call");
let yourID;
let myInfo = document.querySelector("#myInfo");
let candidate_to_add;
let otherPerson;
let pc = new RTCPeerConnection({ // n번째 연결마다 (n-1)개 연결 추가 필요
  configuration: {
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  },
});
let videoContainer = document.querySelector("#video_container")

// 처음 창 접속하고 화면공유
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

const success = (stream) => {
  UserVideo.srcObject = stream;
  pc.addStream(stream);
};

// 동시에 서버와 연결
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

      videoContainer.innerHTML += `
      <p>${user_id}</p>

      <video class="othervideos" data-video_of=${user_id}
      autoplay
      style="width: 700px; height: 500px; background: rgba(0, 0, 0, 0.5)"></video>
      `
    }
  });

  let call_buttons = document.querySelectorAll(".call_button");
  call_buttons.forEach((call_button) => {
    call_button.addEventListener("click", (e) => {
      call_user(call_button.dataset.person_to_call);
    });
  });
});

// 위에까지는 서버와 연결하는 작업
// 이제 버튼을 눌러 실제 call을 할때
// call a user
function call_user(person_to_call) {
  pc.createOffer({ // callee에게 전달할 sdp 생성
    // sdp: session description protocol로 미디어 정보를 교환
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

// call from other
// 누군가한테서 전화가 왔을 때
socket.on("hey", (data) => {
  incoming_call.innerHTML = `
    <h1>${data.from} is calling you</h1>
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

// when accept call
// 전화가 걸려온 것을 받았을 때
function acceptCall(sdp, guy_I_accepted_call_from) {
  pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
  // callee는 이 정보를 remote로 설정
  createAnswer(guy_I_accepted_call_from);
  // 이 candidate는 어디서 튀어나온건지
  const candidate = JSON.parse(candidate_to_add);
  pc.addIceCandidate(new RTCIceCandidate(candidate));
}

// 걸려온 전화 받고 "전화 받았습니다" 하기 accept call
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

// 전화를 걸고, 상대방이 연결돼서 "전화 받았습니다" 들은 뒤
socket.on("callAccepted", (data) => {
  // caller은 callee의 sdp를 자신의 remote로 설정
  pc.setRemoteDescription(JSON.parse(data.sdp));
});

// 위 작업들과 동시에, 전화망에서 일어나는 일
// setup pc for webRTC
pc.onicecandidate = (e) => {
  // 이 작업은 call을 누를 때,
  // callee는 answer 누르니까 뜬다
  // 찾아보니까 이 onIceCandidate는
  // setLocalDescription 할때 일어난대
  console.log("cadidate", e);
  // e.currentTarget.remoteDescription : 자기자신
  // e.currentTarget.localDescription : 상대방
  if (e.candidate) {
    if (otherPerson == yourID) {
      console.log("shouldn't send any here");
    } else {
      socket.emit("candidate", { candidate: JSON.stringify(e.candidate) });
    }
  }
};

//recv from other
socket.on("recv", (data) => {
  if (data.id == yourID) {
    otherPerson = data.id;
  } else {
    otherPerson = data.id;
    candidate_to_add = data.candidate;
  }
});


pc.ontrack = (e) => {
  partnerVideo.srcObject = e.streams[0];
};



