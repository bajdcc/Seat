var express = require('express');
var router = express.Router();

/* CLASS UI */
router.get('/:id(\\d+)', function (req, res, next) {
    res.render('cls', {name: req.params.id});
});

module.exports = router;
