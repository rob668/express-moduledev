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

var modulesMap = router.modulesMap;
var _viewEngine = null;
var skip_csrf = false;
var getModules = function(moduleName){
	//先看看有没有配置路由对应的模块，没有就按路由
	for ([key, value] of Object.entries(modulesMap)) {
		if( value instanceof Array){
			for(let item of value) {
				if (item.prefix === '/' + moduleName) {
					return value.subModules ? value.subModules : key;
				}
			}
		}else{
			if (value.prefix === '/' + moduleName) {
				return value.subModules ? value.subModules : key;
			}
		}
	}
	return null
}
var RobJS = {

    Run(config) {
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(cookieParser());

		app.use(function (req, res, next) {
		    if( req.session && req.session.loginUser ){
		        res.locals.loginUser = req.session.loginUser;
			}

		    //重写一下render
		    var _render = res.render;
		    res.render = function (view, options, callback) {
				let moduleName = null;
		        //表示不是顶级的
		        if (req.originalUrl !== "/") {
		        	let name = req.baseUrl != "" ? req.baseUrl.substr(1) : req.originalUrl.split('/')[1]
					let moduleObject = getModules(name)
					if( moduleObject ){
						moduleName = moduleObject
					}
				}

		        if (view[0] == "/") {
		            view = view.substring(1, view.length);
		        } else if  (moduleName != null && moduleName != "" ) {
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

		app.use(function (err, req, res, next) {
		    if (err.code == 'EBADCSRFTOKEN') {
		        res.status(403).send('form tampered with')
		    }else{
		    	console.log(err)
		        res.status(500).send('Something broke!')
		    }
		});

		try {
			var apppath = process.cwd();
			if( process.mainModule !== undefined && process.mainModule.filename ){
				let fname = process.mainModule.filename.split(path.sep);
				fname = fname.slice(0, fname.length-1)
				fname = fname.join(path.sep)
				if( apppath !== fname){
					apppath = fname
				}
			}

			config.__dirname = apppath
			let [routesPATH = "routes", use_env = "default" ] = [config.router, config.use_env]
		    if (['default', 'development', 'production', 'testing'].includes(use_env) === false) {
		        throw new Error('请指定正确的环境设置，参考值：default,development,production,testing');
		    }

		    if (use_env == 'development' || use_env == 'testing') {
		        process.env.NODE_ENV = 'development';
		    } else {
		        process.env.NODE_ENV = 'production';
		    }
		    var getenv = require(apppath+'/config/' + use_env);
		    let _clsConfig = new getenv();
		    _clsConfig.use = use_env;
		    app.set('env', _clsConfig);
			log.app = app;
			if( _clsConfig.skip_csrf !== undefined && _clsConfig.skip_csrf === true ) skip_csrf = true;

			if( _clsConfig.debug == true ){
				log.p('调试模式...')
				let logger = require('morgan');
        		app.use(logger('dev'));
			}

			if( _clsConfig.session_store !== undefined ){
				app.use(session(_clsConfig.session_store));
			}

		    Object.defineProperty(app, 'config', {
		        value: {
		            getcfg() {
		                return config;
		            },
		            getenv() {
		                return _clsConfig;
		            }
		        },
		        enumerable: false
		    });

		    (async () => {
		    	let _db = _clsConfig.database;
		    	await DB.create(_db, app).then((data) => {
		            return data;
		        }).catch((err)=>{
		            log.e(err);
		        });
		        app.set('DB', DB);

				this.config = app.config
				var engines = require('consolidate');
				app.use(express.static(path.join(apppath, 'app/static')));
				if( config.static_folder !== undefined ){
					config.static_folder.forEach((item)=>{
						app.use(express.static(path.join(apppath, item)));
					})
				}
				_viewEngine = config.viewEngine || "nunjucks";
				if (_viewEngine == "nunjucks") {
				    var nunjucks = require('nunjucks');

				    var nunjucksEnv = nunjucks.configure([path.join(apppath, 'app/views'), path.join(apppath, 'app/modules')], {
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

		        //基础模块初始化
		        _BASE.init(app);
		        //加载路由
		        router.load({path: routesPATH, app: app});
				if( skip_csrf === false ){
					let new_router = new express.Router();
					for(let skr of router.skip_csrf){
						new_router.post(skr.p, skr.fn)
					}
					app.use('/', new_router)
					app.use(csurf({ cookie: true }));
					app.use(function (req, res, next) {
						res.locals.csrfToken = req.csrfToken();
						next();
					});
				}
				//_BASE.setUtils(app);
				let port = config.port || 8000;
				var server = app.listen(port, function () {
				    var host = server.address().address;
				    var port = server.address().port;

				    log.p('Express server listening at http://%s:%s', host, port);
				});
		    })()
		} catch (error) {
			log.e(error)
		    process.exit();
		    return;
		}

    },

    session : session,

	log: log,

	config: app.config
}


module.exports = RobJS;