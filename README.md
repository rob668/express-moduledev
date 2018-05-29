## 说明
基础Express做的模块化开发框架，按模块划分业务，支持模块内视图和路由配置，每个模块目录可拥有独立的controller、service、model、static等，这样可以让负责不同业务模块的开发人员更关注业务本身。

## 安装
```shell
npm i express-moduledev
```

## 项目目录结构 [方括号为可选目录]
```js
app // 项目主目录
│  |─ modules    //模块目录
│  │  |─ module_A   //业务模块A
│  │  │  |─ ctrls 控制器文件
│  │  │  |  └─ controller1.js
│  │  │  |─ views 视图模板文件
│  │  │  |  └─ index.html
│  │  │  |─ [static]    //静态文件等
│  │  │  |─ [models]    //数据处理文件
│  │  │  |─ [servs]     //服务层 业务处理
│  │  │  └─ [router.js] //模块的路由配置文件
│  │  |── module_B 模块B
│  |─ [models]     //ORM 数据库模型定义文件（放在顶级，表示可通用）
│  |─ [routes]     //通用路由器配置
│  |─ [views]      //通用视图模板文件存放位置
│  └─ [ctrls]      //通用控制器文件
├─ config  //环境配置目录
│   |─ default.js   //默认配置文件
│   |─ [development.js]  //开发环境配置文件
│   |─ [production.js]   //生产环境配置文件
│   └─ [testing.js]      //测试环境配置
└─ index.js         //启动文件
```

在您的项目根目录，新建启动文件index.js（或其它名字）
```javascript
//index.js
var em = require('express-moduledev');

var config = {
    //指定端口，默认端口 8000
    //"port":80,
    //使用环境 'default','development','production','testing'
    "use_env": "default",
    //顶级路由存放目录名称 默认routes
    //"router":"routes/",
}

//启动服务
em.Run(config)
em.log.p('server runing..')
```

## 配置文件
```js
//这里使用了类的形式来定义配置
//config/default.js
var session = require('express-session');
var FileStore = require('session-file-store')(session)
//var em = require('express-moduledev');
//var FileStore = require('session-file-store')(em.session)

class Config{
    constructor(){
        //是否开启调试模式
        this.debug = false;
        //数据库连接配置
        this.database = {
            "host": "127.0.0.1",
            "port": "3306",
            "database": "test",
            "username": "root",
            "password": "root",
            "dialect": "mysql"
        };

        //配置session_store
        this.session_store = {
            "secret": 'skdf093ks',
            "cookie": {  maxAge: 1000 * 60 * 60 * 24},
            "resave": true,
            "saveUninitialized": false,
            "store":new FileStore
        }
    }
}

module.exports = Config;

//开发环境文件
//config/development.js
var session = require('express-session');
var RedisStore = require('connect-redis')(session)

var Config = require('./default');
//这里需要继承Config
class Development extends Config{
    constructor(){
        super();
        this.debug = true;
         this.database = {
             ....
         }
        //配置session_store
        this.session_store = {
            "secret": 'skdf093ks',
            "cookie": {  maxAge: 1000 * 60 * 60 * 24 },
            "resave": true,
            "saveUninitialized": false,
            "store":new RedisStore({
                "host": '127.0.0.1',
                "port": '6300'
            })
        }
    }
}
module.exports = Development;

...
```
可以通过 em.config 获取配置选项

## 桥接文件
有时我们需要加载自己的通用函数库，或者对模板进行扩展，可以通过桥接文件实现，在 app下新建bridge目录，该目录下的文件会自动加载（支持多目录多文件）
```javascript
//app/bridge/templateExt.js

//对nunjucks模板扩展方法
module.exports.tpl  = { //这里的 tpl 名字可以自己定义

    //init将自动执行
    init (app){
        //获取配置信息
        let envcfg = app.config.getEnv();
        //获取模板对象
        let tpl = app.get('tpl');
        //添加一个模板全局变量
        tpl.addGlobal("BaseUrl", envcfg.BaseUrl)
        //添加一个日期过滤器
        tpl.addFilter('formatTimestamp', function(t, f="yyyy-MM-dd HH:mm:ss"){
            return new Date(t*1000).pattern(f)
        })
    }
}

//app/bridge/Comm.js
//通用库文件
module.exports.comm = {
    test (){ }
}

//通过全局APP调用方法
APP.comm.test()
```


## 版本更新
- 1.0.7 支持modules下再分modules
- 1.0.8 修改modules下再分modules的部分bug
- 1.0.9 添加DB SQL防注入功能
- 1.0.10 新增自定义函数库加载，位于app/bridge目录下

## 开源地址
https://github.com/rob668/express-moduledev

## 在线DEMO
http://www.robweb.cn/demos/express-moduledev-demo

## DEMO源码
https://github.com/rob668/express-moduledev-demo
