var express = require('express');
var router = express.Router();
var summarize = require('../lib/summarize');

router.all('/summarize', async (req, res) => {
    var sentences = 5;
    var text = "";
    var shorten = false;
    if (req.body.text) {
        text = req.body.text;
    }
    if (req.body.shorten) {
        shorten = req.body.shorten;
    }
    if (req.body.sentences && !isNaN(parseInt(req.body.sentences))) {
        sentences = parseInt(req.body.sentences);
    }
    var summary = await summarize.summarize(text, shorten, sentences);
    if (!summary || summary.trim() == "") {
        res.json({status: "FAILURE", summary: summary});
    } else {
        res.json({status: "SUCCESS", summary: summary});
    }
});

module.exports = router;