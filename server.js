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

io.on("connection", function (socket) {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }
  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);

  socket.on("disconnect", () => {
    console.log("disconnected");
    delete users[socket.id];
    candidate = [];
    io.sockets.emit("available_users", users);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", { sdp: data.sdp, from: data.from });
  });

  socket.on("acceptedCall", (data) => {
    io.to(data.guy_I_accepted_call_from).emit("callAccepted", {
      sdp: data.sdp,
    });
  });

  socket.on("candidate", (data) => {
    candidate.push(data.candidate);

    if (candidate.length < 2) {
      io.sockets.emit("recv", { candidate: candidate[0], id: socket.id });
    } else {
    }
  });

  console.log("made socket connection");
});
