goInterval = null;

masterPong = false;
pongRunning = false;
pongStarted = false;

var config = {
    type: Phaser.AUTO,
    width: 600,
    height: 350,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var gameOver = false;
var paddle1;
var paddle2;
var ball;

var ball_launched;
var ball_vel;
var comandoTeclado;

var score=0;
var TimeA = {score};
var TimeB = {score};

function preload ()
{
    this.load.image('paddle', 'assets/paddle.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.bitmapFont('font','assets/font.png','assets/font.xml');
}

function create ()
{
    //iMAGEM DE FUNDO DO JOGO
	//this.add.image(400, 300, 'sky');

    ball_launched = false;
    ball_vel = 400;

    // O PONG E COLISAO NO CENARIO
    //paddle1 = createPaddle(0,300,this);
    //paddle2 = createPaddle(800,300,this);
    paddle1 = createPaddle(0,game.config.height/2,this);
    paddle2 = createPaddle(game.config.width,game.config.height/2,this);

    // CRIA A BOLA DO JOGO
    ball = createBall(game.config.width/2,game.config.height/2,this);

    // LANÇA A BOLA ASSIM QUE O TECLADO É PRESSIONADO;
    //this.input.keyboard.on('keydown_W', launchBall, this);

    TimeA.score = 0;
    TimeB.score = 0;
}

function update ()
{
    
    //  Input Events
    comandoTeclado = this.input.keyboard.createCursorKeys();
    controlPaddle(paddle1,comandoTeclado);

    //  Colisão entre os paddles e bola
    this.physics.add.collider(paddle1, ball);
    this.physics.add.collider(paddle2, ball);

    if(ball.body.blocked.left){
        console.log('Time 2 Marcou!');
        newPoint(TimeB);
        sendNewScore();
    } else if(ball.body.blocked.right){
        console.log('Time 1 Marcou!');
        newPoint(TimeA);
        sendNewScore();
    }

    //VERIFICA SE REALIZOU 5 PONTOS E FINALIZA O JOGO
    if(TimeA_text.text==5 || TimeB_text.text==5){
        gameOver = true;
        //this.add.bitmapText(150, 400, 'font', 'Fim de Jogo', 64);
        this.add.bitmapText(game.config.height/4, game.config.width/2, 'font', 'Fim de Jogo', 50);
        console.log('Foi para o Gameover');
    }

    if(gameOver){
        console.log('GAME OVER');
        this.scene.pause();
        console.log('GAME OVER1');
    }

    // REALIZANDO O SEGUNDO JOGADOR IA
    paddle2.body.velocity.setTo(ball.body.velocity.y);
    paddle2.body.velocity.x = 0;
    paddle2.body.maxVelocity.y = 250;
 
}

function sendNewScore (){
    var objToSend = {
        'type': 'update_score',
        'content': {'you': TimeB.score, 'me': TimeA.score}
    }
    sendChannel.send(JSON.stringify(objToSend));
}

function updateScore(msg) {
    pongRunning = false;
    if (msg.content.you > TimeA.score){
       newPoint(TimeA);
    }else if (msg.content.me > TimeB.score){
       newPoint(TimeB);
    }
}

function newPoint(player) {
    masterPong = !masterPong;
    newIntervalGo(3);
    //player scores
    player.score += 1;
    $('#localScore').html(TimeA.score);
    $('#remoteScore').html(TimeB.score);
    resetPosBall();
}
//----------------- FUNCOES EXTRAS -------------------------/

function createPaddle (x,y,t){
    //var newpaddle = game.add.sprite(x,y, 'paddle');
    var paddle = t.physics.add.sprite(x, y, 'paddle');
    paddle.setCollideWorldBounds(true);
    paddle.body.immovable = true;
    paddle.setScale(.5);
    //paddle.scale.setTo(0.5,0.5);
    
    return paddle;
}

function createBall(x,y,t){
    var ball = t.physics.add.sprite(x, y, 'ball');
    ball.setBounce(1,1);
    ball.setCollideWorldBounds(true);
    ball.setScale(.5);

    return ball;
}

function controlPaddle (paddleControlado,comandoTeclado){
    if (comandoTeclado.up.isDown)
    {
        paddleControlado.setVelocityY(-400);
    }
    else if (comandoTeclado.down.isDown)
    {
        paddleControlado.setVelocityY(400);
    }
    else
    {
        paddleControlado.setVelocityY(0);
    }
}

function launchBall(){
    if(ball_launched){
        //ball.x = game.centerX;
        //ball.y = game.centerY;
        //console.log("story", game.config.width, "story");
        ball.x = game.config.width/2;
        ball.y = game.config.height/2;
        ball.body.velocity.setTo(0,0);
        ball_launched = false;
    }else{
        ball.body.velocity.x = -ball_vel;
        ball.body.velocity.y = ball_vel;
        ball_launched = true;
    }
}

function resetPosBall() {
    ball.x = game.config.width/2;
    ball.y = game.config.height/2;
    ball.body.velocity.setTo(0,0);
    ball_launched = false;
}

//========================================================================================================//
//================================FUNCOES NOVAS PARA CONTROLE DO GAME=====================================//
//========================================================================================================//




function updateStatusPong(msg) {
    /*if (!masterPong && msg.disk){
        disk.posX = -msg.disk.x;
        disk.posY = msg.disk.y;
        if (Math.abs(disk.posX) === 5.40000000001)
            iluminateDisk();
    }
    playerB.posY = msg.player.y;
    playerB.color = msg.player.color;
    */
}

function newIntervalGo(timeLeft) {
    if (goInterval) clearInterval(goInterval);
    goInterval = setInterval(function () {
        if (timeLeft > 0){
            $('#displayTime').html(timeLeft);
        } else {
            clearInterval(goInterval);
            goInterval = null;
            $('#displayTime').html('GO!');
            launchBall()
            if (pongStarted)
                pongRunning = true;
        }
        timeLeft--;
    }, 500);
}

function stopGame() {
    console.log('Stop Game')

    masterPong = false;
    pongRunning = false;
    pongStarted = false;

    TimeA.score = 0;
    TimeB.score = 0;

    paddle2.x = game.config.width;
    paddle2.y = game.config.height/2;
    
    clearInterval(goInterval);
    $('#displayTime').html('Wait');
    $('#localScore').html('0');
    $('#remoteScore').html('0');

    resetPosBall()
}