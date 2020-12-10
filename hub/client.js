const config = require('config');
const net = require('net');
const client = new net.Socket();
const port = config.get('tcp.port');
const host = config.get('tcp.host');

client.connect(port, host, function () {
    console.log('Connected');
    client.write("Hello From Client " + client.address().address);
    client.on('data', function (data) {
        console.log('Server Says : ' + data);
    });
    client.on('close', function () {
        console.log('Connection closed');
    });
});