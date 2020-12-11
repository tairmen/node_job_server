const config = require('config');
const port = config.get('app.port');
const FrontSocket = require('./ws');
const HubSocket = require("./hub/index");
let TcpClient = require("./hub/client")
let express = require('express');

let app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' })
});

let server = app.listen(port, () => {
    console.log(`Express listening on port: ${port}`);
});

let front_ws = new FrontSocket(server);

let hub_socket = new HubSocket();
hub_socket.listen();

// createSocketClientApi();

let clients = [];

app.get('/create_socket_client', (req, res) => {
    let tcp = new TcpClient();
    let address = tcp.client.address().address;
    res.send({ address: address });
    clients.push(tcp);
});

app.post('/socket_send', (req, res) => {
    let data = req.body;
    clients[0].send(data);
    res.send('sended');
});