async function createProdutor(){
          
    const data = await sendRequest('getRouterRtpCapabilities', {});
    await loadDevice(data);

    // Create a transport in the server for sending our media through it.
    console.log('--- createProducerTransport --');
    const params = await sendRequest('createProducerTransport', {});
    console.log('transport params:', params);
    const sendTransport = device.createSendTransport(params);
    console.log('createSendTransport:', sendTransport);

    // --- join & start publish --
    sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      console.log('--transport producer connect');
      sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
        .then(callback)
        .catch(errback);
    });

    sendTransport.on('connectionstatechange', (state) => {
      console.log('Estado do produtor mudou: ', state);
    });

    // Set transport "producedata" event handler.
    sendTransport.on('producedata', async ({ rtpParameters, label, protocol, appData }, callback, errback) =>{
        console.log('--transport produce');
          try {
            const { id } = await sendRequest('producedata', {
              transportId: sendTransport.id,
              label,
              protocol,
              appData,
              rtpParameters,
            });
            sendResponse({ id}, callback);
            //callback({ id });
            console.log('--produce requested, then subscribe ---');
            subscribe();
          } catch (err) {
            errback(err);
          }
      });

    // Produce data (DataChannel).
    //const dataProducer = await sendTransport.produceData({ ordered: true, label: 'foo' });
    //const dataProducer = await sendTransport.produceData();
}

//=========================================================================================================//
//======================================= CONSUMIDOR ======================================================//
//=========================================================================================================//
  

//============================== FUNCOES AUXILIARES ===============================================//

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

  async function loadDevice(routerRtpCapabilities) {
      device = new MediasoupClient.Device();
      await device.load({ routerRtpCapabilities });
  }