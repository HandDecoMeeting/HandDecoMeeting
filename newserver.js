const fs = require('fs')
const path = require('path')
const express = require('express')
const app = express()
const httpolyglot = require('httpolyglot')
const httpsServer = httpolyglot.createServer({key: '',
cert: ''}, app);
const port = process.env.PORT || 4000

//App setup
const io = require('socket.io')(httpsServer)

httpsServer.listen(port, () => {
  console.log(`listening on port ${port}`)
})

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


/////////////////////////////
let peers = {};

io.on("connect", (socket) => {
  console.log("new");
  
  peers[socket.id] = socket;
  socket.emit('getInfo', socket.id);

  // setup new peer connection
  for (let id in peers) {
    if(id === socket.id) continue;

    peers[id].emit('newUserArr', socket.id)
    // emit initReceive
    console.log("이거ㅗ 하잖아");
  }

  //(initSenddd) emit initsend
  socket.on('sayHiToNewbie', new_id => {
    console.log(socket.id + " said hi to " + new_id);
    peers[new_id].emit('newbieSaysThx', socket.id)
  })

  // socket for transfering signals in the middle
  socket.on("signala", data => {
    console.log(socket.id, "->", data.socket_id);
    if(!peers[data.socket_id]) {
      console.log("maybe for disconnections");
    }
    peers[data.socket_id].emit('signal', {
      socket_id: socket.id,
      signal: data.signal
    })
  })
});
