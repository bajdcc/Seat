const express = require('express');
const router = express.Router();

/* CLASS UI */
router.get('/:id(\\d+)', (req, res, next) => {
    res.render('cls', {name: req.params.id});
});

module.exports = router;
