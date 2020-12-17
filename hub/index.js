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
            let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
            console.log('CONNECTED: ' + sock_addr);
            me.log_write(sock, '\nSERVER CONNECTED: ' + sock_addr)
            me.sockets.push(sock);
            sock.on('data', function (data) {
                let json_data = {};
                try {
                    json_data = JSON.parse(data);
                } catch (e) {
                    json_data.error = "not json";
                }
                try {
                    me.log_write(sock, '\nSERVER RECEIVED FROM: ' + sock_addr + ' DATA: ' + data)
                    if (json_data.auth && json_data.auth.id) {
                        me.receive_auth(json_data, sock);
                    } else if (json_data.token) {
                        let check_res = me.check_token(sock, json_data.token);
                        if (check_res) {
                            if (json_data.data) {
                                me.receive_data(json_data, sock);
                            }
                        }
                    } else {
                        let s_json_data = {};
                        s_json_data.message = "no valid";
                        s_json_data.status = "error";
                        let send_data = JSON.stringify(s_json_data);
                        me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
                        sock.write(send_data);
                    }
                    me.add_interval(sock);
                } catch (e) {
                    console.log(e)
                }
            });
            sock.on('close', function (data) {
                me.clear_sock_interval(sock);
                if (sock.id && sock.token) {
                    me.store.push_disconnect_date(sock_addr);
                }
                let index = me.sockets.findIndex(function (o) {
                    return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
                })
                if (index !== -1) me.sockets.splice(index, 1);
                me.log_write(sock, '\nSERVER CLOSED: ' + sock_addr);
            });
        });
    }
    receive_auth(json_data, sock) {
        let me = this;
        let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
        me.db.are_hub_exist(json_data.auth.id, (exist, res) => {
            if (exist) {
                sock.hub_name = res.name;
                sock.hub_code = res.code_hub;
                me.store.push_hub_list(json_data.auth.id, sock_addr, res);
                sock.token = shortid.generate();
                sock.id = json_data.auth.id;
                me.store.set_hub_token(json_data.auth.id, sock.token);
                let send_data = JSON.stringify({ token: sock.token, status: "ok" });
                me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
                sock.write(send_data);
            } else {
                json_data.message = "hub not exist in db";
                json_data.status = "error";
                let send_data = JSON.stringify(json_data);
                me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
                sock.write(send_data);
            }
        })
    }
    receive_data(data, sock) {
        let me = this;
        let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
        let json_data = {};
        json_data.status = "ok";
        json_data.message = "data received";
        let send_data = JSON.stringify(json_data);
        me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
        sock.write(send_data);
    }
    check_token(sock, token) {
        let me = this;
        let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
        if (!sock.token) {
            let json_data = {};
            json_data.status = "error";
            json_data.message = "need auth";
            let send_data = JSON.stringify(json_data);
            me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
            sock.write(send_data);
            return false;
        } else {
            if (sock.token == token) {
                me.store.set_hub_status(sock.id, true);
                return true;
            } else {
                sock.token = undefined;
                me.store.set_hub_status(sock.id, false);
                me.store.pop_hub_list(sock_addr);
                let json_data = {};
                json_data.error = "invalid token";
                json_data.status = "error";
                json_data.message = "need auth";
                let send_data = JSON.stringify(json_data);
                me.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + send_data);
                sock.write(send_data);
                return false;
            }
        }
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
            let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
            this.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + message);
            sock.write(message);
        });
    }
    send_by_address(message, address) {
        let sock = this.get_sock_by_address(address);
        if (sock) {
            let sock_addr = sock.remoteAddress + ':' + sock.remotePort;
            this.log_write(sock, '\nSERVER SEND TO: ' + sock_addr + ' DATA: ' + message);
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
            this.log_write(sock, '\nSERVER SEND TO: ' + sock.remoteAddress + ':' + sock.remotePort + ' DATA: ' + message);
            sock.write(message);
        }, 10000)
        this.ping_intervals[addr].interval = inter;
        this.ping_intervals[addr].count = 0;
    }
    clear_sock_interval(sock) {
        let addr = sock.remoteAddress + ':' + sock.remotePort;
        if (this.ping_intervals[addr] && this.ping_intervals[addr].interval) {
            clearInterval(this.ping_intervals[addr].interval);
            delete this.ping_intervals[addr];
        }

    }
    log_write(sock, message) {
        let addr = sock.remoteAddress + '-' + sock.remotePort;
        fs.appendFileSync(path.join(__dirname, '../logs/all.txt'), message);
        fs.appendFileSync(path.join(__dirname, `../logs/${addr}.txt`), message);
    }
}
