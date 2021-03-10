async function createProdutor(){
          
    const data = await sendRequest('getRouterRtpCapabilities', {});
    await loadDevice(data);

    // Create a transport in the server for sending our media through it.
    console.log('--- createProducerTransport ---');
    const params = await sendRequest('createProducerTransport', {});
    //console.log('transport params:', params);
    sendTransport = device.createSendTransport(params);
    sendTransport.updateIceServers( iceServers )
    console.log('createSendTransport:', sendTransport);

    // --- join & start publish --
    sendTransport.on('connect', async ({ dtlsParameters, sctpParameters }, callback, errback) => {
      console.log('--transport producer connect');
      sendRequest('connectProducerTransport', { transportId: sendTransport.id, dtlsParameters: dtlsParameters, sctpParameters: sctpParameters })
        .then(callback)
        .catch(errback);
    });


    sendTransport.on('connectionstatechange', (state) => {
      console.log('--- state sendTransport ----' , state);
    });

    // Set transport "producedata" event handler.
    sendTransport.on('producedata', async ({ sctpStreamParameters, label, protocol, appData }, callback, errback) =>{
        console.log('--- transport producedata ---');
          try {
            const { id } = await sendRequest('producedata', {
              loginDetails         : loginDetails,
              transportId          : sendTransport.id,
              sctpStreamParameters,
              label,
              protocol,
              appData,
              label                  : 'chat'
              //appData              : parameters.appData
            });

            callback({ id });
            //sendResponse({ id }, callback);
            console.log('--- canal send requested of producer ---');
            //subscribe();
            createConsumidor();
          } catch (err) {
            errback(err);
          }
      });


    // Produce data (DataChannel).
    messageDataProducer = await sendTransport.produceData({
      ordered: false,
      maxRetransmits: 1,
      label: 'chat',
      priority: 'medium',
      //appData: { info: 'message-data-producer' },
    });
    
}

//=========================================================================================================//
//======================================= CONSUMIDOR ======================================================//
//=========================================================================================================//
async function createConsumidor(){

  if (!socket) {
    await connectSocket().catch(err => {
      console.error(err);
      return;
    });

    // --- prepare transport ---
    const data = await sendRequest('getRouterRtpCapabilities', {});
    //console.log('getRouterRtpCapabilities:', data);
    await loadDevice(data);
  }
    // --- prepare transport ---
    console.log('--- createConsumerTransport --');
    if (!consumerTransport) {
      const params = await sendRequest('createConsumerTransport', {});
      consumerTransport = device.createRecvTransport(params);
      consumerTransport.updateIceServers( iceServers )
      console.log('consumerTransport:', consumerTransport);

    // --- join & start publish --
    consumerTransport.on('connect', async ({ dtlsParameters, sctpParameters }, callback, errback) => {
      console.log('--transport consumer connect');
      sendRequest('connectConsumerTransport', { dtlsParameters: dtlsParameters, sctpParameters: sctpParameters })
        .then(callback)
        .catch(errback);
    });

      consumerTransport.on('connectionstatechange', (state) => {
          console.log('--- state consumerTransport ----' , state);          
      });

      //consumeCurrentProducers(clientId);
      consumeCurrentProducers(socket.id);
      //consumeCurrentProducers(loginDetails.userName);
    }

  async function consumeCurrentProducers(clientId) {
    console.log('-- try consumeAll() --');

    const remoteInfo = await sendRequest('getCurrentProducers', { clientId: clientId })
      .catch(err => {
        console.error('getCurrentProducers ERROR:', err);
        return;
      });

    console.log('remoteInfo:', remoteInfo);
    consumeAll(consumerTransport, remoteInfo.remoteChatIds);
  }
} //FIM DO createConsumidor();
//================================================================================================//
//============================ FUNCOES AUXILIARES CONSUMER =======================================//
//================================================================================================//

function consumeAll(transport, remoteChatIds) {
    console.log('----- consumeAll() -----')
    remoteChatIds.forEach(rId => {
      consumeAdd(transport, rId, null, 'chat');
    });
};

async function consumeAdd(transport, remoteSocketId, prdId, tracklabel) {
    console.log('--- start of consumeAdd -- label=', tracklabel);
    const { sctpCapabilities } = device;

    const data = await sendRequest('consumeAdd', { sctpCapabilities: sctpCapabilities, remoteId: remoteSocketId, label: tracklabel })
      .catch(err => {
        console.error('consumeAdd ERROR:', err);
      });
    const {
      producerId,
      dataProducerId,
      id,
      label,
      sctpStreamParameters,
    } = data;
    if (prdId && (prdId !== producerId)) {
      console.warn('producerID NOT MATCH');
    }

    const consumer = await transport.consumeData({
      id,
      producerId,
      dataProducerId,
      label,
      sctpStreamParameters
    });

    addConsumer(remoteSocketId, consumer, label);
    consumer.remoteId = remoteSocketId;

    consumer.on("transportclose", () => {
      console.log('--- consumer transport closed. remoteId=' + consumer.remoteId);
    });

    consumer.on("dataproducerclose", () => {
      console.log('--- consumer dataproducer closed. remoteId=' + consumer.remoteId);
      consumer.close();
      removeConsumer(remoteId, label);
    });

    consumer.on('trackended', () => {
      console.log('--- consumer trackended. remoteId=' + consumer.remoteId);
    });

    consumer.on('open', () => {
      console.log('--- consumer open. remoteId=' + consumer.remoteId);
      //pongStarted = true;
      //newIntervalGo(5);
      sendBeginGame();
    });

    consumer.on("message", (message) => {
      //console.log("messagem recebida", message);
      handleReceiveMessage(message);
    });

    console.log('--- end of consumeAdd');
}


function addConsumer(id, consumer, label) {
  if (label === 'chat') {
    messageConsumers[id] = consumer;
    console.log('messageConsumers count=' + Object.keys(messageConsumers).length);
    startChatBox();
  }else {
    console.warn('UNKNOWN consumer label=' + label);
  }
}

function removeConsumer(id, label) {
  if (label === 'chat') {
    delete messageConsumers[id];
    console.log('messageConsumers count=' + Object.keys(messageConsumers).length);
  }else {
    console.warn('UNKNOWN consumer label=' + label);
  }

  let tConsumers = Object.keys(messageConsumers).length;
  if(tConsumers == 0){
    stopChatBox();
  }
}

//=================================================================================================//
//============================== FUNCOES AUXILIARES ===============================================//
//=================================================================================================//  

  function sendRequest(type, data) {
    return new Promise((resolve, reject) => {
      socket.emit(type, data, (err, response) => {
        if (!err) {
          // Success response, so pass the mediasoup response to the local Room.
          resolve(response);
        } else {
          reject(err);
        }
      })
    })
  }

  // --- send response to client ---
  function sendResponse(response, callback) {
    //console.log('sendResponse() callback:', callback);
    callback(null, response);
  }

  async function loadDevice(routerRtpCapabilities) {
      device = new MediasoupClient.Device();
      await device.load({ routerRtpCapabilities });
  }

//========================================================================================================//
//===================================== FUNCOES DO DATA CHANNEL ==========================================//
// =======================================================================================================//

function handleReceiveMessage(message) {
  var msg = JSON.parse(message)
  
  //console.log('handleReceiveMessage', msg.type)

    if (msg.type === 'chat_message') {
      updateChatBox(msg)
    } else if (msg.type === 'game_status'){
      updatePosPong(msg) // atualiza posicao da bola e palhetas
    } else if (msg.type === 'begin_game') {
      //pongStarted = true;
      //newIntervalGo(5);
      checkMaster();
    } else if (msg.type === 'GO!') {
      pongStarted = true;
      newIntervalGo(5);
    } else if (msg.type === 'update_score') {
      updateScore(msg)  //atualiza o placar
    } else {
      console.error("Tipo nao definido", msg.type)
    }
  
}