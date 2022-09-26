let express = require("express");
let socket = require("socket.io");
var static = require('serve-static');

//App setup
let app = express();
app.set('port', process.env.PORT || 8080);
app.set('host', '127.0.0.1'); // 루프백 주소(?)
app.use(static(__dirname));

let server = app.listen(app.get('port'), function () {
  console.log("listening to requests on port 8080");
});

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

//video chat stuff
const users = {};

io.on("connection", function (socket) {
  console.log("new");
});
