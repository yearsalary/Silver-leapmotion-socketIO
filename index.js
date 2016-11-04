var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.Port || 3000);

var clients = [];

io.on("connection", function(socket){
  var currentUser;
  var ballOwner;

  socket.on("USER_CONNECT", function(){
    console.log("User connected");
    for( var i = 0; i < clients.length; i++) {
      socket.emit("USER_CONNECTED", {name:clients[i].name, position:clients[i].position});
      console.log("User name "+clients[i].name+ "is connected");
    }
  });

  socket.on("PLAY", function (data){
    console.log(data);

    currentUser = {
      name: data.name,
      position: data.position
    }

    clients.push(currentUser);
    socket.emit("PLAY", currentUser);
    socket.broadcast.emit("USER_CONNECTED", currentUser);
  });


  //PlayerBarMove 메시지 리시브.
  socket.on("MOVE", function(data){
   currentUser = {
     name: data.name,
     position: data.position
   }
   socket.emit("MOVE", currentUser);
   socket.broadcast.emit("MOVE", currentUser);
    //console.log( currentUser.name + " move to "+ currentUser.position );
  });


  //BALL_MOVE메시지 리시브.
  socket.on("BALL_MOVE", function(data){
    ball = {
      moveDirection: data.moveDirection,
      position: data.position
    }

    //BallOwner 자신을 제외한 유저에게 브로드 캐스팅.
    socket.broadcast.emit("BALL_MOVE", ball);
    console.log(" BALL_MOVE to "+ ball.position );
  });


  socket.on("BALL_OWNER_CHANGE", function(data){
    ballOwner = {
       name : data.name
    }

    //socket.emit("BALL_COLLISON", ballOwner);
    socket.broadcast.emit("BALL_OWNER_CHANGE", ballOwner);
     console.log("ballOwner"+ballOwner.name);
  });



  //User disconnect
  socket.on("disconnect", function(){
    socket.broadcast.emit("USER_DISCONNECTED", currentUser);
    for( var i = 0; i < clients.length; i++) {
      if(clients[i].name == currentUser.name) {
        console.log("User "+clients[i].name+" disconnected");
        clients.splice(i,1);
      }
    }
  });

});


server.listen(app.get('port'), function(){
  console.log("-------server is running -------");
});
