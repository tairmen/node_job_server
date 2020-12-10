const config = require('config');
const port = config.get('app.port');
const FrontSocket = require('./ws');
const HubSocket = require("./hub/index");
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
