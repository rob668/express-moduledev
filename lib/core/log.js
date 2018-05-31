
var app = null,
env = null,
opts = {
    appenders:{
        out: { type: 'console' }
    },
    categories: {
       default: { appenders: [ 'out' ], level: 'debug' }
    }
},
log4js = null,
logger = {
    info (t){ console.log(t) },
    error (t){ console.log(t) }
};

var log = {
    logger (name) {
        if( log4js == null ) return null;
        logger = log4js.getLogger(name)
        return logger;
    },

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
            if( env.log4js !== undefined && env.log4js !== false ){
                log4js = require('log4js');
                logger = log4js.getLogger();
                if( typeof env.log4js === "object" ){
                    opts = env.log4js;
                }
                log4js.configure(opts);
            }
        }
    }
});

module.exports = logProxy;