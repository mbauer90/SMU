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


function updateChatBox(msg){
    var linebreak = document.createElement('br')
    var txt=document.createTextNode(msg.content)
    chat.appendChild(linebreak)
    chat.appendChild(txt)
}

