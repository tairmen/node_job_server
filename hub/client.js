const config = require('config');
const net = require('net');
const port = config.get('tcp.port');
const host = config.get('tcp.host');
const fs = require('fs');
const path = require('path');
const ALL_PATH = '../logs/all.txt';

module.exports = class TcpClient {
    constructor() {
        let me = this;
        me.client = new net.Socket();
    }
    connect(callback = () => {}) {
        let me = this;
        me.client.connect(port, host, function () {
            me.address = me.client.address().address + ":" + me.client.address().port;
            fs.appendFileSync(path.join(__dirname, ALL_PATH), '\nClient: ' + me.address + ': connected');
            callback(me.address);
            me.client.on('data', function (data) {
                try {
                    let json_data = JSON.parse(data);
                    fs.appendFileSync(path.join(__dirname, ALL_PATH), '\nClient: ' + me.address + ' received: ' + data);
                    if (json_data.token) {
                        let send_data = JSON.stringify({
                            token: json_data.token
                        });
                        fs.appendFileSync(path.join(__dirname, ALL_PATH), '\nClient: ' + me.address + ' send: ' + send_data);
                        me.client.write(send_data);
                    }
                } catch (e) {
                    console.log(e)
                }


            });
            me.client.on('close', function () {
                fs.appendFileSync(path.join(__dirname, ALL_PATH), '\nClient: ' + me.address + ': closed');
            });
        });
    }
    send(data) {
        fs.appendFileSync(path.join(__dirname, ALL_PATH), '\nClient: ' + this.address + ' send: ' + data);
        this.client.write(data);
    }
    getAddr() {
        return this.address;
    }
    destroy() {
        this.client.destroy();
    }
}

