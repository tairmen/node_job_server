const config = require('config');
let express = require('express');
let app = express();
app.use(express.json())

module.exports = class FrontSocket {
    constructor(server) {
        this.io = require('socket.io')(server, {
            cors: {
                origin: '*',
            }
        });
        this.io.on('connection', (socket) => {
            console.log("User connected", socket.id);
            socket.on("auth", (user) => {
                console.log("USER", user);
                socket.join(`company_${user.company_id}`);
                socket.join(`user_${user.id}`);
            })
            this.create_api(socket);
            socket.on('disconnect', () => {
                console.log("A user disconnected");
            });
        });
    }
    create_api(socket) {
        app.post('/message', (req, res) => {
            let company = req.body.company_id;
            let user = req.body.user_id;
            let data = {
                msg: req.body.message,
                title: req.body.title
            }
            if (socket) {
                if (company) {
                    socket.to(`company_${company}`).emit('message', data)
                } else if (user) {
                    socket.to(`user_${user}`).emit('message', data)
                } else {
                    socket.broadcast.emit('message', data)
                }
                res.send('Message sended')
            } else {
                res.send('Not connection')
            }
        });

        app.post('/store_reload', (req, res) => {
            let model = req.body.model;
            let models = req.body.models;
            let company = req.body.company_id;
            let user = req.body.user_id;
            if (socket) {
                if (company) {
                    socket.to(`company_${company}`).emit('store_reload', {
                        model: model,
                        models: models,
                    })
                } else if (user) {
                    socket.to(`user_${user}`).emit('store_reload', {
                        model: model,
                        models: models,
                    })
                } else {
                    socket.broadcast.emit('store_reload', {
                        model: model,
                        models: models,
                    })
                }

                res.send('Model reload sended')
            } else {
                res.send('Not connection')
            }
        });
    }
}
