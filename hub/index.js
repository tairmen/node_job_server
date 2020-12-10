const config = require('config');
const net = require('net');
let express = require('express');
let app = express();
app.use(express.json())

module.exports = class HubSocket {
    constructor() {
        this.server = net.createServer();
        let port = config.get('tcp.port');
        let host = config.get('tcp.host');
        this.server.listen(port, host, () => {
            console.log('TCP Server is running on port ' + port + '.');
        });
        this.sockets = [];
        this.gen_api();
    }
    listen() {
        this.server.on('connection', function (sock) {
            console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
            this.sockets.push(sock);
            sock.on('data', function (data) {
                console.log('DATA ' + sock.remoteAddress + ': ' + data);
                this.sockets.forEach(function (sock, index, array) {
                    sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n');
                });
            });
            sock.on('close', function(data) {
                let index = this.sockets.findIndex(function(o) {
                    return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
                })
                if (index !== -1) this.sockets.splice(index, 1);
                console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
            });
        });
    }
    gen_api(sock) {
        app.post('/auth_hub', (req, res) => {
            let token = req.body.token;
            let id = req.body.id;
        });

        app.post('/send_state', (req, res) => {

        });

    }
}
