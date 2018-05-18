var express = require('express');
var session = require('express-session')
var cookieParser = require('cookie-parser');
var app = express();
var fs = require('fs');
var path = require('path');
var log = require('./core/log');
var DB = require('./core/db');
var router = require('./core/router');
var bodyParser = require('body-parser');
var csurf = require('csurf')
const _BASE = require('./core/base');

//用来存模块
var modules = [];
var use_env = "default";
var modulesMap = router.modulesMap;
var RobJS = {

    Run(config) {
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(cookieParser());
		app.use(csurf({ cookie: true }))
    	//错误处理
		app.use(function (err, req, res, next) {
		    log.p(err.code, err.stack);
		    if (err.code == 'EBADCSRFTOKEN') {
		        res.status(403).send('form tampered with')
		    }else{
		        res.status(500).send('Something broke!')
		    }
		});

		app.use(function (req, res, next) {
		    res.locals.csrfToken = req.csrfToken();
		    if( req.session && req.session.loginUser ){
		        res.locals.loginUser = req.session.loginUser;
		    }
		    //重写一下render
		    var _render = res.render;
		    res.render = function (view, options, callback) {
		        let moduleName = "";
		        //表示不是顶级的
		        if (req.originalUrl !== "/") {
		            moduleName = req.originalUrl.split('/')[1];
		        }

		        //先看看有没有配置路由对应的模块，没有就按路由
		        let hasKey = false;
		        for ([key, value] of Object.entries(modulesMap)) {
		            if( hasKey ) break;
		            if( value instanceof Array){
		                for(let item of value) {
		                    if (item.prefix === '/' + moduleName) {
		                        moduleName = key;
		                        hasKey = true;
		                        break;
		                    }
		                }
		            }else{
		                if (value.prefix === '/' + moduleName) {
		                    moduleName = key;
		                    hasKey = true
		                    break;
		                }
		            }
		        }

		        if (view[0] == "/") {
		            view = view.substring(1, view.length);
		        } else if  (hasKey ) {
		            if (_viewEngine == "nunjucks") {
		                view = moduleName + '/views/' + view;
		            } else {
		                view = '../modules/' + moduleName + '/views/' + view;
		            }
		        }

		        _render.call(this, view, options, callback);
		    }
		    next();
		});

		try {
			var apppath = process.cwd();
			let [routesPATH = "routes", use_env = "default" ] = [config.router, config.use_env]
		    if (['default', 'development', 'production', 'testing'].includes(use_env) === false) {
		        throw new Error('请指定正确的环境设置，参考值：default,development,production,testing');
		    }

		    if (use_env == 'development' || use_env == 'testing') {
		        process.env.NODE_ENV = 'development';
		    } else {
		        process.env.NODE_ENV = 'production';
		    }

		    var getEnv = require(apppath+'/config/' + use_env);
		    let _clsConfig = new getEnv();
		    _clsConfig.use = use_env;
		    app.set('env', _clsConfig);
			log.app = app

			if( _clsConfig.session_store !== undefined ){
				app.use(session(_clsConfig.session_store));
			}

		    Object.defineProperty(app, 'config', {
		        value: {
		            getcfg() {
		                return config;
		            },
		            getEnv() {
		                return _clsConfig;
		            }
		        },
		        enumerable: false
		    });

		    let next = function () {
		        //基础模块初始化
		        _BASE.init(app);
		        //加载路由
		        router.load({
		            path: routesPATH,
		            app: app
		        });
			}

		    let _db = _clsConfig.database;
		    if (_db) {
		        DB.create(_db, app, next)
		        app.set('DB', DB);
		    } else next()

		} catch (error) {
		    // 文件不存在，或者权限错误
		    console.log(error);
		    process.exit();
		    return;
		}

		this.config = app.config
		var engines = require('consolidate');
		app.use(express.static(path.join(apppath, 'app/static')));
		var _viewEngine = config.viewEngine || "nunjucks";
		if (_viewEngine == "nunjucks") {
		    var nunjucks = require('nunjucks');
		    var nunjucksEnv = nunjucks.configure(['app/views', 'app/modules'], {
		        autoescape: false,
		        express: app,
		        watch: true
		    });
		    app.set('tpl', nunjucksEnv);
		    app.set('view engine', "html");
		    app.engine('html', engines.nunjucks);
		} else {
		    app.set('views', path.join(apppath, 'app/views'));
		    app.set('view engine', _viewEngine);
		}

		_BASE.setUtils(app);
		let port = config.port || 8000;
		var server = app.listen(port, function () {
		    var host = server.address().address;
		    var port = server.address().port;

		    log.p('Express server listening at http://%s:%s', host, port);
		});
    },

    session : session,

	log: log,

	config: app.config
}


module.exports = RobJS;