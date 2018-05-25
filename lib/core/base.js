'use strict';
var fs = require('fs');
var log = require('./log');
var utils = require('./utils');
var path = require('path');

var _CTRLS = [];
var _APP = null;

exports.init = function(app){

    var APP = {
        "ctrls":{
            get : function(ctrlName, m, fullpath){
                let _k = ctrlName,
                _ctrlPATH = "/app/ctrls/"+ ctrlName;

                if( m !== undefined && m !== ""){
                    _k = m +"-"+ ctrlName;
                    _ctrlPATH = "/app/modules/"+m+"/ctrls/"+ ctrlName;
                }

                if( fullpath ) {
                    _ctrlPATH = `/${fullpath}/ctrls/${ctrlName}`
                }

                let __c = _CTRLS[_k];
                if( _CTRLS[_k] == undefined ){
                    //先检查文件是否存在
                    if( false === utils.fsExistsSync(path.join(process.cwd(), _ctrlPATH +'.js')) ){
                        throw new Error('指定的控制器'+ ctrlName +'不存在'+ _ctrlPATH);
                    }
                    __c = require(path.join(process.cwd(), _ctrlPATH));
                    log.p('load ctrl '+ _ctrlPATH);
                    var _tmpCls = class temp {
                        constructor(app, _m) {
                            this.app = app;
                            this.module = _m;
                        }
                    }

                    var _cls = new _tmpCls(app, m);
                    let methods = Object.entries(__c);
                    for( let [key, fn] of methods ){
                        _cls[key] = fn;
                    }

                    _CTRLS[_k] = __c = _cls;
                }
                return __c;
            }
        }
    }

    Object.defineProperty(APP, "DB", {
        get () { return app.get("DB") },
        set () { return; }
    });

    Object.defineProperty(APP, "utils", {
        get () { return utils }
    });

    Object.defineProperty(APP, "auth", {
        get () { return auth },
        set () { return; }
    });

    var proxy = new Proxy(APP, {
        get :function(target, key, receiver){
            if( target[key] == undefined ){
                return Reflect.get(app, key, receiver);
            }
            return target[key];
        }
    });

    global.APP = proxy;
}

exports.setUtils = function(app){
    utils.app = app;
}

