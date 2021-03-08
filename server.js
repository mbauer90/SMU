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
    const numberOfClients = roomClients.length

    console.log(`Chegou o join do user ${loginDetails.userName}`)
    // These events are emitted only to the sender socket.

    if (numberOfClients == 0) {
      console.log(`Criando sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_created`)
      
      loginDetails.isRoomCreator = true //Seta como criador da sala
      loginDetails.idSocket = socket.id
      loginDetails.numberOfClients = numberOfClients+1
      loginDetails.posClient = numberOfClients+1
      Clients.push(loginDetails)
      console.log(Clients)

      socket.join(loginDetails.roomId)
      socket.emit('room_created', loginDetails)

    } else if (numberOfClients <= 3) {
      console.log(`Entrou na sala ${loginDetails.roomId}, o user ${loginDetails.userName} emitiu room_joined`)

      loginDetails.isRoomCreator = false
      loginDetails.idSocket = socket.id
      loginDetails.numberOfClients = numberOfClients+1
      loginDetails.posClient = numberOfClients+1
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
      cleanUpPeer(socket);

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
        cleanUpPeer(socket);

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
      socket.broadcast.to(loginDetails.roomId).emit('enter_call',Clients.length)
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
      console.log('connectProducerTransport by socket ', socket.id);
      const transport = getProducerTrasnport(socket.id);
      await transport.connect({ dtlsParameters: data.dtlsParameters, sctpParameters: data.sctpParameters });
      sendResponse({}, callback);
    });   

    socket.on('producedata', async (data, callback) => {
      const sctpStreamParameters  = data;

      const id = socket.id;
      const transport = getProducerTrasnport(id);

      if (!transport) {
        console.error('transport NOT EXIST for id=' + id);
        return;
      }

      const producer = await transport.produceData(sctpStreamParameters);

      addProducer(id, producer);
      producer.observer.on('close', () => {
        console.log('producer closed');
      })

      sendResponse({ id: producer.id }, callback);
      console.log('--- Broadcast newProducer ---');
      socket.broadcast.to(data.loginDetails.roomId).emit('newProducer', { socketId: id, producerId: producer.id, label: 'chat' })
    });

//=============================================================================================//
//=========================== CONSUMIDOR ======================================================//
//=============================================================================================//
// --- consumer ----
  socket.on('createConsumerTransport', async (data, callback) => {
    console.log('--- createConsumerTransport --- id=' + socket.id);
    const { transport, params } = await createTransport();
    addConsumerTrasport(socket.id, transport);
    
    transport.observer.on('close', () => {
      const localId = socket.id;
      removeConsumerSetDeep(localId);
      removeConsumerTransport(id);
    });

    sendResponse(params, callback);
  });

  socket.on('connectConsumerTransport', async (data, callback) => {
    console.log('-- connectConsumerTransport -- id=' + socket.id);
    let transport = getConsumerTrasnport(socket.id);
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
  const clientId = data.clientId;
  console.log('-- getCurrentProducers for clientId=' + clientId);

  const remoteChatIds = getRemoteIds(clientId, 'chat');
  console.log('-- remoteChatIds:', remoteChatIds);

  sendResponse({ remoteChatIds: remoteChatIds }, callback);
});


socket.on('consumeAdd', async (data, callback) => {
    const localId = socket.id;
    const label = data.label;
    const sctpStreamParameters = data.sctpStreamParameters;
    const remoteId = data.remoteId;
    let transport = getConsumerTrasnport(localId);

    if (!transport) {
      console.error('transport NOT EXIST for id=' + localId);
      return;
    }

    const producer = getProducer(remoteId, label);

    if (!producer) {
      console.error('producer NOT EXIST for remoteId=%s label=%s', remoteId, label);
      return;
    }

    console.log('-- consumeAdd -- localId=%s label=%s', localId, label);
    console.log('-- consumeAdd2 - localId=' + localId + ' remoteId=' + remoteId + ' label=' + label + ' producer.id =' + producer.id);
    
    const { consumer, params } = await createConsumer(transport, producer, sctpStreamParameters); // producer must exist before consume
    
    addConsumer(localId, remoteId, consumer, label); // TODO: comination of  local/remote id
    console.log('addConsumer localId=%s, remoteId=%s, label=%s', localId, remoteId, label);
    
      consumer.observer.on('close', () => {
        console.log('consumer closed ---');
      })

      consumer.on('dataproducerclose', () => {
        console.log('consumer -- on.dataproducerclose');
        
        // -- notifica o cliente ---
        socket.emit('dataproducerclose', { localId: localId, remoteId: remoteId, label: label });
        
        removeConsumer(localId, remoteId, label);
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
  
    function sendback(socket, message) {
      socket.emit('message', message);
    }

//==============================================================================================//
//======================================= FUNCOES EXTRAS =======================================//
//==============================================================================================//


function getRemoteIds(clientId, label) {
  let remoteIds = [];
    for (const key in messageProducers) {
      if (key !== clientId) {
        remoteIds.push(key);
      }
    }
  
  return remoteIds;
}

function getProducer(id, label) {
  if (label === 'chat') {
    return messageProducers[id];
  } else {
    console.warn('UNKNOWN producer label=' + label);
  }
}

//==============================================================================================//
//==============================================================================================//
//==============================================================================================//

const mediasoup = require('mediasoup')
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
    enableSctp: true,
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
    //appData: { producing, consuming, sctpCapabilities },
  }
};

let worker = null;
let router = null;

async function startWorker() {
  worker = await mediasoup.createWorker();
  //router = await worker.createRouter( { appData: { info: 'message-data-producer' } });
  router = await worker.createRouter();
  console.log('-- mediasoup worker start. --')
}

startWorker();

// --- multi-producers --
let producerTransports = {};
let messageProducers = {};

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


function addProducer(id, producer, label) {
  if (producer) {
    messageProducers[id] = producer;
  }else {
    console.warn('Producer desconhecido');
  }
}

function removeProducer(id, label) {
  if (label === 'chat') {
    delete messageProducers[id];
    console.log('messageProducers count=' + Object.keys(messageProducers).length);
  } else {
    console.warn('UNKNOWN producer label=' + label);
  }
}


// --- multi-consumers --
let consumerTransports = {};
let messageConsumers = {};

function getConsumerTrasnport(id) {
  return consumerTransports[id];
}

function addConsumerTrasport(id, transport) {
  consumerTransports[id] = transport;
  console.log('consumerTransports count=' + Object.keys(consumerTransports).length);
}

function removeConsumerTransport(id) {
  delete consumerTransports[id];
  console.log('consumerTransports count=' + Object.keys(consumerTransports).length);
}


function removeConsumer(localId, remoteId, label) {
  const set = getConsumerSet(localId, label);
  if (set) {
    delete set[remoteId];
    console.log('consumers label=%s count=%d', label, Object.keys(set).length);
  }
  else {
    console.log('NO set for label=%s, localId=%s', label, localId);
  }
}

async function createConsumer(transport, producer, sctpStreamParameters) {
  let consumer = null;
  /*if (!router.canConsume({ producerId: producer.id, rtpCapabilities})) {
    console.error('can not consume');
    return;
  }*/
  
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

  //consumer.kind = producer.kind
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


function getConsumerSet(localId, label) {
  if (label === 'chat') {
    return messageConsumers[localId];
  }else {
    console.warn('WARN: getConsumerSet() UNKNWON label=%s', label);
  }
}

function getConsumer(localId, remoteId, label) {
  const set = getConsumerSet(localId, label);
  if (set) {
    return set[remoteId];
  }
  else {
    return null;
  }
}

function addConsumerSet(localId, set, label) {
  if (label === 'chat') {
    messageConsumers[localId] = set;
  }else {
    console.warn('WARN: addConsumerSet() UNKNWON label=%s', label);
  }
}

function addConsumer(localId, remoteId, consumer, label) {
  const set = getConsumerSet(localId, label);
  if (set) {
    set[remoteId] = consumer;
    console.log('consumers label=%s count=%d', label, Object.keys(set).length);
  }
  else {
    console.log('new set for label=%s, localId=%s', label, localId);
    const newSet = {};
    newSet[remoteId] = consumer;
    addConsumerSet(localId, newSet, label);
    console.log('consumers label=%s count=%d', label, Object.keys(newSet).length);
  }
}

function removeConsumerSetDeep(localId) {
  const set = getConsumerSet(localId, 'chat');
  delete messageConsumers[localId];
  if (set) {
    for (const key in set) {
      const consumer = set[key];
      consumer.close();
      delete set[key];
    }

    console.log('removeConsumerSetDeep message consumers count=' + Object.keys(set).length);
  }
}


function cleanUpPeer(socket) {
  const id = socket.id;
  removeConsumerSetDeep(id);

  const transport = getConsumerTrasnport(id);
  if (transport) {
    transport.close();
    removeConsumerTransport(id);
  }

  const messageProducer = getProducer(id, 'chat');
  if (messageProducer) {
    messageProducer.close();
    removeProducer(id, 'chat');
  }

  const producerTransport = getProducerTrasnport(id);
  if (producerTransport) {
    producerTransport.close();
    removeProducerTransport(id);
  }
}

//=============================================================================================//
//============================ REFERENTE AO TRANSPORTE ========================================//
//=============================================================================================//


async function createTransport() {
  const transport = await router.createWebRtcTransport(mediasoupOptions.webRtcTransport);
  console.log('-- create transport id=' + transport.id);

  //console.log('----- transport.sctpParameters -------- ', transport.sctpParameters)

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