const config = require('config');
const port = config.get('app.port');
const FrontSocket = require('./ws');
const HubSocket = require("./hub/index");
let TcpClient = require("./hub/client");
const RedisStore = require('./redis');
let express = require('express');
const fs = require('fs');
const path = require('path');
const e = require('express');
let ALL_FILE = 'logs';

let app = express();
app.use(express.json());

let store = new RedisStore();

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' })
});

let server = app.listen(port, () => {
    console.log(`Express listening on port: ${port}`);
    fs.readdir(ALL_FILE, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(ALL_FILE, file), err => {
                if (err) throw err;
            });
        }
    });
    store.delete_all();
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
        res.send({ status: "ok", address: address });
    });
    clients.push(tcp);
});

app.post('/destroy_socket_client', (req, res) => {
    let addr = req.body.address;
    let cli = get_client_by_addr(addr);
    cli.destroy();
    res.send({ status: "ok" });
});

app.post('/socket_send', (req, res) => {
    let data = req.body.data;
    let addr = req.body.address;
    let cli = get_client_by_addr(addr);
    if (cli) {
        cli.send(data);
        res.send({ status: "ok" });
    } else {
        res.send({ status: "need connect" });
    }
});

app.post('/hub_log', (req, res) => {
    let address = req.body.address;
    console.log(address);
    let addresses = [];
    fs.readdirSync(path.join(__dirname, ALL_FILE)).forEach(file => {
        if (file != "all.txt") {
            let addr = file.replace(".txt", "");
            addr = addr.replace("-", ":");
            addresses.push(addr);
        }
    });
    if (!address) {
        let str_log = fs.readFileSync(path.join(__dirname, ALL_FILE + "/all.txt"), "utf8");
        res.send({ status: "ok", log: str_log, addresses: addresses });
    } else {
        let addr = address.replace(':', '-');
        let str_log = fs.readFileSync(path.join(__dirname, ALL_FILE + `/${addr}.txt`), "utf8");
        store.get_authed_hub(address, (data) => {
            let hub = null;
            if (data && data.length > 0) {
                hub = JSON.parse(data[0]);
                if (hub) {
                    delete hub.created_at;
                    delete hub.updated_at;
                    delete hub.status;
                    delete hub.description;
                }
            }
            res.send({ status: "ok", log: str_log, addresses: addresses, hub: hub });
        });
    }


});

app.post('/server_send_all', (req, res) => {
    let data = req.body.data;
    hub_socket.send_all(data);
    res.send({ status: "ok" });
});

app.post('/server_send', (req, res) => {
    let data = req.body.data;
    let addr = req.body.address;
    let st = hub_socket.send_by_address(data, addr);
    res.send({ status: st });
});