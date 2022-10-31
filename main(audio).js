let socket = io.connect("http://localhost:4000");
let UserVideo = document.querySelector("#localVideo");
// let partnerVideo = document.querySelector("#remoteVideo");
let call_container = document.querySelector("#call_container");
let incoming_call = document.querySelector("#incoming_call");
let yourID;
let myInfo = document.querySelector("#myInfo");
let candidate_to_add;
let otherPerson;
let optionsRTC = {
  configuration: {
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  }
}
let pc1 = new RTCPeerConnection({
  // configuration: {
  //   offerToReceiveAudio: false,
  //   offerToReceiveVideo: true,
  // },
  optionsRTC
});
let pc2 = new RTCPeerConnection(optionsRTC);
// let pc3 = new RTCPeerConnection(optionsRTC);
let pc = [pc1, pc2]; //, pc3];
let order;
let partnerIndex = 0; // 연결 성공 수
let videoContainer = document.querySelector("#video_container")

// 처음 창 접속하고 화면공유
let displayMediaOptions = {
  video: {
    cursor: "always",
  },
  audio: true,
};

const success = (stream) => {
  UserVideo.srcObject = stream;

  pc[0].addStream(stream);
  pc[1].addStream(stream);
  // forEach 가능

};

navigator.mediaDevices
  .getDisplayMedia(displayMediaOptions) // 화면 공유 옵션
  .then(success)
  .catch(() => {
    console.log("errors with the media device");
  });

// 동시에 서버와 연결
socket.on("yourID", (data) => {
  yourID = data.id;
  order = data.order;
  myInfo.innerHTML=`${yourID} <br/> order #${order}`
});


// when call -> do for everyone else
socket.on("allUsers", (users) => {
  call_container.innerHTML = "";
  videoContainer.innerHTML = ""; // 원래 연결도 사라짐

  let all_users = Object.keys(users);

  let pc_index = 0
  all_users.forEach((user_id) => {
    if (user_id == yourID) {
      // nothing
    }
    else {
      call_container.innerHTML += `
      <button class="call_button" data-person_to_call=${user_id} data-from_index=${pc_index}>Call ${user_id}</button>
      `;

      videoContainer.innerHTML += `
      <p>${user_id}</p>

      <video id="video${pc_index}" class="othervideos" data-video_of=${user_id}
      autoplay
      style="width: 700px; height: 500px; background: rgba(0, 0, 0, 0.5)"></video>
      `
      pc_index++;
    }
  });

  let call_buttons = document.querySelectorAll(".call_button");
  call_buttons.forEach((call_button) => {
    call_button.addEventListener("click", (e) => {
      call_user(call_button.dataset.person_to_call, call_button.dataset.from_index);
    });
  });
});

// 위에까지는 서버와 연결하는 작업
// 이제 버튼을 눌러 실제 call을 할때
// call a user
function call_user(person_to_call, idx) {
  createOffer(person_to_call, idx);
}

function createOffer(person_to_call, idx) {
  pc[idx].createOffer({ // callee에게 전달할 sdp 생성
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

      pc[idx].setLocalDescription(sdp); // 로컬 sdp로 설정
    }
  );
}

// call from other
// 누군가한테서 전화가 왔을 때
socket.on("hey", (data) => {
  incoming_call.innerHTML = `
    <h1>${data.from} is calling you</h1>`;
  //   <div>
  //     <button id="answer">Answer</button>
  //     <button id="decline">Decline</button>
  //   </div>
  // `;

  // let answer = document.querySelector("#answer");
  // let decline = document.querySelector("#decline");

  // 5초 뒤 수락
  setTimeout( () => {
    incoming_call.innerHTML = "";
    acceptCall(data.sdp, data.from);
  }, 5000);


  // answer.addEventListener("click", (e) => {
  //   acceptCall(data.sdp, data.from);
  //   incoming_call.innerHTML = "";
  // });
  // decline.addEventListener("click", (e) => {
  //   console.log("Declined call");
  //   // decline 로직 없음
  //   // 일단 그냥 사라지는거로 표기
  //   incoming_call.innerHTML = "";
  // });
});

// when accept call
// 전화가 걸려온 것을 받았을 때
function acceptCall(sdp, guy_I_accepted_call_from) {
  pc[partnerIndex].setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
  // pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));

  // callee는 이 정보를 remote로 설정
  createAnswer(guy_I_accepted_call_from, partnerIndex);
  // 이 candidate는 어디서 튀어나온건지
  const candidate = JSON.parse(candidate_to_add);
  pc[partnerIndex].addIceCandidate(new RTCIceCandidate(candidate));
  partnerIndex++;
}

// 걸려온 전화 받고 "전화 받았습니다" 하기 accept call
function createAnswer(guy_I_accepted_call_from, partnerIndex) {
  pc[partnerIndex].createAnswer({
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

      pc[partnerIndex].setLocalDescription(sdp);
      // callee도 자기 sdp local에 설정
    },
  );
}

// 전화를 걸고, 상대방이 연결돼서 "전화 받았습니다" 들은 뒤
socket.on("callAccepted", (data) => {
  // caller은 callee의 sdp를 자신의 remote로 설정
  pc[partnerIndex].setRemoteDescription(JSON.parse(data.sdp));
  partnerIndex++;
});

// 위 작업들과 동시에, 전화망에서 일어나는 일
// setup pc for webRTC
pc[0].onicecandidate = (e) => {
  console.log("cadidate0", e);
  // e.currentTarget.remoteDescription : 자기자신
  // e.currentTarget.localDescription : 상대방
  if (e.candidate) {
    if (otherPerson == yourID) {
      console.log("shouldn't send any here");
    } else {
      socket.emit("candidate", { candidate: JSON.stringify(e.candidate), check: 0});
    }
  }
};

pc[1].onicecandidate = (e) => {
  // 이 작업은 call을 누를 때,
  // callee는 answer 누르니까 뜬다
  // 찾아보니까 이 onIceCandidate는
  // setLocalDescription 할때 일어난대
  console.log("cadidate1", e);
  // e.currentTarget.remoteDescription : 자기자신
  // e.currentTarget.localDescription : 상대방
  if (e.candidate) {
    if (otherPerson == yourID) {
      console.log("shouldn't send any here");
    } else {
      socket.emit("candidate", { candidate: JSON.stringify(e.candidate), check: 1 });
    }
  }
};

//recv from other
socket.on("recv", (data) => {
  console.log(data)
  if (data.id == yourID) {
    otherPerson = data.id;
    console.log(data.id, candidate_to_add)
  } else {
    otherPerson = data.id;
    candidate_to_add = data.candidate;
  }
});

pc[0].ontrack = (e) => {
  let vd = document.querySelector("#video0");
  vd.srcObject = e.streams[0];

  // partnerVideo.srcObject = e.streams[0];
};

pc[1].ontrack = (e) => {
  let vd = document.querySelector("#video1");
  vd.srcObject = e.streams[0];

  // partnerVideo.srcObject = e.streams[0];
};

