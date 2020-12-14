const config = require('config');
const port = config.get('app.port');
const FrontSocket = require('./ws');
const HubSocket = require("./hub/index");
let TcpClient = require("./hub/client")
let express = require('express');
const fs = require('fs');
const path = require('path');
let ALL_FILE = '/logs/all.txt'; 

let app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' })
});

let server = app.listen(port, () => {
    console.log(`Express listening on port: ${port}`);
    fs.writeFileSync(path.join(__dirname, ALL_FILE), "");
});

let front_ws = new FrontSocket(server);

let hub_socket = new HubSocket();
hub_socket.listen();

let clients = [];

function get_client_by_addr(addr) {
    let finded = clients.find(el => {
        return el.getAddr() == addr;
    });
    return finded;
}

app.get('/create_socket_client', (req, res) => {
    let tcp = new TcpClient();
    tcp.connect((address) => {
        res.send({ status: "ok", address: address});
    });
    clients.push(tcp);
});

app.post('/socket_send', (req, res) => {
    let data = req.body.data;
    let addr = req.body.address;
    let cli = get_client_by_addr(addr);
    if (cli) {
        cli.send(data);
        res.send({ status: "ok"});
    } else {
        res.send({ status: "need connect"});
    }
});

app.get('/hub_log', (req, res) => {
    let str_log = fs.readFileSync(path.join(__dirname, ALL_FILE), "utf8");
    res.send({ status: "ok", log: str_log });
});