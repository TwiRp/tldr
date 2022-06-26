var natural = require('natural');
var sylvester = require('sylvester');
var Matrix = sylvester.Matrix;
var fs = require('fs');

function summarize (story, shortenSentences, numSentences) {
    // Strip markdown from the text
    var summary = strip_markdown(story);

    // Sentence tokenizer
    var tokenizer = new natural.SentenceTokenizer();

    // Extract sentences
    var sentences = tokenizer.tokenize(summary);
    sentences = sentences.map((sentence) => sentence.trim());

    // Calculate TF-IDF of sentences
    var transition = [];
    var TfIdf = natural.TfIdf;
    var tfidf = new TfIdf();
    sentences.forEach((sentence) => {
        tfidf.addDocument(sentence);
    });

    // Populate transition matrix
    sentences.forEach((sentence) => {
        row = [];
        tfidf.tfidfs(sentence, (i, measure) => {
            if (sentence == sentences[i]) {
                row.push(1); // A sentence links to itself
            } else {
                row.push(measure + 1);
            }
        });
        transition.push(normalize_row(row));
    });
    transitionMatrix = Matrix.create(transition);

    // Perform page ranking of sentences
    var rankVector = make_vector(sentences.length);
    for(i = 0; i < 200; i++) {
        rankVector = rankVector.multiply(transitionMatrix);
    }

    // Build page ranking scores
    var scores = []
    for(i = 0; i < sentences.length; i++) {
        scores.push({score: rankVector.e(1, i + 1), sentence: sentences[i], idx: i});
    }
    // Order by page rank
    scores.sort(compare_scores);
    // Take top sentences
    scores = scores.splice(0, numSentences);
    scores.sort(compare_idx);

    // Build the summary
    var aSummary = [];
    scores.forEach((goodSentence) => {
        aSummary.push(goodSentence.sentence);
    });
    summary = aSummary.join(" ");

    return summary;
}

function compare_idx(a, b) {
    return a.idx - b.idx;
}

function compare_scores(a, b) {
    return b.score - a.score;
}

function make_vector (len) {
    var new_vec = [];
    new_vec.push(1)
    for(i = 0; i < len - 1; i++) {
        new_vec.push(0);
    }
    return Matrix.create([new_vec]);
}

function normalize_row (row) {
    var divider = 0
    row.forEach((score) => {
        divider += score;
    });
    return row.map((score) => score / divider);
}

function strip_markdown (story) {
    var str = story;
    // Headings
    str = str.replace(/^#+\s+(.*?)\n/gim, '');

    // Links and Images
    str = str.replace(/!\[(.*?)?\]\((.*?)?\)/gim, '$1');
    str = str.replace(/!?\[(.*?)?\]\((.*?)?\)/gim, '$1');

    // Footnotes
    str = str.replace(/\[\^(.*?)\]:?/gim, '');

    // Bold and italics
    str = str.replace(/\*{1,3}([^\*]*?)\*{1,3}/gim, '$1');
    str = str.replace(/_{1,3}([^\*]*?)_{1,3}/g, '$1');

    // Code
    // str = str.replace(/^```(.*?)\n```/gim, '');
    str = str.replace(/^((?:(?:[ ]{4}|\t).*(\R|$))+)/gim, '');
    var pts = str.split("\n```");
    str = "";
    pts.forEach((pt, idx) => {
        if (idx % 2 == 0) {
            str += pt + " ";
        }
    });

    // List and blockquotes
    str = str.replace(/^\s*[\*\s]+(.*?)/gim, '$1');
    str = str.replace(/^\s*[\-\s]+(.*?)/gim, '$1');
    str = str.replace(/^\s*[\+\s]+(.*?)/gim, '$1');
    str = str.replace(/^\s*[\>\s]*(.*?)/gim, '$1');
    str = str.replace(/^\s*[\*\s]+(.*?)/gim, '$1');
    str = str.replace(/^\s*[\>\s]*(.*?)/gim, '$1');
    str = str.replace(/`{1,3}([^\*]*?)`{1,3}/g, '$1');

    // comments
    str = str.replace(/<!--(.*?)-->/gim, ' ');

    // HTML
    str = str.replace(/<br\s?\/?>/gim, ' ');
    str = str.replace(/(<([^>]+)>)/gim, ' ');

    // Hoping for the best at this point. Add punctuation at new lines...
    str = str.replace(/(?<![\.\?\!"'])\n/gim, '. ');

    // Extra whitespace
    str = str.replace(/\s+/gim, ' ');

    return str;
}

exports.summarize = summarize;