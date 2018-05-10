/*
    这里放一些框架提供的通用函数库
    Author: Rob
    Date: 2017/5/2
*/
var fs = require('fs');
var path = require('path');
var log = require('./log');
var extend = require('node.extend');

var app = null,
_utils = {

     isLength(value) {
        const MAX_SAFE_INTEGER = 9007199254740991
        return typeof value == 'number' &&
            value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER
    },

    isArrayLike (value) {
        return value != null && typeof value != 'function' && this.isLength(value.length)
    },

    isEmpty (value){
        if (value == null) {
            return true
        }
        if (this.isArrayLike(value) &&
            (Array.isArray(value) || typeof value == 'string' || typeof value.splice == 'function'
                //|| isBuffer(value) || isTypedArray(value) || isArguments(value)
                )) {
            return !value.length
        }
        return true
    },

    isObject(value) {
        const type = typeof value
        return value != null && (type == 'object' || type == 'function')
    },

    isFunction(value) {
        if (!_utils.isObject(value)) {
            return false
        }

        const tag = baseGetTag(value)
        return tag == '[object Function]' || tag == '[object AsyncFunction]' ||
            tag == '[object GeneratorFunction]' || tag == '[object Proxy]'
    },

    fsExistsSync(path) {
        try{
            fs.accessSync(path,fs.F_OK);
        }catch(e){
            return false;
        }
        return true;
    },

    extend (...args){
        return extend(...args);
    },

    mkdirs : function (dirname, callback) {
        fs.exists(dirname, function (exists) {
            if (exists) {
                callback();
            } else {
                //console.log(path.dirname(dirname));
                _utils.mkdirs(path.dirname(dirname), function () {
                    fs.mkdir(dirname, callback);
                });
            }
        });
    },

    //递归创建目录 同步方法
    mkdirsSync: function (dirname) {
        if (fs.existsSync(dirname)) {
            return true;
        } else {
            if (_utils.mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname);
                return true;
            }
        }
    },

    getIP (req){
        let ip = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;

        return ip.replace('::ffff:','')
    }

};

const objectProto = Object.prototype
const hasOwnProperty = objectProto.hasOwnProperty
const toString = objectProto.toString
const symToStringTag = typeof Symbol != 'undefined' ? Symbol.toStringTag : undefined
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]'
  }
  if (!(symToStringTag && symToStringTag in Object(value))) {
    return toString.call(value)
  }
  const isOwn = hasOwnProperty.call(value, symToStringTag)
  const tag = value[symToStringTag]
  let unmasked = false
  try {
    value[symToStringTag] = undefined
    unmasked = true
  } catch (e) {}

  const result = toString.call(value)
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag
    } else {
      delete value[symToStringTag]
    }
  }
  return result
}

var utilsProxy = new Proxy(_utils, {
    set :function(target, key, receiver){
        if( key == 'app' && app == null ){
            app = receiver;
            _utils[key] = app;

            if( _utils.fsExistsSync('core/bridge.js') ){
                log.p('load bridge.js');
                var bridge = require('./bridge');
                for( [key, _exports] of Object.entries(bridge)){
                    _utils[key] = _exports;
                    if( _utils.isFunction(_exports.init) ){
                        _exports.init(app);
                        delete _utils[key].init;
                    }
                }
            }
        }
        return true
    }
});

module.exports = utilsProxy;