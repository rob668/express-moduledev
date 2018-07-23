/*
    数据库 处理文件

    Author: Rob
    Date: 2017/4/28
*/

'use strict';
var _sq = require('sequelize'),
    log = require('./log'),
    utils = require('./utils'),
    _app = null,
    _dbModels = {},
    _modelStore = {};

class DBModel {

    constructor(_s) {
        if (!new.target) {
            throw "must be called with new";
        } else if (new.target === DBModel) {
            throw "DBModel can not initialize";
        }
    }

    query(opts) {
        if (utils.isFunction(opts.where)) {
            var {
                fn,
                col,
                val
            } = opts.where.call(this);
            return this.ORM.findAll({
                "where": _sq.where(_sq.fn(fn, _sq.col(col)), val)
            })
        } else {
            return this.ORM.findAll(opts);
        }
    }

    getone(opts) {
        let sq = this.ORM.findOne(opts);
        return sq;
    }

    sync(opts) {
        let tableName = this.tableName;
        this.ORM.sync(opts).then(function() {
            log.p(tableName, "同步成功");
        }).catch(function(error) {
            log.e(error.message);
        });
    }

    raw(string, opts) {
        return _dbobj.query(string, opts).spread((results, metadata) => {
            return metadata;
        });
    }

    increment(fields, id) {
        return this.ORM.findById(id).then(function(task) {
            task.increment(fields).then(function(task) {
                console.log('success');
            })
        })
    }

    delete(id) {
        return this.ORM.destroy({
            where: {
                id: id
            }
        });
    }

    getcount(field = "*", where) {
        var c = {
            attributes: [
                [_sq.fn('COUNT', _sq.col(field)), 'count']
            ]
        }
        if (where) c.where = where;
        return this.query(c).then(function(t) {
            return t[0].dataValues.count
        });
    }
}

var fieldsMap = {
    "varchar": '"varchar(255)"',
    "boolean": '"tinyint(1)"',
    "decimal": '"decimal(10, 0)"',
    "double": '"double(10,0)"'
}

function convertFields(fields, key) {
    var str = JSON.stringify(fields);
    var rex = /\"type\":\"(.+?)\"/ig;
    str = str.replace(rex, function(item, value) {
        value = value.toLowerCase();
        for (let k of Object.keys(fieldsMap)) {
            if (value.includes(k)) {
                item = '"type":' + fieldsMap[k];
            }
        }
        return item.toLowerCase();
    });
    let parsem = JSON.parse(str);
    return parsem;
}
var DB = {
        Sequelize: _sq,
        isConnection: false,
        DBModel: DBModel,
        init: false
    },
    _dbobj = null;
Object.defineProperty(DB, 'DbStore', {
    set(v) {
        _dbobj = v;
    },
    get() {
        return _dbobj;
    }
});

DB.regModel = function(modelcls) {
    var resultcls = {};
    if (DB.isConnection == false) return resultcls;
    for (let [k, fn] of Object.entries(modelcls)) {
        if (_dbModels[fn.name] !== undefined) {
            resultcls[k] = _dbModels[fn.name]
            continue;
        }
        if (utils.isFunction(fn)) {
            let _cls = new fn();
            if (_cls.fields) {
                let modelName = k;
                let opts = {};
                let _o = {
                    timestamps: false,
                    freezeTableName: true
                };

                let _d = _dbobj.define(_cls.tableName ? _cls.tableName : fn.name.toLowerCase(), _cls.fields, _o);
                if (_cls.references) {
                    for (let [k, obj] of Object.entries(_cls.references)) {
                        _d[k](DB.getModel(obj.model).ORM, obj.pars)
                    }
                }
                _cls.ORM = _d;
                var cProxy = new Proxy(_d, {
                    get: function(target, key, receiver) {
                        if (target[key] == undefined) {
                            return _cls[key];
                        }
                        return target[key];
                    }
                });
                _dbModels[modelName] = cProxy;
                resultcls[k] = cProxy;
            } else {
                resultcls[k] = _cls;
            }
        }
    }

    return resultcls;
}

DB.getModel = function(name) {
    let m = _dbModels[name];
    return m
}

DB.create = function(_db, app, callback) {
    _app = app;
    DB.init = true;
    return new Promise((resolve, reject)=>{
        if (_db !== undefined) {
            const Op = _sq.Op;
            const operatorsAliases = {
                $eq: Op.eq,
                $ne: Op.ne,
                $gte: Op.gte,
                $gt: Op.gt,
                $lte: Op.lte,
                $lt: Op.lt,
                $not: Op.not,
                $in: Op.in,
                $notIn: Op.notIn,
                $is: Op.is,
                $like: Op.like,
                $notLike: Op.notLike,
                $iLike: Op.iLike,
                $notILike: Op.notILike,
                $regexp: Op.regexp,
                $notRegexp: Op.notRegexp,
                $iRegexp: Op.iRegexp,
                $notIRegexp: Op.notIRegexp,
                $between: Op.between,
                $notBetween: Op.notBetween,
                $overlap: Op.overlap,
                $contains: Op.contains,
                $contained: Op.contained,
                $adjacent: Op.adjacent,
                $strictLeft: Op.strictLeft,
                $strictRight: Op.strictRight,
                $noExtendRight: Op.noExtendRight,
                $noExtendLeft: Op.noExtendLeft,
                $and: Op.and,
                $or: Op.or,
                $any: Op.any,
                $all: Op.all,
                $values: Op.values,
                $col: Op.col
            };
            _db.operatorsAliases = operatorsAliases;
            let db = new _sq(_db.database, _db.username, _db.password, _db);
            return db.authenticate().then(function() {
                log.p("数据库连接成功");
                DB.DbStore = db;
                DB.isConnection = true;
                resolve(true)
            }).catch(function(err) {
                reject("数据库连接失败");
            });
        }else {
            resolve(false);
        }
    });
}

DB.execSql = function(sql) {
    return _dbobj.query(sql).spread((results, metadata) => {
        return metadata
    });

}

var dbProxy = new Proxy(DB, {
    get: function(target, key, receiver) {
        if (key !== "create" && !target.init) {
            if (DB[key] == undefined) {
                return Reflect.get(_sq, key, receiver);
            }
        }
        return DB[key];
    }
});

module.exports = dbProxy;