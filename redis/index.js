const config = require('config');
const e = require('express');
let redis = require("redis");

let client = redis.createClient({
    host: config.get('redis.host'),
    port: config.get('redis.port'),
});
if (config.get('redis.password')) {
    client.auth(config.get('redis.password'))
}
client.on("connect", function () {
    console.log("Connected to Redis");
});

module.exports = class RedisStore {
    constructor() {
        this.client = client;
    }
    push_hub_list(id, addr, data) {
        this.client.sadd("hubs", id, function (err, res) {
            if (!err) {
                console.log("REDIS push_hub_list", res);
            } else {
                console.log(err);
            }
        });
        data.authorized = new Date().toISOString();
        let push_data = JSON.stringify(data);
        this.client.hmset("hub_authed", [addr, push_data], function (err, res) {
            if (!err) {
                console.log("REDIS hub_authed", res);
            } else {
                console.log(err);
            }
        });
    }
    push_disconnect_date(addr) {
        let me = this;
        let disconnected = new Date().toISOString();
        me.client.hmget("hub_authed", addr, function (err, res) {
            if (!err) {
                let push_data = JSON.parse(res);
                push_data.disconnected = disconnected;
                push_data = JSON.stringify(push_data);
                me.client.hmset("hub_authed", [addr, push_data], function (err, res) {
                    if (!err) {
                        console.log("REDIS disconnect date", res);
                    } else {
                        console.log(err);
                    }
                });
            } else {
                console.log(err);
            }
        });
    }
    set_hub_token(id, token) {
        this.client.hmset("hub_tokens", [id, token], function (err, res) {
            if (!err) {
                console.log("REDIS set_hub_token", res);
            } else {
                console.log(err);
            }
        });
    }
    set_hub_status(id, value) {
        this.client.hmset("hub_states", [id, value], function (err, res) {
            if (!err) {
                console.log("REDIS set_hub_status", res);
            } else {
                console.log(err);
            }
        });
    }
    get_authed_hub(addr, callback = () => { }) {
        this.client.hmget("hub_authed", addr, function (err, res) {
            if (!err) {
                callback(res);
            } else {
                console.log(err);
            }
        });
    }
    get_all_hubs_text(addrs, callback = () => { }) {
        this.client.hgetall("hub_authed", function (err, res) {
            if (!err) {
                let texts = {};
                if (!res) {
                    res = {};
                }
                addrs.forEach(element => {
                    let finded = false;
                    for (let addr in res) {
                        if (addr == element) {
                            finded = true;
                            let json = JSON.parse(res[addr]);
                            let id = json.id.toString();
                            let authorized = json.authorized;
                            let disconnected = json.disconnected ? json.disconnected : "open";
                            let txt = `${id}__${authorized}__${disconnected}`;
                            texts[element] = txt;
                        }
                    }
                    if (!finded) {
                        texts[element] = element;
                    }
                });
                callback(texts);
            } else {
                console.log(err);
            }
        });
    }
    are_id_exist(id, callback = () => { }) {
        this.client.sismember("hubs", id, function (err, res) {
            if (!err) {
                callback(res)
                console.log("REDIS are_id_exist", res);
            } else {
                console.log(err);
            }
        });
    }
    delete_all() {
        this.client.del("hubs", "hub_states", "hub_tokens", "hub_authed", function (err, res) {
            if (!err) {
                console.log("REDIS cleared", res);
            } else {
                console.log(err);
            }
        });
    }
}

