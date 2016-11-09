var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.Port || 3000);

var clients = [];
var rooms = [{title:'testRoom',master:'user1',attendants:['user1']}, {title:'testRoom2',master:'user2',attendants:['user2']}];

io.on("connection", function(socket){
  var currentUser;

  socket.on("USER_CONNECT", function(data){
      console.log("User connected");
      currentUser = {
        name: data.name,
      }

      clients.push(currentUser);

      currentServerInfo = {
          clientsLength: clients.length,
          rooms: rooms
      }

      socket.emit("USER_CONNECTED",{currentUser:currentUser, currentServerInfo:currentServerInfo});
      socket.broadcast.emit("USER_CONNECTED", {currentUser:currentUser, currentServerInfo:currentServerInfo});
      for(var i = 0; i<clients.length; i++)
        console.log("User name "+clients[i].name+ " is connected");
  });

  socket.on("CREATE_ROOM", function(data){

    roomInfo = {
      title: data.title,
      master: data.master,
      attendants: [data.master]
    }

    rooms.push(roomInfo);

    currentServerInfo = {
        clientsLength: clients.length,
        rooms: rooms
    }

    socket.join(roomInfo.title);
    socket.emit("CREATED_ROOM", {currentServerInfo:currentServerInfo, roomInfo:roomInfo});
    socket.broadcast.emit("CREATED_ROOM", {currentServerInfo:currentServerInfo, roomInfo:roomInfo});
    console.log(roomInfo.title +"room is created");
  });

  socket.on("JOIN_ROOM", function(data){

    roomInfo = {
      title:'',
      master:'',
      attendants: []
    }

    roomInfo = rooms.find((room)=>{
      return room.title == data.title
    });

    roomInfo.attendants.push(data.attendant);

    socket.join(roomInfo.title);
    socket.emit("JOINED_ROOM", roomInfo);
    io.to(roomInfo.title).emit("JOINED_ROOM", roomInfo);

  });

  socket.on("LEAVE_ROOM", function(data){

    roomInfo = {
      title:'',
      master:'',
      attendants: []
    }

    roomInfo = rooms.find((room)=>{
      return room.title == data.title;
    });

    //room is destryed;
    if(roomInfo == null) {
      currentServerInfo = {
          clientsLength: clients.length,
          rooms: rooms
      }
      console.log("BBBBBBBBBB");
      socket.leave(data.title);
      socket.emit("LEFT_ROOM",{currentServerInfo:currentServerInfo,roomInfo:roomInfo});
      socket.broadcast.emit("LEFT_ROOM",{currentServerInfo:currentServerInfo,roomInfo:roomInfo});
      return;
    }

    // master left room
    if(roomInfo.master == data.attendant) {
      for(var i=0; i<rooms.length; i++) {
        if(rooms[i].title == roomInfo.title) {
          console.log(roomInfo.title+" room is destroy");
          rooms.splice(i,1);
        }
      }

      io.to(roomInfo.title).emit("DESTROY_ROOM",roomInfo);
    }
    //attendant left room
    for(var i=0; i<roomInfo.attendants.length; i++) {
      if(roomInfo.attendants[i] == data.attendant) {
        console.log("User "+roomInfo.attendants[i]+" left "+roomInfo.title);
        roomInfo.attendants.splice(i,1);
      }
    }


    currentServerInfo = {
        clientsLength: clients.length,
        rooms: rooms
    }

    console.log("AAAAAAAAAA");
    socket.leave(roomInfo.title);
    socket.emit("LEFT_ROOM",{currentServerInfo:currentServerInfo, roomInfo:roomInfo });
    socket.broadcast.emit("LEFT_ROOM",{currentServerInfo:currentServerInfo, roomInfo:roomInfo });

  });


  socket.on("PLAY", function (data){
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
    //클라이언트 array 제거..
    for( var i = 0; i < clients.length; i++) {
      if(clients[i].name == currentUser.name) {
        console.log("User "+clients[i].name+" disconnected");
        clients.splice(i,1);
      }
    }

    //rooms의 attendants 목록에 있는 경우에 제거...
    for(var i = 0; i<rooms.length; i++) {
      var attendant = rooms[i].attendants.find((attendant)=>{
        return attendant == currentUser.name;
      });
      if(attendant !=null) {
        socket.leave(rooms[i].title);
        // attendants 에서 제거..
        for(var j=0; j<rooms[i].attendants.length; j++) {
          if(rooms[i].attendants[j] == attendant) {
            console.log("User "+rooms[i].attendants[j]+" left "+rooms[i].title);
            rooms[i].attendants.splice(j,1);
          }
        }

        currentServerInfo = {
            clientsLength: clients.length,
            rooms: rooms
        }

        socket.broadcast.emit("LEFT_ROOM",{currentServerInfo:currentServerInfo,roomInfo:roomInfo});
        break;
      }
    }

    //rooms의 master 였던 경우...
    var room = rooms.find((room)=>{
      return room.master == currentUser.name;
    });
    if(room != null) {
      //rooms 에서 제거..
      for(var i=0; i<rooms.length; i++) {
        if(rooms[i].title == room.title) {
          console.log(room.title+" room is destroy");
          rooms.splice(i,1);
        }
      }
      io.to(room.title).emit("DESTROY_ROOM",room);
    }


    currentServerInfo = {
        clientsLength: clients.length,
        rooms: rooms
    }

    socket.broadcast.emit("USER_DISCONNECTED", currentServerInfo);

  });

});


server.listen(app.get('port'), function(){
  console.log("-------server is running -------");
});
