const express = require('express');
const fs = require('fs');
const alasql = require('alasql');
const router = express.Router();
const logger = require('log4js').getLogger('api');
const graphqlHTTP = require('express-graphql');
const _ = require('lodash');
const lodash = _;
const db = new alasql.Database();

const xlsx = require('xlsx');

db.exec('CREATE TABLE classes (id INT PRIMARY KEY, name STRING)');
db.exec('CREATE TABLE students (id INT AUTO_INCREMENT PRIMARY KEY, cid INT, name STRING, sex STRING, sid INT, seat INT, status STRING, score STRING)');

const cids = {};
const clsMap = {};
const scoreHeaders = [];
const gradeHeaders = {};

function dat(i){
    if(i<26) return String.fromCharCode(65+i);
    return 'A'+String.fromCharCode(65+i-26);
}
function load_data(name, grade) {
	const dbUrl = fs.readFileSync('./db/' + name);
	const workbook = xlsx.readFile('./db/' + dbUrl);
	const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // shang

	let headers = {};
	let data = {};
	Object.keys(worksheet)
		.filter(k => k[0] !== '!')
		.forEach(k => {
            let col = k.match(/[A-Z]+/)[0];
            if(col.length===1){
                col=col.charCodeAt(0) - 65;
            }else{
                col=26+col.charCodeAt(1) - 65;
            }
            let row = parseInt(k.match(/[0-9]+/)[0]);
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

	data = _.toArray(data);
	headers = _.toArray(headers);
	_.chain(data)
		.map(obj => obj[headers[0]])
		.filter(obj => obj)
		.uniq()
		.forEach(obj => {
			if (!obj.replace) return;
			let cls = {
				id: obj.replace(/一/ig, "7").replace(/二/ig, "8").replace(/[^0-9]/ig, ""),
				name: obj
			};
			db.tables["classes"].data.push(cls);
			clsMap[cls.name] = parseInt(cls.id);
			cids[cls.id] = cls.name;
		})
        .value();
    let gradeHEADER =  _.chain(headers)
        .filter(obj => obj[0] == grade)
        .value();
	for (let i = 6; i < headers.length; i++) {
		scoreHeaders.push(headers[i]);
	}
	for (let k in data) {
		let stu = data[k];
		let objScore = {};
		for (let h in gradeHEADER) {
            let key = gradeHEADER[h];
            let key2 = key.toString().slice(1);
			objScore[key2] = stu[key] || '-';
		}
		db.exec('INSERT INTO students VALUES ?', [{
			cid: clsMap[stu[headers[0]]],
			name: stu[headers[1]],
			sid: stu[headers[2]],
			sex: stu[headers[3]],
            seat: stu[headers[4]],
            status: stu[headers[5]],
			score: JSON.stringify(objScore)
		}]);
    }
    
    gradeHeaders[grade] = [];
    gradeHeaders[grade] = _.union(gradeHeaders[grade], _.chain(headers)
    .filter(obj => obj[0] == grade)
    .map(obj => obj.slice(1))
    .value());
    
    console.info("Grade #" + grade);
    console.info(gradeHeaders[grade]);
}

const week = [];

function load_week(name) {
	const workbook = xlsx.readFile('./db/' + 'week.xls');
	const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // shang

	Object.keys(worksheet)
		.filter(k => k[0] !== '!')
		.forEach(k => {
            let col = k.substring(0, 1).charCodeAt(0) - 64;
			let row = parseInt(k.substring(1));
            let value = worksheet[k].v;

			if (!week[row]) {
				week[row] = [];
			}
            week[row][col] = value;
            
            console.info("Week " + row + ":" + col + " = " + value);
		});
}

load_week("week.xls");
load_data("data.txt", '7');
//load_data("data2.txt", '7');

console.info(clsMap);

const clsGroup = db.exec('select name, cn from (select cid, COUNT(cid) as cn from students group by cid) join classes on cid = id');
_.forEach(clsGroup, obj => {
	logger.info('#CLASS ' + obj['name'] + ', ' + obj['cn']);
});
logger.info('Loaded students');

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
        status: {
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
                let grade = id.toString()[0];
                return {
                    id: id,
                    name: cids[id],
                    student: db.exec('SELECT * FROM students WHERE cid = ' + id),
                    score: gradeHeaders[grade]
                };
            }
        },
        studentList: {
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
                let grade = id.toString()[0];
                let stu = db.exec('SELECT * FROM students WHERE cid = ' + id);
                return stu.length == 0 ? null : {
                    id: id,
                    name: cids[id],
                    student: stu
                };
            }
        },
        studentName: {
            type: ClassType,
            description: 'Get student name by id',
            args: {
                id: {
                    type: GraphQLInt
                },
                sid: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let id = args.id;
                id = parseInt(id);
                if (!cids.hasOwnProperty(id)) {
                    return null;
                }
                let sid = args.sid;
                sid = parseInt(sid);
                let grade = id.toString()[0];
                let stu = db.exec('SELECT name,sex,seat FROM students WHERE cid = ' + id + ' AND sid = ' + sid);
                return stu.length == 0 ? null : {
                    name: cids[id],
                    student: stu
                };
            }
        },
        studentSeat: {
            type: ClassType,
            description: 'Get student name by seat',
            args: {
                id: {
                    type: GraphQLInt
                },
                sid: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let id = args.id;
                id = parseInt(id);
                if (!cids.hasOwnProperty(id)) {
                    return null;
                }
                let sid = args.sid;
                sid = parseInt(sid);
                let grade = id.toString()[0];
                let stu = db.exec('SELECT name,sex,sid FROM students WHERE cid = ' + id + ' AND seat = ' + sid);
                return stu.length == 0 ? null : {
                    name: cids[id],
                    student: stu
                };
            }
        },
        weekQuery: {
            type: ClassType,
            description: 'Get class name by id',
            args: {
                wid: {
                    type: GraphQLInt
                },
                sid: {
                    type: GraphQLInt
                }
            },
            resolve: (_, args) => {
                let wid = parseInt(args.wid);
                let sid = parseInt(args.sid);
                let w = week[sid][wid];
                return w ? {
                    name: cids[w],
                    id: w
                } : w;
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
    graphiql: true,
});

module.exports = _exports_;