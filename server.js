const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const Clients = new Array()

app.use('/', express.static('public'))

io.on('connection', (socket) => {
  socket.on('join', (loginDetails) => {

    const roomClients = io.sockets.adapter.rooms[loginDetails.roomId] || { length: 0 }
    const numberOfClients = roomClients.length

    console.log(`Chegou o join do user ${loginDetails.userId}`)
    // These events are emitted only to the sender socket.

    if (numberOfClients == 0) {
      console.log(`Criando sala ${loginDetails.roomId}, o user ${loginDetails.userId} emitiu room_created`)
      
      loginDetails.isRoomCreator = true //Seta como criador da sala
      Clients.push(loginDetails)
      console.log(Clients)

      socket.join(loginDetails.roomId)
      socket.emit('room_created', loginDetails)

    } else if (numberOfClients <= 3) {
      console.log(`Entrou na sala ${loginDetails.roomId}, o user ${loginDetails.userId} emitiu room_joined`)

      loginDetails.isRoomCreator = false
      Clients.push(loginDetails)
      console.log(Clients)

      socket.join(loginDetails.roomId)
      socket.emit('room_joined', loginDetails)

    } else {
      console.log(`Sala ${loginDetails.roomId} cheia user ${loginDetails.userId}, emitiu full_room`)
      socket.emit('full_room', loginDetails)
    }
  })

  socket.on('bye', (loginDetails) => {
      console.log(`${loginDetails.userId} Criador: ${loginDetails.isRoomCreator} saiu da sala ${loginDetails.roomId}, emitiu leave_room`)

      Clients.splice(Clients.findIndex(item => item.userId === loginDetails.userId), 1) //Retira o cliente da lista

      if((loginDetails.isRoomCreator) && Clients.length > 0){ //Se for o criador
          Clients[0].isRoomCreator = true          
          console.log(Clients)
      }

      socket.leave(loginDetails.roomId)
      socket.emit('ack_bye', loginDetails) //Informa que foi retirado com sucesso

      if(!Clients.length == 0){
        var nisRoomCreator = Clients[Clients.findIndex(item => item.isRoomCreator == true)].userId
        socket.broadcast.to(loginDetails.roomId).emit('leave_room',nisRoomCreator)
      }
  }) 

  socket.on('ack_leave', (loginDetails) => {
    console.log(`Recebeu ack_leave de ${loginDetails.userId}`)

  }) 


  //========================== BROADSCAST DE NEGOCIACAO/SDP =======================================//
    socket.on('enter_call', function (loginDetails) {
      console.log(`Broadcast enter_call na sala ${loginDetails.roomId}`)
      socket.broadcast.to(loginDetails.roomId).emit('enter_call')
    })
  
    socket.on('offer', (event) => {
      console.log(`Broadcast offer na sala ${event.loginDetails.roomId}`)
      socket.broadcast.to(event.loginDetails.roomId).emit('offer', event)
      //socket.broadcast.to(event.loginDetails.roomId).emit('offer', event.sdp)
    })

    socket.on('ack_offer', (event) => {
      console.log(`Broadcast ack_offer na sala ${event.loginDetails.roomId}`)
      socket.broadcast.to(event.loginDetails.roomId).emit('ack_offer', event)
      //socket.broadcast.to(event.loginDetails.roomId).emit('ack_offer', event.sdp)
    })

    socket.on('ice_candidate', (event) => {
      console.log(`Broadcast ice_candidate na sala ${event.roomId}`)
      socket.broadcast.to(event.roomId).emit('ice_candidate', event)
    })

})

//============================= INICIA SERVIDOR ====================================================//
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Servidor Express escutando na porta ${port}`)
})
