const express = require('express');
const fs = require('fs');
const alasql = require('alasql');
const router = express.Router();
const logger = require('log4js').getLogger('api');
const graphqlHTTP = require('express-graphql');
const _ = require('lodash');
const root = JSON.parse(fs.readFileSync('./db/db.json'));
const classes = root.classes;
const db = new alasql.Database();

const xlsx = require('xlsx');
const dbUrl = fs.readFileSync('./db/data.txt');
const workbook = xlsx.readFile('./db/' + dbUrl);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

let headers = {};
let data = {};
Object.keys(worksheet)
    .filter(k => k[0] !== '!')
    .forEach(k => {
        let col = k.substring(0, 1).charCodeAt(0) - 65;
        let row = parseInt(k.substring(1));
        let value = worksheet[k].v;
        if (row === 1) {
            headers[col] = value;
            return;
        }
        if (!data[row]) {
            data[row] = {};
        }
        data[row][headers[col]] = value;
    });

db.exec('CREATE TABLE classes (id INT PRIMARY KEY, name STRING)');

data = _.toArray(data);
headers = _.toArray(headers);
const cids = {};
const clsMap = {};
_.chain(data)
    .map(obj => obj[headers[0]])
    .filter(obj => obj)
    .uniq()
    .forEach(obj => {
        let cls = {
            id: obj.replace(/[^0-9]/ig, ""),
            name: obj
        };
        db.tables["classes"].data.push(cls);
        clsMap[cls.name] = parseInt(cls.id);
        cids[cls.id] = cls.name;
    })
    .value();

db.exec('CREATE TABLE students (id INT AUTO_INCREMENT PRIMARY KEY, cid INT, name STRING, sex STRING, sid INT, seat INT, score STRING)');
const scoreHeaders = [];
for (let i = 5; i < headers.length; i++) {
    scoreHeaders.push(headers[i]);
}
for (let k in data) {
    let stu = data[k];
    let objScore = {};
    for (let h in scoreHeaders) {
        let key = scoreHeaders[h];
        objScore[key] = stu[key];
    }
    db.exec('INSERT INTO students VALUES ?', [{
        cid: clsMap[stu[headers[0]]],
        name: stu[headers[1]],
        sid: stu[headers[2]],
        sex: stu[headers[3]],
        seat: stu[headers[4]],
        score: JSON.stringify(objScore)
    }]);
}

const clsGroup = db.exec('select name, cn from (select cid, COUNT(cid) as cn from students group by cid) join classes on cid = id');
_.forEach(clsGroup, obj => {
    logger.info('#CLASS ' + obj['name'] + ', ' + obj['cn']);
});
logger.info('Loaded students, total: ' + data.length);

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
        cid: {
            type: GraphQLInt
        },
        cname: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
        sex: {
            type: GraphQLString
        },
        sid: {
            type: GraphQLInt
        },
        seat: {
            type: GraphQLString
        },
        score: {
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
        score: {
            type: new GraphQLList(GraphQLString)
        }
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
                    student: db.exec('SELECT * FROM students WHERE cid = ' + id),
                    score: scoreHeaders
                };
            }
        },
        studentsByName: {
            type: new GraphQLList(StudentType),
            description: 'Get students by name',
            args: {
                name: {
                    type: GraphQLString
                }
            },
            resolve: (_, args) => {
                return db.exec('SELECT s.id,s.sid,s.cid,s.name,s.sex,c.name AS cname FROM students AS s ' +
                    'LEFT JOIN classes AS c ON s.cid = c.id WHERE s.name LIKE "%' + args.name + '%" ORDER BY s.cid ASC, s.id ASC');
            }
        },
        score: {
            type: new GraphQLList(GraphQLString),
            description: 'Get score list',
            resolve: () => {
                return scoreHeaders;
            }
        },
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