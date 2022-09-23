let express = require("express");
let socket = require("socket.io");

//App setup
let app = express();
let server = app.listen(4000, function () {
  console.log("listening to requests on port 4000");
});

//Static files
app.use(express.static("public"));

//socket setup
let io = socket(server);

//video chat stuff
const users = {};
let candidate = [];

io.on("connection", function (socket) { // connection이 들어올 때 마다
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }
  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);
  /* 
    main.js의 "allUsers"에서 일어나는 일
    1. users 배열을 받는다
    2. users의 user_id마다 call 버튼 생성
    (자기 자신 포함)
    3. call_buttons 각각에 대해 클릭했을 시
    main.js의 call_user(전화 걸 사람) 함수 호출
    // 4. call_user(걸사람) -> createOffer(걸사람) 삭제
    4. sdp 생성 후 "callUser"로 emit해서 전달
  */

  socket.on("disconnect", () => {
    console.log("disconnected");
    delete users[socket.id];
    candidate = [];
    io.sockets.emit("available_users", users);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", { sdp: data.sdp, from: data.from });
    // 특정 socket(userToCall)한테 전달?
  });

  socket.on("acceptedCall", (data) => {
    io.to(data.guy_I_accepted_call_from).emit("callAccepted", {
      sdp: data.sdp,
    });
  });

  socket.on("candidate", (data) => {
    candidate.push(data.candidate);

    if (candidate.length < 2) { // ==1
      io.sockets.emit("recv", { candidate: candidate[0], id: socket.id });
    } else {
    }
  });

  console.log("made socket connection");
});
