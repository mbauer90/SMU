# PROJETO JOGO PONG + WEBRTC

DISCIPLINA SISTEMAS MULTIMIDA
ENGENHARIA DE TELECOMUNICACOES IFSC SJ

Para as especificações do protocolo de sinalização e demais documentos acessar a pasta documents

Alterar os parâmetros IP e annoucedIp no arquivo server.js
  { ip: '127.0.0.1', announcedIp: null }

Para utilizar executar os seguintes comandos

#npm install

#npm run build-client

#npm start

O servidor ficará ativo na porta https://localhost:3000

Observaçoes:
- ChatBox funciona com até 4 peers;
- Jogo funcionando com até 4 jogadores, os elementos foram alterados para atender este requisito;
- No caso de nova conexão ou desconexão o jogo reinicia, iniciando a contagem para lançamento da bola;
- Aceitando a criação de Salas separadas, sendo necessario uma classe Room que possui a criacao de produtores e consumidores, em routers especificos
- Realizado alguns testes;
- Funcionando apenas no navegador Google Chrome;
- Navegador Firefox funciona em rede local, porém ao disponibilizar ao público ocorre erro no STUN;
