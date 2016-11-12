var express = require('express');
var fs = require('fs');
var alasql = require('alasql');
var router = express.Router();
var logger = require('log4js').getLogger('api');
var classes = JSON.parse(fs.readFileSync('./db.json')).classes;
var db = new alasql.Database();
var cids = {};

for (var c in classes) {
    var cd = parseInt(c);
    var cls = classes[c];
    cids[cd] = cls.name;
    var stuName = 'cls_stu_' + cd;
    var seatName = 'cls_seat_' + cd;
    logger.info('Loading class #' + cd + ' -> ' + cls.name);
    db.exec('CREATE TABLE ' + stuName + ' (id SERIAL, sid STRING, name STRING)');
    for (var stu in cls.students) {
        db.tables[stuName].data.push(
            {
                id: stu,
                sid: stu,
                name: cls.students[stu].name
            }
        );
    }
    db.exec('CREATE TABLE ' + seatName + ' (id SERIAL, x NUMBER, y NUMBER, gx INT, gy INT, owner STRING)');
    for (var seat in cls.seats) {
        db.tables[seatName].data.push(
            {
                id: seat,
                x: cls.seats[seat].x,
                y: cls.seats[seat].y,
                gx: cls.seats[seat].gx,
                gy: cls.seats[seat].gy,
                owner: cls.seats[seat].owner.join(',')
            }
        );
    }
}

/* API */
router.get('/classes', function (req, res, next) {
    res.send(JSON.stringify(cids, 1));
});

router.get('/students/:id(\\d+)', function (req, res, next) {
    var id = parseInt(req.params.id);
    if (!cids.hasOwnProperty(id)) {
        var err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
    var r = db.exec('SELECT * FROM cls_stu_' + req.params.id + ' ');
    res.send(JSON.stringify(r, 1));
});

router.get('/seats/:id(\\d+)', function (req, res, next) {
    var id = parseInt(req.params.id);
    if (!cids.hasOwnProperty(id)) {
        var err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
    var r = db.exec('SELECT * FROM cls_seat_' + req.params.id + ' ');
    res.send(JSON.stringify(r, 1));
});

module.exports = router;