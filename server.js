const express = require('express')
const { ClientRequest } = require('http')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const Clients = new Array()

app.use('/', express.static('public'))

io.on('connection', (socket) => {
  socket.on('join', (loginDetails) => {

    const roomClients = io.sockets.adapter.rooms[loginDetails.roomId] || { length: 0 }
    //const numberOfClients = roomClients.length

    console.log(`Chegou o join do user ${loginDetails.userName}`)
    // These events are emitted only to the sender socket.

    if (roomClients.length == 0) {
      console.log(`Criando sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_created`)
      
      loginDetails.isRoomCreator = true //Seta como criador da sala
      loginDetails.idSocket = socket.id
      loginDetails.numberOfClients = roomClients.length+1
      loginDetails.posClient = roomClients.length+1
      Clients.push(loginDetails)

      console.log(Clients)

      prepareRoom(socket,loginDetails)
      socket.join(loginDetails.roomId)
      //setRoomname(loginDetails.roomId);
      socket.emit('room_created', loginDetails)

    } else if (roomClients.length <= 3) {
      console.log(`Entrou na sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_joined`)

      loginDetails.isRoomCreator = false
      loginDetails.idSocket = socket.id
      loginDetails.numberOfClients = roomClients.length+1
      loginDetails.posClient = roomClients.length+1
      Clients.push(loginDetails)

      console.log(Clients)

      prepareRoom(socket,loginDetails)
      socket.join(loginDetails.roomId)
      //socket.join(loginDetails.roomId)
      //setRoomname(loginDetails.roomId)
      socket.emit('room_joined', loginDetails)

    } else {
      console.log(`Sala ${loginDetails.roomId} cheia user ${loginDetails.userName}, emitiu full_room`)
      socket.emit('full_room', loginDetails)
    }
  })

  socket.on('bye', (loginDetails) => {
      console.log(`${loginDetails.userName} Criador: ${loginDetails.isRoomCreator} saiu da sala ${loginDetails.roomId}, emitiu leave_room`)
      cleanUpPeer(loginDetails.roomId,socket);

      Clients.splice(Clients.findIndex(item => item.userName === loginDetails.userName), 1) //Retira o cliente da lista
      let numberOfClientsRoom = Clients.filter(item => item.roomId === loginDetails.roomId);

      if((loginDetails.isRoomCreator) && numberOfClientsRoom.length > 0){ //Se for o criador
          Clients[0].isRoomCreator = true          
          console.log(Clients)
      }

      socket.leave(loginDetails.roomId)
      socket.emit('ack_bye', loginDetails) //Informa que foi retirado com sucesso
      
      if(numberOfClientsRoom.length != 0){
        var nisRoomCreator = Clients[Clients.findIndex(item => item.isRoomCreator == true)].userName
        var atualizaDetails = { listaClientes: Clients, nisRoomCreator: nisRoomCreator, numberOfClients: numberOfClientsRoom.length}
        socket.broadcast.to(loginDetails.roomId).emit('leave_room',atualizaDetails)

        //console.log(atualizaDetails.listaClientes.indexOf(item => item.userName == loginDetails.userName))
        //console.log(atualizaDetails.listaClientes.findIndex(item => item.isRoomCreator == true))
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

        let disconnectRoom = Clients.find(x => x.idSocket === socket.id).roomId
        cleanUpPeer(disconnectRoom,socket)

        var userLeave = Clients.find(x => x.idSocket === socket.id)
        Clients.splice(Clients.findIndex(item => item.idSocket === socket.id), 1) //Retira o cliente da lista
        let numberOfClientsRoom = Clients.filter(item => item.roomId === disconnectRoom);

        if((userLeave.isRoomCreator) && numberOfClientsRoom.length > 0){ //Se for o criador 
            Clients[0].isRoomCreator = true          
        }

        socket.leave(disconnectRoom)
        //socket.leave('SMU')
        //socket.emit('ack_bye', userLeave) //Informa que foi retirado com sucesso

        if(numberOfClientsRoom.length != 0){
          var nisRoomCreator = Clients.find(x => x.isRoomCreator === true).userName
          var atualizaDetails = { listaClientes: Clients, nisRoomCreator: nisRoomCreator, numberOfClients: numberOfClientsRoom.length}
          //socket.broadcast.to('SMU').emit('leave_room',atualizaDetails)
          socket.broadcast.to(disconnectRoom).emit('leave_room',atualizaDetails)
        }

    }
  })
//=======================================================================================================//
//============================= BROADSCAST DE NEGOCIACAO/SDP ============================================//
    socket.on('enter_call', function (loginDetails) {
      console.log(`Broadcast enter_call na sala ${loginDetails.roomId}`)
      let numberOfClientsRoom = Clients.filter(item => item.roomId === loginDetails.roomId);
      socket.broadcast.to(loginDetails.roomId).emit('enter_call',numberOfClientsRoom.length)
    })
  
//=======================================================================================================//
//=======================================================================================================//
//============================= MEDIASOUP ===============================================================//
//=======================================================================================================//
//=======================================================================================================//

    socket.on('getRouterRtpCapabilities', (data, callback) => {
      const router = defaultRoom.router;
      
      if (router) {
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
      const roomName = getRoomname(socket);

      console.log('-- createProducerTransport ---room=%s', roomName);
      const { transport, params } = await createTransport(roomName);
      addProducerTrasport(roomName, socket.id, transport);
      
      transport.observer.on('close', () => {
        const id = socket.id;
        removeProducerTransport(roomName, id);
      });
      
      sendResponse(params, callback);
    });

    socket.on('connectProducerTransport', async (data, callback) => {
      //console.log('connectProducerTransport by socket ', socket.id);
      const roomName = getRoomname(socket);
      const transport = getProducerTrasnport(roomName,socket.id);
      await transport.connect({ dtlsParameters: data.dtlsParameters, sctpParameters: data.sctpParameters });
      sendResponse({}, callback);
    });   

    socket.on('producedata', async (data, callback) => {
      const roomName = getRoomname(socket);
      const label = data.label;
      const sctpStreamParameters  = data;
      console.log('-- producedata --- label=' + label);
      const id = socket.id;
      const transport = getProducerTrasnport(roomName,id);
      

      if (!transport) {
        console.error('transport NOT EXIST for id=' + id);
        return;
      }

      const producer = await transport.produceData(sctpStreamParameters);

      addProducer(roomName,id, producer, label);
      producer.observer.on('close', () => {
        console.log('producer closed');
      })

      sendResponse({ id: producer.id }, callback);

      if (roomName) {
        console.log('--broadcast room=%s newProducer ---', roomName);
        socket.broadcast.to(roomName).emit('newProducer', { socketId: id, producerId: producer.id, label: producer.label });
      }
      else {
        console.log('--broadcast newProducer ---');
        socket.broadcast.emit('newProducer', { socketId: id, producerId: producer.id, label: producer.label });
      }
    });

//=============================================================================================//
//=========================== CONSUMIDOR ======================================================//
//=============================================================================================//
// --- consumer ----
  socket.on('createConsumerTransport', async (data, callback) => {
    const roomName = getRoomname(socket);
    console.log('--- createConsumerTransport --- id=' + socket.id);
    const { transport, params } = await createTransport(roomName);
    addConsumerTrasport(roomName, socket.id, transport);
    
    transport.observer.on('close', () => {
      const localId = socket.id;
      removeConsumerSetDeep(roomName,localId);
      removeConsumerTransport(roomName,id);
    });

    sendResponse(params, callback);
  });

  socket.on('connectConsumerTransport', async (data, callback) => {
    const roomName = getRoomname(socket);
    console.log('-- connectConsumerTransport -- id=' + socket.id);
    let transport = getConsumerTrasnport(roomName,socket.id);
    if (!transport) {
      console.error('transport NOT EXIST for id=' + socket.id);
      return;
    }
    await transport.connect({ dtlsParameters: data.dtlsParameters, sctpParameters: data.sctpParameters });
    sendResponse({}, callback);
  });

  socket.on('consume', async (data, callback) => {
    console.error('-- ERROR: consume NOT SUPPORTED ---');
    return;
  });

//==================================================================================================//
//==================================================================================================//
//==================================================================================================//

socket.on('getCurrentProducers', async (data, callback) => {
  const roomName = getRoomname(socket);
  const clientId = data.clientId;
  console.log('-- getCurrentProducers for clientId=' + clientId);

  const remoteChatIds = getRemoteIds(roomName, clientId, 'chat');
  console.log('-- remoteChatIds:', remoteChatIds);

  sendResponse({ remoteChatIds: remoteChatIds }, callback);
});


socket.on('consumeAdd', async (data, callback) => {
    const roomName = getRoomname(socket);
    const localId = socket.id;
    const label = data.label;
    const sctpStreamParameters = data.sctpStreamParameters;
    const remoteId = data.remoteId;
    let transport = getConsumerTrasnport(roomName,localId);

    if (!transport) {
      console.error('transport NOT EXIST for id=' + localId);
      return;
    }

    const producer = getProducer(roomName,remoteId, label);

    if (!producer) {
      console.error('producer NOT EXIST for remoteId=%s label=%s', remoteId, label);
      return;
    }

    console.log('-- consumeAdd -- localId=%s label=%s', localId, label);
    console.log('-- consumeAdd2 - localId=' + localId + ' remoteId=' + remoteId + ' label=' + label + ' producer.id =' + producer.id);
    
    const { consumer, params } = await createConsumer(roomName,transport, producer, sctpStreamParameters); // producer must exist before consume
    
    addConsumer(roomName, localId, remoteId, consumer, label); // TODO: comination of  local/remote id
    console.log('addConsumer localId=%s, remoteId=%s, label=%s', localId, remoteId, label);
    
      consumer.observer.on('close', () => {
        console.log('consumer closed ---');
      })

      consumer.on('dataproducerclose', () => {
        console.log('consumer -- on.dataproducerclose');
        
        // -- notifica o cliente ---
        socket.emit('dataproducerclose', { localId: localId, remoteId: remoteId, label: label });
        
        removeConsumer(roomName,localId, remoteId, label);
        consumer.close();
      });

    console.log('-- consumer ready ---');
    sendResponse(params, callback);
  });



})  //FIM DO SOCKET.IO

//==================================================================================================//
//============================= NEGOCIACAO SDP/SFU =================================================//
//==================================================================================================//

  // --- send response to client ---
  function sendResponse(response, callback) {
    callback(null, response);
  }

    // --- send error to client ---
    function sendReject(error, callback) {
      callback(error.toString(), null);
    }
  
    function getRoomname(socket) {
      //console.log(socket.rooms)
      let roomname = Object.keys(socket.rooms).filter(function(item) {
        return item !== socket.id;
      });
      //console.log(roomname)

      //const room = socket.roomname;
      const room = roomname;
      return room;
    }

//==============================================================================================//
//======================================= FUNCOES EXTRAS =======================================//
//==============================================================================================//

async function prepareRoom(socket, data){
  const roomId = data.roomId;
  const existRoom = Room.getRoom(roomId);
  if (existRoom) {
    console.log('--- use exist room. roomId=' + roomId);
  } else {
    console.log('--- create new room. roomId=' + roomId);
    const room = await setupRoom(roomId);
  }

  // --- socket.io room ---
  //socket.join(roomId);
  //setRoomname(socket, roomId);
}


async function setupRoom(name) {
  const room = new Room(name);
  const router = await worker.createRouter();
  router.roomname = name;

  router.observer.on('close', () => {
    console.log('-- router closed. room=%s', name);
  });
  
  router.observer.on('newtransport', transport => {
    console.log('-- router newtransport. room=%s', name);
  });

  room.router = router;
  Room.addRoom(room, name);
  return room;
}

function cleanUpPeer(roomname,socket) {
  const id = socket.id;
  removeConsumerSetDeep(roomname,id);

  const transport = getConsumerTrasnport(roomname,id);
  if (transport) {
    transport.close();
    removeConsumerTransport(roomname,id);
  }

  const messageProducer = getProducer(roomname,id, 'chat');
  if (messageProducer) {
    messageProducer.close();
    removeProducer(roomname,id, 'chat');
  }

  const producerTransport = getProducerTrasnport(roomname,id);
  if (producerTransport) {
    producerTransport.close();
    removeProducerTransport(roomname,id);
  }
}

//==============================================================================================//
//==============================================================================================//
//==============================================================================================//


class Room {
  constructor(name) {
    this.name = name;
    this.producerTransports = {};
    this.messageProducers = {};

    this.consumerTransports = {};
    this.messageConsumerSets = {};

    this.router = null;
  }

  getProducerTrasnport(id) {
    console.log('ROOM getProducerTransport')
    return this.producerTransports[id];
  }

  addProducerTrasport(id, transport) {
    this.producerTransports[id] = transport;
    console.log('room=%s producerTransports count=%d', this.name, Object.keys(this.producerTransports).length);
  }

  removeProducerTransport(id) {
    delete this.producerTransports[id];
    console.log('room=%s producerTransports count=%d', this.name, Object.keys(this.producerTransports).length);
  }

  getProducer(id, label) {
    if (label === 'chat') {
      return this.messageProducers[id];
    }else {
      console.warn('ROOM UNKNOWN producer label=' + label);
    }
  }

  getRemoteIds(clientId, label) {
    let remoteIds = [];
    if (label === 'chat') {
      for (const key in this.messageProducers) {
        if (key !== clientId) {
          remoteIds.push(key);
        }
      }
    }
    return remoteIds;
  }

  addProducer(id, producer, label) {
    if (label === 'chat') {
      this.messageProducers[id] = producer;
      console.log('room=%s messageProducers count=%d', this.name, Object.keys(this.messageProducers).length);
    }else {
      console.warn('ROOM addProducer UNKNOWN producer label=' + label);
    }
  }

  removeProducer(id, label) {
    if (label === 'chat') {
      delete this.messageProducers[id];
      console.log('messageProducers count=' + Object.keys(this.messageProducers).length);
    }else {
      console.warn('ROOM UNKNOWN producer label=' + label);
    }
  }

  getConsumerTrasnport(id) {
    return this.consumerTransports[id];
  }

  addConsumerTrasport(id, transport) {
    this.consumerTransports[id] = transport;
    console.log('room=%s add consumerTransports count=%d', this.name, Object.keys(this.consumerTransports).length);
  }

  removeConsumerTransport(id) {
    delete this.consumerTransports[id];
    console.log('room=%s remove consumerTransports count=%d', this.name, Object.keys(this.consumerTransports).length);
  }

  getConsumerSet(localId, label) {
    if (label === 'chat') {
      return this.messageConsumerSets[localId];
    }else {
      console.warn('WARN: getConsumerSet() UNKNWON label=%s', label);
    }
  }

  addConsumerSet(localId, set, label) {
    if (label === 'chat') {
      this.messageConsumerSets[localId] = set;
    } else {
      console.warn('WARN: addConsumerSet() UNKNWON label=%s', label);
    }
  }

  removeConsumerSetDeep(localId) {
    const messageSet = this.getConsumerSet(localId, 'chat');
    delete this.messageConsumerSets[localId];
    if (messageSet) {
      for (const key in messageSet) {
        const consumer = messageSet[key];
        consumer.close();
        delete messageSet[key];
      }

      console.log('room=%s removeConsumerSetDeep message consumers count=%d', this.name, Object.keys(messageSet).length);
    }
  }

  getConsumer(localId, remoteId, label) {
    const set = this.getConsumerSet(localId, label);
    if (set) {
      return set[remoteId];
    }
    else {
      return null;
    }
  }


  addConsumer(localId, remoteId, consumer, label) {
    const set = this.getConsumerSet(localId, label);
    if (set) {
      set[remoteId] = consumer;
      console.log('room=%s consumers label=%s count=%d', this.name, label, Object.keys(set).length);
    }
    else {
      console.log('room=%s new set for label=%s, localId=%s', this.name, label, localId);
      const newSet = {};
      newSet[remoteId] = consumer;
      this.addConsumerSet(localId, newSet, label);
      console.log('room=%s consumers label=%s count=%d', this.name, label, Object.keys(newSet).length);
    }
  }

  removeConsumer(localId, remoteId, label) {
    const set = this.getConsumerSet(localId, label);
    if (set) {
      delete set[remoteId];
      console.log('room=%s consumers label=%s count=%d', this.name, label, Object.keys(set).length);
    }
    else {
      console.log('NO set for room=%s label=%s, localId=%s', this.name, label, localId);
    }
  }

  // --- static methtod ---
  static staticInit() {
    rooms = {};
  }

  static addRoom(room, name) {
    Room.rooms[name] = room;
    console.log('static addRoom. name=%s', room.name);
    //console.log('static addRoom. name=%s, rooms:%O', room.name, room);
  }

  static getRoom(name) {
    return Room.rooms[name];
  }

  static removeRoom(name) {
    delete Room.rooms[name];
  }
}

// -- static member --
Room.rooms = {};

// --- default room ---
let defaultRoom = null;

//==============================================================================================//
//==============================================================================================//
//==============================================================================================//

const mediasoup = require('mediasoup')
const mediasoupOptions = {
  // Worker settings
  worker: {
    rtcMinPort: 24000,
    rtcMaxPort: 24999,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
  },
  // WebRtcTransport settings
  webRtcTransport: {
    listenIps: [
      { ip: '0.0.0.0', announcedIp: 'webrtc.smu20202.boidacarapreta.cc' }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    enableSctp: true,
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
    //appData: { producing, consuming, sctpCapabilities },
  }
};

let worker = null;
//let router = null;

async function startWorker() {
  worker = await mediasoup.createWorker(mediasoupOptions.worker);
  //router = await worker.createRouter( { appData: { info: 'message-data-producer' } });
  //router = await worker.createRouter();
  defaultRoom = await setupRoom('_default_room');
  console.log('-- mediasoup worker start. -- room:', defaultRoom.name);
}

startWorker();


function getProducerTrasnport(roomname,id) {
  if (roomname) {
    console.log('=== getProducerTrasnport use room=%s ===', roomname);
    const room = Room.getRoom(roomname);
    return room.getProducerTrasnport(id);
  }
  else {
    console.log('=== getProducerTrasnport use defaultRoom room=%s ===', roomname);
    return defaultRoom.getProducerTrasnport(id);
  }
}

function addProducerTrasport(roomname,id, transport) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.addProducerTrasport(id, transport);
    console.log('=== addProducerTrasport use room=%s ===', roomname);
  }
  else {
    defaultRoom.addProducerTrasport(id, transport);
    console.log('=== addProducerTrasport use defaultRoom room=%s ===', roomname);
  }
}

function removeProducerTransport(roomname,id) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.removeProducerTransport(id);
  }
  else {
    defaultRoom.removeProducerTransport(id);
  }
}

function getProducer(roomname, id, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    return room.getProducer(id, label);
  }
  else {
    return defaultRoom.getProducer(id, label);
  }
}


function getRemoteIds(roomname, clientId, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    return room.getRemoteIds(clientId, label);
  }
  else {
    return defaultRoom.getRemoteIds(clientId, label);
  }
}




function addProducer(roomname,id, producer, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.addProducer(id, producer, label);
    console.log('=== addProducer use room=%s ===', roomname);
  }
  else {
    defaultRoom.addProducer(id, producer, label);
    console.log('=== addProducer use defaultRoom room=%s ===', roomname);
  }
}

function removeProducer(roomname, id, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.removeProducer(id, label);
  }
  else {
    defaultRoom.removeProducer(id, label);
  }
}


// --- multi-consumers --
//let consumerTransports = {};
// /let messageConsumers = {};

function getConsumerTrasnport(roomname,id) {
  if (roomname) {
    console.log('=== getConsumerTrasnport use room=%s ===', roomname);
    const room = Room.getRoom(roomname);
    return room.getConsumerTrasnport(id);
  }
  else {
    console.log('=== getConsumerTrasnport use defaultRoom room=%s ===', roomname);
    return defaultRoom.getConsumerTrasnport(id);
  }
}

function addConsumerTrasport(roomname, id, transport) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.addConsumerTrasport(id, transport);
    console.log('=== addConsumerTrasport use room=%s ===', roomname);
  }
  else {
    defaultRoom.addConsumerTrasport(id, transport);
    console.log('=== addConsumerTrasport use defaultRoom room=%s ===', roomname);
  }
}

function removeConsumerTransport(roomname, id) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.removeConsumerTransport(id);
  }
  else {
    defaultRoom.removeConsumerTransport(id);
  }
}


function getConsumer(roomname, localId, remoteId, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    return room.getConsumer(localId, remoteId, label);
  }
  else {
    return defaultRoom.getConsumer(localId, remoteId, label);
  }
}

function addConsumer(roomname, localId, remoteId, consumer, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.addConsumer(localId, remoteId, consumer, label);
    console.log('=== addConsumer use room=%s ===', roomname);
  }
  else {
    defaultRoom.addConsumer(localId, remoteId, consumer, label);
    console.log('=== addConsumer use defaultRoom room=%s ===', roomname);
  }
}

function removeConsumer(roomname, localId, remoteId, label) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.removeConsumer(localId, remoteId, label);
  }
  else {
    defaultRoom.removeConsumer(localId, remoteId, label);
  }
}

function removeConsumerSetDeep(roomname, localId) {
  if (roomname) {
    const room = Room.getRoom(roomname);
    room.removeConsumerSetDeep(localId);
  }
  else {
    defaultRoom.removeConsumerSetDeep(localId);
  }
}

async function createConsumer(roomname, transport, producer, sctpStreamParameters) {
  let router = null;
  if (roomname) {
    const room = Room.getRoom(roomname);
    router = room.router;
  }
  else {
    router = defaultRoom.router;
  }


  /*if (!router.canConsume(
    {
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    console.error('can not consume');
    return;
  }*/

  let consumer = null;
  
  consumer = await transport.consumeData({ // OK
    producerId            : producer.id,
    dataProducerId        : producer.id,
    sctpStreamParameters,
    label                 : producer.label,
    //paused                : producer.label === 'chat',
  }).catch(err => {
    console.error('consume failed', err);
    return;
  });

  //console.log('consumer.label ===== ',consumer.label)

  return {
    consumer: consumer,
    params: {
      producerId          : producer.id,
      dataProducerId      : producer.id,
      id                  : consumer.id,
      label               : consumer.label,
      sctpStreamParameters: consumer.sctpStreamParameters,
      type                : consumer.type,
      producerPaused      : consumer.producerPaused
    }
  };
}

//=============================================================================================//
//============================ REFERENTE AO TRANSPORTE ========================================//
//=============================================================================================//


async function createTransport(roomname) {
  let router = null;
  if (roomname) {
    const room = Room.getRoom(roomname);
    router = room.router;
  }
  else {
    router = defaultRoom.router;
  }
  const transport = await router.createWebRtcTransport(mediasoupOptions.webRtcTransport);
  console.log('-- create transport room=%s id=%s', roomname, transport.id);

  return {
    transport: transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
      sctpCapabilities: transport.sctpCapabilities,
      rtpCapabilities: transport.rtpCapabilities
    }
  };
}





//============================= INICIA SERVIDOR ====================================================//
const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Servidor Express escutando na porta ${port}`)
})
