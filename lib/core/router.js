const glob = require('glob');
const log = require('./log');
const express = require('express');
var path = require('path');

let app = null;
let _modulesMap = {};

module.exports = {
    modulesMap : _modulesMap,

    load (opts) {
        app = opts.app;
        let routesPATH = opts.path;
        let filters_MAP = new Map();

        let _fileErgodic = function(file, src = 'root'){
            if( file.includes('.js') ){
                const instance = require(process.cwd()+"/"+file);
                const _exports = Object.keys(instance);
                let fullpath = '';

                let [_module, url_prefix ] = ["", ""];
                if( _exports.includes('routers') === false ){
                    log.e(file+' 未指定routers节点');
                }
                if( src == "modules" ){
                    var router = express.Router();
                    var hasSubModules = false;
                    if( instance['url_prefix'] ) url_prefix = instance['url_prefix'];
                    let subModules = file.split('/modules')
                    let modulesArray = []

                    for(let [idx, mn] of Object.entries(subModules)){
                        if( idx == 0 ) continue;
                        modulesArray.push({"name":mn.split('/')[1], "issub": mn.includes('/app')})
                    }
                    if( modulesArray.length > 1){
                        hasSubModules = ''
                        modulesArray.forEach((item, idx)=>{
                            if( idx > 0 ) _module += "/"
                            _module += item.name
                            hasSubModules += item.name;
                            if( idx !== modulesArray.length-1 ) {
                                hasSubModules += '/modules/'
                            }
                        })

                        if( url_prefix instanceof Array ){
                            let tmpArr = url_prefix;
                            url_prefix = "/"+_module.substr(0, _module.lastIndexOf('/'))+"/"+tmpArr[0]
                        }else if(typeof url_prefix == "string" ){
                            if( url_prefix !== ""  ){
                                url_prefix = "/"+_module.substr(0, _module.lastIndexOf('/'))+"/"+url_prefix
                            }else{
                                url_prefix = "/"+_module
                            }
                        }
                        let lastM = modulesArray[modulesArray.length-1];
                        fullpath = file.substr(0, file.lastIndexOf('/modules')+ 8) +"/"+ lastM.name
                        if( lastM.issub ){
                            fullpath += "/app"
                        }
                        _modulesMap[_module] = {prefix:url_prefix, subModules:hasSubModules};
                    } else {
                        if( url_prefix instanceof Array ){
                            let tmpArr = url_prefix;
                            url_prefix = tmpArr[0][0] !== "/" ? "/"+tmpArr[0] : tmpArr[0];
                            _module = tmpArr[1];
                            _modulesMap[_module] = {prefix:url_prefix};
                        }else if(typeof url_prefix == "string" ){
                            if( url_prefix !== "" ){
                                if( url_prefix[0] == "/" ){
                                    _module = url_prefix.substr(1)
                                }else {
                                    _module = url_prefix
                                    url_prefix = "/"+ url_prefix
                                }
                            }else{
                                _module = file.split('/')[2];
                                url_prefix = "/"+_module
                                //app.use(express.static(path.join(__dirname, 'app/modules/'+_module)));
                            }
                            _modulesMap[_module] = {prefix:url_prefix};
                        }
                    }

                    if( instance['static_folder'] ){
                        app.use(url_prefix, express.static(path.join(__dirname, '../app/modules/'+_module+'/'+ instance['static_folder'])));
                    }
                }

                //有没有定义过滤器？
                if( _exports.includes('filters') ){
                    for( let [key, filter] of Object.entries(instance.filters) ){
                        if( filter.handler === undefined ) continue;

                        if( filter.prefix === "*" ){
                            if( src == "root" ) {
                                app.use(filter.handler);
                            }else{
                                router.use(filter.handler);
                            }
                            delete instance.filters[key];
                        }else{
                            filters_MAP.set(key, filter);
                        }
                    }
                }

                const routes = instance['routers'];
                let routerinited = false;
                let init = function(method, r){
                    let f = [];
                    if( src=="root"){
                        _module =  r.module //r.module !== undefined ?
                    }
                    let initCtrls = function(r){
                        let ctrlname = r.ctrl;
                        let ctrlnamesp = ctrlname.split('/');
                        if( ctrlnamesp.length > 1 ){
                            ctrlname = ctrlnamesp[ctrlnamesp.length-1];
                            _module = ctrlnamesp[0];
                        }

                        if(typeof r.action == 'string' || r.action == undefined ){
                            let __c = APP.ctrls.get(ctrlname, _module, fullpath);
                            if( typeof __c.init == 'function' && !routerinited ){
                                __c.init();
                                routerinited = true;
                            }
                            if( r.action !== undefined && typeof __c[r.action] === "function"){
                                //__c[r.action](__c, req, res, next);
                                f.push(__c[r.action]);
                            }
                        }else if( r.action instanceof Array ){
                            let __c = APP.ctrls.get(ctrlname, _module, fullpath);
                            r.action.forEach((action, i) => {
                                if( typeof __c[action] === "function" ){
                                    f.push(__c[action]);
                                }
                            });
                        }
                    }

                    //控制器是否为数组 action 也必须为数组
                    if( r.ctrl instanceof Array && r.action instanceof Array ){
                        r.ctrl.forEach((ctrl, i) => {
                            initCtrls({
                                ctrl: ctrl,
                                action: r.action[i],
                                //multiCtrl: true
                                order: i
                            });
                        });
                    }
                    //单个控制器加载
                    else if(typeof r.ctrl == "string" ) {
                        initCtrls(r);
                    }else{
                        f.push(function(req, res, next){
                           r.view === undefined ? res.sendStatus(404) : res.render(r.view)
                        });
                    }

                    if( r.filter && filters_MAP.has(r.filter) ){
                        let _f = filters_MAP.get(r.filter);
                        let _h = _f.handler;
                        let [_method = 'use'] = [_f.prefix];
                        if( _f.prefix == "mount" ){
                            _method = 'use';
                        }
                        if( Array.isArray(_h) ){
                            if( src == "root" ){
                                app[_method](url_prefix+r.prefix, ..._h);
                            }else{
                                router[_method](r.prefix, ..._h);
                            }
                        }else{
                            f.unshift(_h);
                        }
                    }

                    if( src == "root" ){
                        let prefix = typeof r.prefix == "string" ? url_prefix+r.prefix : r.prefix
                        app[method.toLowerCase()](prefix, ...f);
                    }else if( src == "modules" ){
                        router[method.toLowerCase()](r.prefix, ...f);
                        app.use(url_prefix, router);
                    }
                }

                routes.forEach(r => {
                    if( r.method === undefined ){
                        r.method = ["GET"];
                    }else if( r.method.includes('ALL') || r.method.includes('all') ) {
                        r.method = ["ALL"];
                    }

                    if( r.prefix === undefined ){
                        log.e(file+' 必须指定一个路由地址： prefix 参数');
                    }else if( typeof r.prefix == "string" && r.prefix[0] !== "/" ){
                        r.prefix = "/"+ r.prefix;
                    }

                    if( r.module !== undefined && src == "root"){
                        if( _modulesMap[r.module] == undefined ){
                            _modulesMap[r.module] = [{prefix:r.prefix}];
                        }else _modulesMap[r.module].push({prefix:r.prefix});
                    }

                    if( r.method instanceof Array ){
                        for(let m of r.method){
                            init(m, r);
                        }
                    }else{
                        log.e(file+'method 必须是一个数组');
                    }

                });

            }
        }
        //加载路由app/routes 目录下的
        glob.sync('app/'+routesPATH+'/**/*.js').forEach(file => {_fileErgodic(file)});


        //加载路由app/modules模块目录下的路由
        glob.sync('app/modules/**/router.js').forEach(file => {_fileErgodic(file, "modules")});

    }

}
