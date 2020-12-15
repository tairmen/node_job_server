const config = require('config');
const port = config.get('tcp.port');
const host = config.get('tcp.host');
const net = require('net');
const shortid = require('shortid');
const RedisStore = require('../redis');
const MySqlCon = require('../db/mysql');
const fs = require('fs');
const path = require('path');
const { json } = require('express');
const ALL_PATH = '../logs/all.txt';

module.exports = class HubSocket {
    constructor() {
        this.server = net.createServer();
        this.server.listen(port, host, () => {
            console.log('TCP Server is running on port: ' + port);
        });
        this.sockets = [];
        this.store = new RedisStore();
        this.db = new MySqlCon();
        this.ping_intervals = {};
        this.max_quiet = 10;
    }
    listen() {
        let me = this;
        me.server.on('connection', function (sock) {
            console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
            me.log_write(sock, '\nSERVER CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)
            me.sockets.push(sock);
            sock.on('data', function (data) {
                try {
                    let json_data = JSON.parse(data);
                    me.log_write(sock, '\nSERVER RECEIVED FROM: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + data)
                    if (json_data.auth && json_data.auth.id) {
                        me.db.are_hub_exist(json_data.auth.id, (exist, res) => {
                            if (exist) {
                                sock.hub_name = res.name;
                                sock.hub_code = res.code_hub;
                                me.store.push_hub_list(json_data.auth.id);
                                sock.token = shortid.generate();
                                sock.id = json_data.auth.id;
                                me.store.set_hub_token(json_data.auth.id, sock.token);
                                let send_data = JSON.stringify({ token: sock.token });
                                me.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + send_data);
                                sock.write(send_data);
                            } else {
                                json_data.status = "hub not exist in db";
                                let send_data = JSON.stringify(json_data);
                                me.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + send_data);
                                sock.write(send_data);
                            }
                        })
                    } else if (json_data.token) {
                        me.store.set_hub_status(sock.id, true);
                    } else if (json_data.data) {
                        if (sock.token) {
                            json_data.status = "ok";
                            let send_data = JSON.stringify(json_data);
                            me.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + send_data);
                            sock.write(send_data);
                        } else {
                            json_data.status = "need auth";
                            let send_data = JSON.stringify(json_data);
                            me.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + send_data);
                            sock.write(send_data);
                        }
                    } else {
                        json_data.status = "no valid";
                        let send_data = JSON.stringify(json_data);
                        me.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + send_data);
                        sock.write(send_data);
                    }
                    me.add_interval(sock);


                } catch (e) {
                    console.log(e)
                }
            });
            sock.on('close', function (data) {
                clear_sock_interval(sock);
                let index = me.sockets.findIndex(function (o) {
                    return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
                })
                if (index !== -1) me.sockets.splice(index, 1);
                me.log_write(sock , '\nSERVER CLOSED: ' + sock.remoteAddress + ':' + sock.remotePort);
            });
        });
    }
    get_sock_by_address(address) {
        let sock = this.sockets.find(el => {
            let add = el.remoteAddress + ':' + el.remotePort;
            return add == address;
        })
        return sock;
    }
    send_all(message) {
        this.sockets.forEach(function (sock, index, array) {
            this.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + message);
            sock.write(message);
        });
    }
    send_by_address(message, address) {
        let sock = this.get_sock_by_address(address);
        if (sock) {
            this.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + message);
            sock.write(message);
            return "ok";
        } else {
            return "not found";
        }
    }
    add_interval(sock) {
        let addr = sock.remoteAddress + ':' + sock.remotePort;
        if (this.ping_intervals[addr] && this.ping_intervals[addr].interval) {
            clearInterval(this.ping_intervals[addr].interval);
        } else {
            this.ping_intervals[addr] = {};
        }
        let inter = setInterval(() => {
            this.ping_intervals[addr].count += 1;
            let message = `{"ping": ${this.ping_intervals[addr].count}}`;
            this.log_write(sock , '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + message);
            sock.write(message);
        }, 10000)
        this.ping_intervals[addr].interval = inter;
        this.ping_intervals[addr].count = 0;
    }
    clear_sock_interval(sock) {
        let addr = sock.remoteAddress + ':' + sock.remotePort;
        clearInterval(this.ping_intervals[addr].interval);
        delete this.ping_intervals[addr];
    }
    log_write(sock, message) {
        let addr = sock.remoteAddress + '-' + sock.remotePort;
        fs.appendFileSync(path.join(__dirname, '../logs/all.txt'), message);
        fs.appendFileSync(path.join(__dirname, `../logs/${addr}.txt`), message);
    }
}
