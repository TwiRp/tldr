var natural = require('natural');
var sylvester = require('sylvester');
var gramma = require("gramma")
var Matrix = sylvester.Matrix;
var fs = require('fs');
const { match } = require('assert');

// Initialize Tokenizers
var sentence_tokenizer = new natural.SentenceTokenizer();
var word_tokenizer = new natural.WordTokenizer();

async function summarize (story, shortenSentences, numSentences) {
    // Strip markdown from the text
    var summary = strip_markdown(story);

    // Extract sentences
    var sentences = sentence_tokenizer.tokenize(summary);
    
    sentences = sentences.map((sentence) => sentence.trim());

    // Validate and clean sentences
    var next_sentences = [];
    if (shortenSentences) {
        next_sentences = await clean_sentences(sentences);
    } else {
        // Remove sentences that aren't really part of a summary
        for(var i = 0; i < sentences.length; i += 1) {
            var sentence = sentences[i];
            var words = word_tokenizer.tokenize(sentence);

            // Only allow for "short" sentences.
            if (words.length <= 24) {
                next_sentences.push(sentence);
            }
        }
    }

    // Limit to clean sentences if we have enough of them
    if (next_sentences.length >= numSentences) {
        sentences = next_sentences;
    }

    // Calculate TF-IDF of sentences
    var transition = [];
    var TfIdf = natural.TfIdf;
    var tfidf = new TfIdf();
    sentences.forEach((sentence) => {
        // Stem each word in the sentence
        var doc = [];
        word_tokenizer.tokenize(sentence).forEach((word) => {doc.push(natural.PorterStemmer.stem(word));});
        tfidf.addDocument(doc.join (" "));
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
    for(i = 0; i < 500; i++) {
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

function make_vector(len) {
    var new_vec = [];
    new_vec.push(1)
    for(i = 0; i < len - 1; i++) {
        new_vec.push(0);
    }
    return Matrix.create([new_vec]);
}

function normalize_row(row) {
    var divider = 0
    row.forEach((score) => {
        divider += score;
    });
    return row.map((score) => score / divider);
}

function prepare_replacements(matches, word_counts) {
    var replacements = [];

    matches.forEach((match) => {
        if (match.offset && match.offset > 0 && match.replacements.length > 0) {
            // Programming terms should appear frequently enough to ignore the suggestion
            var w = match.word.toLocaleLowerCase();
            if (word_counts.get(w) && word_counts.get(w) < 3) {
                var final_replacement = "";
                match.replacements.forEach((replacement, index) => {
                    if (final_replacement == "" && natural.HammingDistance(match.word, replacement.value) < 3) {
                        final_replacement = replacement.value;
                    }
                });
                if (final_replacement != "") {
                    replacements.push({offset: match.offset, length: match.length, change: match.replacements[0].value});
                }
            }
        }
    });

    return replacements;
}

async function clean_sentences(sentences) {
    var new_sentences = [];
    var word_counts = new Map();

    // Build word counts. This will be used to abandon suggestions
    // from language tool
    sentences.forEach((sen, sen_id) => {
        var words = word_tokenizer.tokenize(sen);
        words.forEach((word, word_id) => {
            var w = word.toLocaleLowerCase();
            if (word_counts.get(w)) {
                word_counts.set(w, word_counts.get(w) + 1);
            } else {
                word_counts.set(w, 1);
            }
        });
    });

    // Clean each sentence.
    for(var i = 0; i < sentences.length; i += 1) {
        var sentence = sentences[i];
        var words = word_tokenizer.tokenize(sentence);

        // Only allow for "short" sentences. Since we're using LanguageTool
        // to remove sentences with a lot of suggestions, we're allowing slightly
        // longer sentences
        if (words.length <= 30) {
            // Query local instance of language tool
            var matches = await gramma.check(sentence,
                {
                    api_url: "http://127.0.0.1:8081/v2/check",
                    rules: {
                        typography: false,
                        casing: false,
                    }
                });

            // If a sentence has too many fixes, it's considered a bad sentence.
            if (matches.matches.length < 3) {
                var replacements = prepare_replacements(matches.matches, word_counts);
                var new_sentence = gramma.replaceAll(sentence, replacements);
                new_sentences.push(new_sentence);
            }
        }
    }

    return new_sentences;
}

function strip_markdown(story) {
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