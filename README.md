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
//指定seesion存储类型
//var RedisStore = require('connect-redis')(em.session);
var FileStore = require('session-file-store')(em.session);

var config = {
    "port":8000,
    //使用环境 'default','development','production','testing'
    "use_env": "development",
    //顶级路由存放目录名称 默认routes
    //"router":"routes/",
    "session_store": {
        "secret": 'a345bc!',
        "cookie": {  maxAge: 1000 * 60 * 60  },
        "resave": true,
        "saveUninitialized": false,
        "store": new FileStore
    }
}
//运行
em.Run(config)
em.log.p('server runing..')
```

## 配置文件
```js
//这里使用了类的形式来定义配置
//config/default.js
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
    }
}

module.exports = Config;

//开发环境文件
//config/development.js
var Config = require('./default');
class Development extends Config{
    constructor(){
        super();
        this.debug = true;
        ....
    }
}
module.exports = Development;

...
```
可以通过 em.config 获取配置选项

## 开源地址
https://github.com/rob668/express-moduledev

## 查看DEMO
http://www.robweb.cn/demos/express-moduledev-demo