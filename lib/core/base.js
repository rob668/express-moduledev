'use strict';
var fs = require('fs');
var log = require('./log');
var utils = require('./utils');
var path = require('path');
var glob = require('glob');

var _CTRLS = [];
var _APP = null;

exports.init = function(app){

    var APP = {}
    let cfg = app.config.getcfg();

    Object.defineProperty(APP, "ctrls", {
        value:{
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
                    if( false === utils.fsExistsSync(path.join(cfg.__dirname, _ctrlPATH +'.js')) ){
                        throw new Error('指定的控制器'+ ctrlName +'不存在'+ _ctrlPATH);
                    }
                    __c = require(path.join(cfg.__dirname, _ctrlPATH));
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
    });

    Object.defineProperty(APP, "DB", {
        value:app.get("DB"),
        enumerable: true
    });

    Object.defineProperty(APP, "utils", {
        value: utils,
        enumerable: true
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

    //加载用户桥接文件
    glob.sync(path.join(cfg.__dirname,'app/bridge/**/*.js')).forEach(file => {
        var bridge = require(file);
        for(let [key, _exports] of Object.entries(bridge)){
            let initfn = function(){}
            if( utils.isFunction(_exports.init) ){
                initfn = _exports.init;
                delete _exports.init;
            }
            Object.defineProperty(APP, key, {
                value: _exports,
                enumerable: true,
                writable: true
            });
            initfn(app)
        }
    });
}

exports.setUtils = function(app){
    utils.app = app;
}

