const path = require('path')
const express = require('express')
const app = express()
const port = process.env.PORT || 8080
const fs = require('fs');
const https = require('https')

const privatekey = fs.readFileSync('/etc/letsencrypt/live/hand-deco-meeting.shop/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/hand-deco-meeting.shop/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/hand-deco-meeting.shop/chain.pem', 'utf8');

const credentials = {
	key: privatekey,
	cert: certificate,
	ca: ca
}

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname,'node_modules')));
app.set('port', port);
/*
let server = app.listen(app.get('port'), function () {
  console.log(`listening on port ${port}`)
})
*/
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(port, () => {
	console.log('HTTPS server running on port ', port);
});

//App setup
let io = require('socket.io')(httpsServer)

var router = express.Router();
    router.route('/').get(function(req, res) {
        res.redirect('./video_chat.html'); // 상대경로
    });
    app.use('/', router);
/*
app.use('*', (req, res, next) => {
	if(!req.socket.encrypted){
	res.redirect('https://'+req.headers.host+req.path)
}
})
*/
    
    app.all('*', function(req, res){
        res.status(404).send('<h1>error-잘못된 접근입니다</h1>')
        // 404 에러 반환 + send msg
    })


/////////////////////////////
let peers = {};

io.on("connect", (socket) => {
  peers[socket.id] = [socket];

  socket.emit('getInfo', {
    socket_id: socket.id,
    count: Object.keys(peers).length
  });

  socket.on('setName', data => {
      peers[socket.id].push(data.name);
      // setup new peer connection
      for (let id in peers) {
        if(id === socket.id) continue;

        peers[id][0].emit('newUserArr', {
          newbieID: socket.id,
          newbieName: data.name, // peers[socket.id][1]
          count: Object.keys(peers).length
        })
        // emit initReceive
      }
  });

  //(initSenddd) emit initsend
  socket.on('sayHiToNewbie', data => {
    peers[data.new_id][0].emit('newbieSaysThx', {
      socket_id: socket.id,
      addName: data.name
    })
  })

  // socket for transfering signals in the middle
  socket.on("signala", data => {
    peers[data.socket_id][0].emit('signal', {
      socket_id: socket.id,
      signal: data.signal
    })
  })

    socket.on('disconnect', () => {
      let save = socket.id
      delete peers[socket.id]
      socket.broadcast.emit('removePeer', {
        socket_id: save,
        count: Object.keys(peers).length
      })
    })
});
