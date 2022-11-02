const path = require('path')
const express = require('express')
const app = express()
const port = process.env.PORT || 4000

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname,'node_modules')));
app.set('port', port);

let server = app.listen(app.get('port'), function () {
  console.log(`listening on port ${port}`)
})

//App setup
let io = require('socket.io')(server)

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
  
  peers[socket.id] = [socket];
  socket.emit('getInfo', socket.id);
  socket.on('setName', data => {
      peers[socket.id].push(data.name);
      // setup new peer connection
      for (let id in peers) {
        if(id === socket.id) continue;

        peers[id][0].emit('newUserArr', {
          newbieID: socket.id,
          newbieName: data.name // peers[socket.id][1]
        })
        // emit initReceive
      }
  });

  //(initSenddd) emit initsend
  socket.on('sayHiToNewbie', data => {
    console.log(data.new_id + " hi from " + data.name);
    console.log("current socket id is ", socket.id)
    peers[data.new_id][0].emit('newbieSaysThx', {
      socket_id: socket.id,
      addName: data.name
    })
  })

  // socket for transfering signals in the middle
  socket.on("signala", data => {
    console.log(socket.id, "->", data.socket_id);
    if(!peers[data.socket_id][0]) {
      console.log("maybe for disconnections");
    }
    peers[data.socket_id][0].emit('signal', {
      socket_id: socket.id,
      signal: data.signal
    })
  })

    socket.on('disconnect', () => {
      console.log('socket disconnected ' + socket.id)
      socket.broadcast.emit('removePeer', socket.id)
      delete peers[socket.id]
    })
});
