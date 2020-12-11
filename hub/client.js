const config = require('config');
const net = require('net');
const port = config.get('tcp.port');
const host = config.get('tcp.host');

module.exports = class TcpClient {
    constructor() {
        let me = this;
        me.client = new net.Socket();
        me.client.connect(port, host, function () {
            console.log('Connected: ' + me.client.address().address);
            me.client.on('data', function (data) {
                console.log(me.client.address().address + ' recieve ' + data);
                let json_data = JSON.parse(data);
                if (json_data.token) {
                    me.client.write(JSON.stringify({
                        token: json_data.token
                    }));
                }
            });
            me.client.on('close', function () {
                console.log('Connection closed: ' + me.client.address().address);
            });
        });
    }
    send(data) {
        this.client.write(JSON.stringify(data));
    }
}

