const config = require('config');
const port = config.get('tcp.port');
const host = config.get('tcp.host');
const net = require('net');
const shortid = require('shortid');
const RedisStore = require('../redis');

module.exports = class HubSocket {
    constructor() {
        this.server = net.createServer();
        this.server.listen(port, host, () => {
            console.log('TCP Server is running on port: ' + port);
        });
        this.sockets = [];
        this.store = new RedisStore();
    }
    listen() {
        let me = this;
        me.server.on('connection', function (sock) {
            console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
            me.sockets.push(sock);
            sock.on('data', function (data) {
                let json_data = JSON.parse(data);
                console.log('DATA ' + sock.remoteAddress + ': ' + data);
                if (json_data.auth && json_data.auth.id) {
                    me.store.push_hub_list(json_data.auth.id);
                    sock.token = shortid.generate();
                    sock.id = json_data.auth.id;
                    me.store.set_hub_token(json_data.auth.id, sock.token);
                    sock.write(JSON.stringify({token: sock.token}));
                }
                if (json_data.token) {
                    me.store.set_hub_status(sock.id, true);
                }
                // me.sockets.forEach(function (sock, index, array) {
                //     sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n');
                // });
            });
            sock.on('close', function (data) {
                let index = me.sockets.findIndex(function (o) {
                    return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
                })
                if (index !== -1) me.sockets.splice(index, 1);
                console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
            });
        });
    }
    get_sock_by_address(address) {
        let sock = this.sockets.find(el => {
            let add = sock.remoteAddress + ':' + sock.remotePort;
            return add == address;
        })
        return sock;
    }
}
