// Free public STUN servers provided by Google.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

// DOM elements.
//const roomSelectionContainer = document.getElementById('room-selection-container')
const userInput = document.getElementById('user-input')
const connectButton = document.getElementById('connect-button')
const stopconnectButton = document.getElementById('stopconnect-button')
const displayGame = document.getElementById('game')

// Chat box
const chat = document.getElementById('chat')
const localText = document.getElementById('localText')
const buttonsendText = document.getElementById('buttonsendText')

// Variables.
const socket = io()

let localStream
let localConnection = null;   // RTCPeerConnection for our "local" connection
let sendChannel = null;       // RTCDataChannel for the local (sender)
let receiveChannel = null;    // RTCDataChannel for the remote (receiver)
let roomId = "SMU"
let userId
let isRoomCreator

let loginDetails={roomId, userId, isRoomCreator} 

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => { joinRoom(userInput.value) })
stopconnectButton.addEventListener('click', () => { leaveinRoom() })
buttonsendText.addEventListener('click', () => { sendMessage() })

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')
  buttonLogin()
  loginDetails.isRoomCreator = true
})

socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')
  buttonLogin()
  loginDetails.isRoomCreator = false
  console.log('Socket send: enter_call')
  socket.emit('enter_call', loginDetails)
})

socket.on('leave_room', async (nisRoomCreator) => {
  console.log('Socket event callback: leave_room')

  if(nisRoomCreator == loginDetails.userId){
    loginDetails.isRoomCreator = true
  }

  socket.emit('ack_leave', loginDetails)

})

socket.on('ack_bye', async () => {
  console.log('Socket event callback: ack_bye')
  loginDetails.isRoomCreator = false
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')
  alert('Sala cheia, tente outra hora')
})
//========================================================================================================//
// ==================================== OFERTA SDP E CHANNEL =============================================//
// =======================================================================================================//

socket.on('enter_call', async () => {
  console.log('Socket event callback: enter_call')

  if (loginDetails.isRoomCreator) {
    localConnection = new RTCPeerConnection(iceServers)
    localConnection.onicecandidate = sendIceCandidate

    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = handleSendChannelStatusChange
    sendChannel.onclose = handleSendChannelStatusChange

    localConnection.ondatachannel = receiveChannelCallback

      let sessionDescription
      try {
        sessionDescription = await localConnection.createOffer()
        localConnection.setLocalDescription(sessionDescription)
      } catch (error) {
        console.error(error)
      }

      console.log('Socket send: offer')
      socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        loginDetails: loginDetails,
      })
  }

})

socket.on('offer', async (event) => {
  console.log('Socket event callback: offer')

  if (!loginDetails.isRoomCreator) {
    localConnection = new RTCPeerConnection(iceServers)
    localConnection.onicecandidate = sendIceCandidate
    localConnection.setRemoteDescription(new RTCSessionDescription(event.sdp))

    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = handleSendChannelStatusChange
    sendChannel.onclose = handleSendChannelStatusChange

    localConnection.ondatachannel = receiveChannelCallback

    let sessionDescription
    try {
      //localConnection.setRemoteDescription(event) //PEGA OS DADOS DO SDP
      sessionDescription = await localConnection.createAnswer() 
      localConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }

    //ACEITA A OFERTA
    console.log('Socket send: ack_offer')
    socket.emit('ack_offer', {
      type: 'ack_offer',
      sdp: sessionDescription,
      loginDetails: loginDetails,
    })
  }

})

socket.on('ack_offer', async (event) => {
  console.log('Socket event callback: ack_offer')
  //localConnection.setRemoteDescription(event)
  localConnection.setRemoteDescription(new RTCSessionDescription(event.sdp))
})

socket.on('ice_candidate', (event) => {
  console.log('Socket event callback: ice_candidate')
  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  localConnection.addIceCandidate(candidate)
})

//========================================================================================================//
// ========================================= FUNCTIONS ===================================================//
//========================================================================================================//

function joinRoom(user) {
  if (user === '') {
    alert('Informe o nome do usuario')
  } else {
    buttonLogin()
    loginDetails.userId = user + (new Date()).getTime()
    console.log('Enviou Join para o servidor') 
    socket.emit('join', loginDetails)
  }
}

function leaveinRoom() {
    buttonLogout()
    socket.emit('bye', loginDetails)
}

function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('ice_candidate', {
      roomId: loginDetails.roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}
//========================================================================================================//
//====================== GERENCIAMENTO DOS BOTÕES E INPUTS ===============================================//
//========================================================================================================//
function buttonLogin(){
  userInput.disabled = true //Desabilita o texto
  connectButton.disabled = true //Desabilita o botão de Entrar
  stopconnectButton.disabled = false  //Habilita o botão de Sair
}

function buttonLogout() {
  // Close the RTCDataChannels if they're open.
  if(sendChannel) { sendChannel.close() }
  if(receiveChannel) { receiveChannel.close() }

  // Close the RTCPeerConnections
  if(localConnection) { localConnection.close() }

  sendChannel = null
  receiveChannel = null
  localConnection = null

  // Update user interface elements
  userInput.disabled = false //Habilita o texto
  connectButton.disabled = false
  stopconnectButton.disabled = true
  buttonsendText.disabled = true

  localText.value = ""
  localText.disabled = true
  chat.innerHTML = ""
  //displayGame.style.display= "none"
  stopGame()
}

//========================================================================================================//
//===================================== FUNCOES DO DATA CHANNEL ==========================================//
// =======================================================================================================//

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.
function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    var state = sendChannel.readyState
    if (state === "open") {
      localText.disabled = false
      localText.focus()
      buttonsendText.disabled = false
      displayGame.style.display= "block" //APARECE O div DO JOGO 
    } else {
      localText.disabled = true
      buttonsendText.disabled = true
      //displayGame.style.display= "none" //DESAPARECE O div DO JOGO 
      stopGame()
    }
  }
}

// Handle status changes on the receiver's channel.
function handleReceiveChannelStatusChange(event) {
  if (receiveChannel) {
    console.log("Receive channel's status has changed to " + receiveChannel.readyState)

    if(receiveChannel.readyState === "open"){
      sendBeginGame() //apos criacao do canal inicia o jogo
    }
  }

  // Here you would do stuff that needs to be done
  // when the channel's status changes.
}

// Called when the connection opens and the data
// channel is ready to be connected to the remote.
function receiveChannelCallback(event) {
  receiveChannel = event.channel
  receiveChannel.onmessage = handleReceiveMessage
  receiveChannel.onopen = handleReceiveChannelStatusChange
  receiveChannel.onclose = handleReceiveChannelStatusChange
}

//================================ ENVIO E RECEPCAO NO DATA CHANNEL ======================================//
//========================================================================================================//

function sendMessage() { 
  if(localText.value != ""){
      var a = loginDetails.userId
      var b = ": "
      var c = a.concat(b)
      var d = localText.value//COLOCA O USER ID NA MESSAGEM
      var e = c.concat(d)
      var f = '\n'
      var message = f.concat(e)
      sendChannel.send(JSON.stringify({
        'type': 'chat_message',
        'content': message
      }));
      
      // Clear the input box and re-focus it, so that we're
      // ready for the next message.
      localText.value = ""
      localText.focus()
      var txt=document.createTextNode(message)
      chat.appendChild(txt)
  }
}

// Handle onmessage events for the receiving channel.
// These are the data messages sent by the sending channel.
function handleReceiveMessage(event) {
  var msg = JSON.parse(event.data)

  //console.log(msg.type)

    if (msg.type === 'chat_message') {
      var linebreak = document.createElement('br')
      var txt=document.createTextNode(msg.content)
      chat.appendChild(linebreak)
      chat.appendChild(txt)
    } else if (msg.type === 'game_status'){
      updatePosPong(msg) // atualiza posicao da bola e palhetas
    } else if (msg.type === 'begin_game') {
      pongStarted = true;
      newIntervalGo(5);
    } else if (msg.type === 'update_score') {
      updateScore(msg)  //atualiza o placar
    } else {
      console.error("Tipo nao definido", msg.type)
    }
  
}

//================================ CONTROLE GAME =========================================================//
//========================================================================================================//
function sendBeginGame() {
  sendChannel.send(JSON.stringify({ 'type': 'begin_game'}))
  pongStarted = true
  checkMaster()
  //newIntervalGo(5)
}

function checkMaster(){ //funcao para verificar o dono da sala, usado para espelhar a bola no jogo.js
  if(loginDetails.isRoomCreator){
    masterPong = true
  } else{
    masterPong = false
  }
}