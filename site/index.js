var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/deets', (req, res) => {
    res.render('documentation');
});

module.exports = router;