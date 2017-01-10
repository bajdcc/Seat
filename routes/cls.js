const express = require('express');
const router = express.Router();

/* CLASS UI */
router.get('/:id(\\d+)', (req, res, next) => {
    res.render('cls', {name: req.params.id, title: '在线座位管理系统'});
});

router.get('/score/:id(\\d+)', (req, res, next) => {
    res.render('score', {name: req.params.id, title: '可视化图表'});
});

module.exports = router;
