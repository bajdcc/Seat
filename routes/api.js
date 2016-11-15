const express = require('express');
const fs = require('fs');
const alasql = require('alasql');
const router = express.Router();
const logger = require('log4js').getLogger('api');
const graphqlHTTP = require('express-graphql');
const _ = require('lodash');
const root = JSON.parse(fs.readFileSync('./db.json'));
const classes = root.classes;
const db = new alasql.Database();
const cids = {};

for (let c in classes) {
    let cd = parseInt(c);
    let cls = classes[c];
    cids[cd] = cls.name;
    let stuName = 'cls_stu_' + cd;
    let seatName = 'cls_seat_' + cd;
    logger.info('Loading class #' + cd + ' -> ' + cls.name);
    db.exec('CREATE TABLE ' + stuName + ' (id SERIAL, sid STRING, name STRING)');
    for (let stu in cls.students) {
        db.tables[stuName].data.push(
            {
                id: stu,
                sid: stu,
                name: cls.students[stu].name
            }
        );
    }
    db.exec('CREATE TABLE ' + seatName + ' (id SERIAL, x NUMBER, y NUMBER, gx INT, gy INT, owner STRING)');
    for (let seat in cls.seats) {
        db.tables[seatName].data.push(
            {
                id: seat,
                x: cls.seats[seat].x,
                y: cls.seats[seat].y,
                gx: cls.seats[seat].gx,
                gy: cls.seats[seat].gy,
                owner: cls.seats[seat].owner
            }
        );
    }
}

/* API */
router.get('/classes', (req, res, next) => {
    res.send(JSON.stringify(cids, 1));
});

router.get('/students/:id(\\d+)', (req, res, next) => {
    let id = parseInt(req.params.id);
    if (!cids.hasOwnProperty(id)) {
        let err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
    let r = db.exec('SELECT * FROM cls_stu_' + req.params.id + ' ');
    res.send(JSON.stringify(r, 1));
});

router.get('/seats/:id(\\d+)', (req, res, next) => {
    let id = parseInt(req.params.id);
    if (!cids.hasOwnProperty(id)) {
        let err = new Error('Not Found');
        err.status = 404;
        return next(err);
    }
    let r = db.exec('SELECT * FROM cls_seat_' + req.params.id + ' ');
    res.send(JSON.stringify(r, 1));
});

// GraphQL Declaration

const {
    GraphQLID,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
    GraphQLBoolean,
    GraphQLInt,
    GraphQLFloat,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLUnionType,
} = require('graphql/type');

const StudentType = new GraphQLObjectType({
    name: 'StudentType',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLID)
        },
        sid: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
    })
});

const SeatType = new GraphQLObjectType({
    name: 'SeatType',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLID)
        },
        x: {
            type: GraphQLInt
        },
        y: {
            type: GraphQLInt
        },
        gx: {
            type: GraphQLInt
        },
        gy: {
            type: GraphQLInt
        },
        owner: {
            type: new GraphQLList(GraphQLInt)
        },
    })
});

const ClassType = new GraphQLObjectType({
    name: 'ClassType',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLID)
        },
        name: {
            type: GraphQLString
        },
        student: {
            type: new GraphQLList(StudentType)
        },
        seat: {
            type: new GraphQLList(SeatType)
        },
    })
});

const queryType = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: () => ({
        classes: {
            type: new GraphQLList(ClassType),
            description: 'Get class id list',
            resolve: () => {
                return _.keys(cids).map(x => {
                    return {id: x, name: cids[x]}
                });
            }
        },
        class: {
            type: ClassType,
            description: 'Get class by id',
            args: {
                id: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let id = args.id;
                id = parseInt(id);
                if (!cids.hasOwnProperty(id)) {
                    return null;
                }
                return {
                    id: id,
                    name: cids[id],
                    student: db.exec('SELECT * FROM cls_stu_' + args.id + ' '),
                    seat: db.exec('SELECT * FROM cls_seat_' + args.id + ' ')
                };
            }
        },
        students: {
            type: new GraphQLList(StudentType),
            description: 'Get students by class id',
            args: {
                id: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let id = args.id;
                id = parseInt(id);
                if (!cids.hasOwnProperty(id)) {
                    return [];
                }
                return db.exec('SELECT * FROM cls_stu_' + args.id + ' ');
            }
        },
        seats: {
            type: new GraphQLList(SeatType),
            description: 'Get seats by class id',
            args: {
                id: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let id = args.id;
                id = parseInt(id);
                if (!cids.hasOwnProperty(id)) {
                    return [];
                }
                return db.exec('SELECT * FROM cls_seat_' + args.id + ' ');
            }
        }
    })
});

const mutationType = new GraphQLObjectType({
    name: 'RootMutationType',
    fields: {
        test: {
            type: GraphQLInt
        }
    }
});

const schema = new GraphQLSchema({
    query: queryType,
    mutation: mutationType
});

const _exports_ = graphqlHTTP({
    schema: schema,
    graphiql: false,
});

module.exports = _exports_;