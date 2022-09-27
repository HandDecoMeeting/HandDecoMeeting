let express = require("express");
let socket = require("socket.io");
const path = require('path')

//App setup
let app = express();
app.set('port', process.env.PORT || 4000);
let server = app.listen(app.get('port'), function () {
  console.log("listening to requests on port 4000");
});

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname,'node_modules')));

var router = express.Router();
router.route('/').get(function(req, res) {
    res.redirect('./video_chat.html'); // 상대경로
});
app.use('/', router);

app.all('*', function(req, res){
    res.status(404).send('<h1>error-잘못된 접근입니다</h1>')
    // 404 에러 반환 + send msg
})

//socket setup
let io = socket(server);

/////////////////////////////
const peers = {};

io.on("connection", function (socket) {
  console.log("new");
  
  peers[socket.id] = socket;

  // setup new peer connection
  for (let id in peers) {
    if(id == socket.id) continue;

    peers[id].emit('newUserArr', socket.id)
  }

  socket.on('sayHiToNewBie', new_id => {
    console.log(socket.id + " said hi to " + new_id);
    peers[new_id].emit('newbieSaysThx', socket.id)
  })
});
