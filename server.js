const express = require('express')
const { ClientRequest } = require('http')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const mediasoup = require('mediasoup')
const Clients = new Array()

app.use('/', express.static('public'))
startWorker()

io.on('connection', (socket) => {
  socket.on('join', (loginDetails) => {

    const roomClients = io.sockets.adapter.rooms[loginDetails.roomId] || { length: 0 }
    const numberOfClients = roomClients.length

    console.log(`Chegou o join do user ${loginDetails.userName}`)
    // These events are emitted only to the sender socket.

    if (numberOfClients == 0) {
      console.log(`Criando sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_created`)
      
      loginDetails.isRoomCreator = true //Seta como criador da sala
      loginDetails.idSocket = socket.id

      Clients.push(loginDetails)
      console.log(Clients)

      socket.join(loginDetails.roomId)
      socket.emit('room_created', loginDetails)

    } else if (numberOfClients <= 3) {
      console.log(`Entrou na sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_joined`)

      loginDetails.isRoomCreator = false
      loginDetails.idSocket = socket.id
      Clients.push(loginDetails)
      console.log(Clients)

      socket.join(loginDetails.roomId)
      socket.emit('room_joined', loginDetails)

    } else {
      console.log(`Sala ${loginDetails.roomId} cheia user ${loginDetails.userName}, emitiu full_room`)
      socket.emit('full_room', loginDetails)
    }
  })

  socket.on('bye', (loginDetails) => {
      console.log(`${loginDetails.userName} Criador: ${loginDetails.isRoomCreator} saiu da sala ${loginDetails.roomId}, emitiu leave_room`)

      Clients.splice(Clients.findIndex(item => item.userName === loginDetails.userName), 1) //Retira o cliente da lista

      if((loginDetails.isRoomCreator) && Clients.length > 0){ //Se for o criador
          Clients[0].isRoomCreator = true          
          console.log(Clients)
      }

      socket.leave(loginDetails.roomId)
      socket.emit('ack_bye', loginDetails) //Informa que foi retirado com sucesso

      if(!Clients.length == 0){
        var nisRoomCreator = Clients[Clients.findIndex(item => item.isRoomCreator == true)].userName
        socket.broadcast.to(loginDetails.roomId).emit('leave_room',nisRoomCreator)
      }
  }) 

  socket.on('ack_leave', (loginDetails) => {
    console.log(`Recebeu ack_leave de ${loginDetails.userName}`)

  }) 

//=======================================================================================================//
//======================================= IDENTIFICA UMA DESCONEXÃO =====================================//
//=======================================================================================================//
socket.on('disconnect', () => {

    if(Clients.find(x => x.idSocket === socket.id)){  //EVITA O ERRO DE OBJETO INDEFINIDO

        var userLeave = Clients.find(x => x.idSocket === socket.id)
        Clients.splice(Clients.findIndex(item => item.idSocket === socket.id), 1) //Retira o cliente da lista
        
        if((userLeave.isRoomCreator) && Clients.length > 0){ //Se for o criador 
            Clients[0].isRoomCreator = true          
        }

        socket.leave('SMU')
        //socket.emit('ack_bye', userLeave) //Informa que foi retirado com sucesso

        if(Clients.length != 0){
          var nisRoomCreator = Clients.find(x => x.isRoomCreator === true).userName
          socket.broadcast.to('SMU').emit('leave_room',nisRoomCreator)
        }
    }
  })
//=======================================================================================================//
//============================= BROADSCAST DE NEGOCIACAO/SDP ============================================//
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

//=======================================================================================================//
//=======================================================================================================//
//============================= MEDIASOUP ===============================================================//
//=======================================================================================================//
//=======================================================================================================//

    socket.on('getRouterRtpCapabilities', (data, callback) => {
      if (router) {
        //console.log('getRouterRtpCapabilities: ', router.rtpCapabilities);
        sendResponse(router.rtpCapabilities, callback);
      }
      else {
        sendReject({ text: 'ERROR- router NOT READY' }, callback);
      }
    });

//=============================================================================================//
//=========================== PRODUTOR = ======================================================//
//=============================================================================================//

    socket.on('createProducerTransport', async (data, callback) => {
      console.log('-- createProducerTransport ---');
      const { transport, params } = await createTransport();
      addProducerTrasport(socket.id, transport);
      transport.observer.on('close', () => {
        const id = socket.id;
        removeProducerTransport(id);
      });
      
      sendResponse(params, callback);
    });

    socket.on('connectProducerTransport', async (data, callback) => {
      console.log('connectProducerTransport by socket ', socket);
      const transport = getProducerTrasnport(socket.id);
      await transport.connect({ dtlsParameters: data.dtlsParameters });
      sendResponse({}, callback);
    });   

    socket.on('producedata', async (data, callback) => {
      const { rtpParameters } = data;
      console.log('-- produce ---');
      const id = socket.id;
      const transport = getProducerTrasnport(id);
      if (!transport) {
        console.error('transport NOT EXIST for id=' + id);
        return;
      }
      const producer = await transport.produceData({ rtpParameters });
      //const producer = await transport.produce({ rtpParameters });
      addProducer(id, producer);
      producer.observer.on('close', () => {
        console.log('producer closed');
      })
      sendResponse({ id: producer.id }, callback);
  
      // inform clients about new producer
      console.log('--broadcast newProducer ---');
      socket.broadcast.emit('newProducer', { socketId: id, producerId: producer.id });
    });

//=============================================================================================//
//=========================== CONSUMIDOR ======================================================//
//=============================================================================================//


})  //FIM DO SOCKET.IO

//==================================================================================================//
//============================= NEGOCIACAO SDP/SFU =================================================//
//==================================================================================================//
  // --- send response to client ---
  function sendResponse(response, callback) {
    //console.log('sendResponse() callback:', callback);
    callback(null, response);
  }

    // --- send error to client ---
    function sendReject(error, callback) {
      callback(error.toString(), null);
    }
  
    function sendback(socket, message) {
      socket.emit('message', message);
    }

//==============================================================================================//

const mediasoupOptions = {
  // Worker settings
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
      // 'rtx',
      // 'bwe',
      // 'score',
      // 'simulcast',
      // 'svc'
    ],
  },
  // WebRtcTransport settings
  webRtcTransport: {
    listenIps: [
      { ip: '127.0.0.1', announcedIp: null }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  }
};

let worker = null;
let router = null;

async function startWorker() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter();
  console.log('-- mediasoup worker start. --')
}

// --- multi-producers --
let producerTransports = {};

function getProducerTrasnport(id) {
  return producerTransports[id];
}

function addProducerTrasport(id, transport) {
  producerTransports[id] = transport;
  console.log('producerTransports count=' + Object.keys(producerTransports).length);
}

function removeProducerTransport(id) {
  delete producerTransports[id];
  console.log('producerTransports count=' + Object.keys(producerTransports).length);
}


async function createTransport() {
  const transport = await router.createWebRtcTransport(mediasoupOptions.webRtcTransport);
  console.log('-- create transport id=' + transport.id);

  return {
    transport: transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    }
  };
}





//============================= INICIA SERVIDOR ====================================================//
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Servidor Express escutando na porta ${port}`)
})




