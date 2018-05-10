var log4js = require('log4js');
var logger = log4js.getLogger();
var app = null,
env = null;

log4js.configure({
    appenders: {
        out: {
            type: 'console',
            category: "console"
        }, //控制台输出
        app: {
            type: "dateFile",
            filename: 'logs/log',
            pattern: "_yyyyMMdd.log",
            // absolute: false,
            alwaysIncludePattern: true
            // maxLogSize: 20480,
            // backups: 3,
        }//日期文件格式
       //, redis: { type: 'redis', port:6300, channel: 'logs' }
    },
    categories: {
        default: { appenders: ['out','app'], level: 'info' }
    }
});

var log = {

    p (...args){
        logger.info([...args]);
    },

    e (text){
        logger.error(text);
    }
}

var logProxy = new Proxy(log, {
    set :function(target, key, receiver){
        if( key == 'app' && app == null ){
            app = receiver;
            env = app.get('env');
        }
    }
});

module.exports = logProxy;