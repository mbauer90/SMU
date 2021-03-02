async function createProdutor(){
    const data = await sendRequest('getRouterRtpCapabilities', {});
    await loadDevice(data);
  
    console.log('--- createProducerTransport --');
    const params = await sendRequest('createProducerTransport', {});
    //console.log('transport params:', params);
    producerTransport = device.createSendTransport(params);
    console.log('createSendTransport:', producerTransport);

    // --- join & start publish --
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      console.log('--transport connect');
      //sendRequest('connectProducerTransport', { dtlsParameters: dtlsParameters })
      //  .then(callback)
      //  .catch(errback);
    });
}

//=========================================================================================================//
//======================================= CONSUMIDOR ======================================================//
//=========================================================================================================//
  
  async function createConsumidor(){
    const data = await sendRequest('getRouterRtpCapabilities', {});
    //console.log('getRouterRtpCapabilities:', data);
    await loadDevice(data);
  
        // --- prepare transport ---
        console.log('--- createConsumerTransport --');
        if (!consumerTransport) {
          const params = await sendRequest('createConsumerTransport', {});
          console.log('transport params:', params);
          consumerTransport = device.createRecvTransport(params);
          console.log('createConsumerTransport:', consumerTransport);
      
          // --- join & start publish --
          consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log('--consumer trasnport connect');
            sendRequest('connectConsumerTransport', { dtlsParameters: dtlsParameters })
              .then(callback)
              .catch(errback);
          });
        }
  }


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
    try {
      device = new MediasoupClient.Device();
    } catch (error) {
      if (error.name === 'UnsupportedError') {
        console.error('browser not supported');
      }
    }
    await device.load({ routerRtpCapabilities });
  }