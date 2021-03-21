// functions/hello.js
const faunadb = require('faunadb')
const q = faunadb.query


exports.handler = async event => {

    let s = event.path.replace(/^\/+/, '');

    let tokens = s.split("/");

    let op = "unknown_op";
    let varname = "unknown_var";
    let value = "unknown_value";

    if (tokens[0] == "set" && tokens.length > 2) {
        op = "set";
        varname = tokens[1];
        tokens.shift();
        tokens.shift();
        value = tokens.join("/");  //the point of this is to reassemble values that had slashes in.
    } else if (tokens[0] == "del" && tokens.length > 1) {
        op = "del";
        varname = tokens[1];
    } else if (tokens[0] == "get" && tokens.length > 1) {
        op = "get";
        varname = tokens[1];
    } else {
            return buildHelpPage();
    }

    value = decodeURIComponent(value);
    varname = decodeURIComponent(varname);

    console.log('info', "Doing " + op + " " + varname + " " + value);

    var q = faunadb.query
    var client = new faunadb.Client({
        secret: 'fnAEBLDVCEACAa5Db3UUIu5EVFRu6dliySa2YKCn',
        domain: 'db.fauna.com',
        scheme: 'https',
    })

    if (op == "get") {
        return getvar(q, client, varname);
    } else if (op=="set") {
        return setvar(q, client, varname, value);
    } else if (op=="del") {
        return delvar(q, client, varname);
    } else {
        return buildError ({message:"pNo instruction given.  Usage: /get/varname, /set/varname, /del/varname."},'');
    }
}

function getvar(q, client, varname) {

    return client.query(
         q.Get(q.Match(q.Index('byname'), varname))
    )
        .then((ret) => {
            let valuestring = ret.data.contents; //I don't see how it could ever not have this path...
            valuestring = decodeURIComponent(valuestring);
            return {
                body: valuestring,
                statusCode: 200
            }
        }).catch((err) => {
            return buildError(err, varname);
        })
}

function setvar(q, client, varname, value){

    return client.query(
        q.If(
            q.Exists(q.Match(q.Index('byname'), varname)),
            q.Replace(
                q.Select('ref', q.Get(q.Match(q.Index('byname'), varname))),
                {data: {name: varname, contents: value}}
            ),
            q.Create(
                q.Collection("varlist"),
                {data: {name: varname, contents: value}}
            )
        )
    )
        .then((ret) => {
            return {
                body: "Variable '" + varname + "' has been set to '" + value + "'.",
                statusCode: 200
            }
        }).catch((err) => {
            return buildError(err, varname);
        })
}

function delvar(q, client, varname) {

    return client.query(
        q.Delete(
            q.Select('ref', q.Get(q.Match(q.Index('byname'), varname)))
        )
    )
        .then((ret) => {
            return {
                body: "Variable '" + varname + "' has been deleted.",
                statusCode: 200
            }
        }).catch((err) => {
            return buildError(err, varname);
        })
}

function buildError(err, varname){
    let msg=err.message;

    if(err.name=="NotFound"){
        msg="There is no variable called '" + varname + "'."
    }

    console.log("error", msg);
    console.log(JSON.stringify(err));

    return {
        statusCode: 400,
        body: msg
    }
}

function buildHelpPage(){

    var helpString="<html>\n<head>\n    <style>\n        body {\n            background-color: black;\n            color:lightgray;\n            font-family: \"Courier New\", Courier, monospace;\n            margin-left: 15%;\n            margin-right: 15%;\n            font-size: 14pt;\n        }\n\n        h1 {\n            text-align:center;\n            margin-top: 100px;\n            font-weight: bold;\n            font-size: 19pt;\n        }\n\n        h2 {\n            margin-top: 50px;\n            font-weight: bold;\n            font-size: 17pt;\n        }\n\n        .separator {\n            text-align:center;\n            margin-top: 50px;\n            margin-bottom: 50px;\n        }\n\n        .code {\n            color: lightgreen;\n        }\n\n        .var {\n            color: lightyellow;\n        }\n\n        .comment {\n            color: gray;\n            font-style: italic;\n        }\n\n        .faq {\n            font-style: italic;\n            color:lightyellow;\n            margin-bottom: 25px;\n        }\n\n        .faa {\n\n            margin-bottom: 25px;\n        }\n\n    </style>\n</head>\n<body>\n\n<h1>Welcome to Storethat.online </h1>\n\n<div class=\"separator\">Ultra-lightweight no-code data storage.<br/>------------------------------------<br/></div>\nstorethat.online is a key-value store that can be used with no tools, preparation or coding except a simple HTTP request -- in fact it could be used\nentirely from the address bar of a browser.\n<h2>Usage</h2>\n\n<p>\n    Store a value:\n    <span class=\"code\">https://storethat.online/set/<span class=\"var\">{key}</span>/<span class=\"var\">{value}</span>\n        <span class=\"comment\">//sets a value in the store, and returns a confirmation message</span></span>\n</p><p>\n    Retrieve a value:\n    <span class=\"code\">https://storethat.online/get/<span class=\"var\">{key}</span></span>\n    <span class=\"comment\">//returns a response consisting only of the value</span></span>\n</p><p>\n    Delete a value:\n    <span class=\"code\">https://storethat.online/del/<span class=\"var\">{key}</span></span>\n    <span class=\"comment\">//deletes the value from the store</span></span>\n</p>\n\n<h2>Examples</h2>\n\n<p>\n    Using a key that has a space in (e.g. from browser address bar): </p><p><span class=\"code\">https://storethat.online/set/my name/Chloe</span>\n</p><p>\n    Storing text with spaces and punctuation (e.g. from browser address bar): </p><p><span class=\"code\">https://storethat.online/set/fullname/Chloe \"C-lo\" Smith</span>\n</p><p>\n    Retrieving a value using jQuery:</p><p>\n<span class=\"code\">\n$.get(\"https://storethat.online/get/my name\", function(value, status){<span class=\"comment\">//... do something with 'value'</span>});\n</span>\n</p><p>\n    Using a hard-to-guess key: </p><p><span class=\"code\">https://storethat.online/set/HARD_TO_GUESS_STRING_myvar/36.2</span>\n</p>\n\n\n<h2>FAQ</h2>\n\n<div class=\"faq\">What is the point of this?</div>\n<div class=\"faa\">It's the simplest possible approach to online storage; a key/value store that can use used entirely with simple HTTP GET requests.\n    This work was inspired by working on small non-profit web sites where the time and skills required to set up something like Firebase aren't available, and requirements are typically simple.</div>\n\n<div class=\"faq\">What are some use cases?</div>\n<div class=\"faa\">Here are some possibilities:\n    <ul>\n        <li>\n            Tiny use cases like hit counters -- you can implement a hit counter with storethat.online entirely from within your HTML page.\n        </li>\n        <li>\n            Really small web projects where there is likely to be nobody available to support or develop with a 'proper' lightweight storage solution.\n        </li>\n        <li>\n            Testing and deployment scripts that may need to store config values where they can easily be accessed without much coding.\n        </li>\n    </ul>\n</div>\n\n<div class=\"faq\">Is it secure?</div>\n\n<div class=\"faa\">Surprisingly, <i>yes</i> -- when used over https, of course.  When you use an API key to access some REST API, all you're doing is inserting a hard-to guess string\n    into your request and relying on https to conceal that string from prying eyes.  That's also exactly what you're doing if you use storethat.online with some hard-to-guess string in\n    the key name.  You may conclude from this that storethat.online is surprisingly secure, or that many widespread REST apis are surprisingly insecure.\n</div>\n\n<div class=\"faq\">Is it scalable?</div>\n\n<div class=\"faa\">It's exactly as scalable as the mechanism used to handle the HTTP request and get/set a value in the underlying storage.  In the case of this implementation, the underlying storage is scalable but not particularly fast.\n    But the storethat.online interface paradigm -- i.e. ultra-simple https get and set requests -- could be fitted over any underlying mechanism.\n</div>\n\n<div class=\"faq\">How do I make an account?</div>\n\n<div class=\"faa\">There are no accounts.  There is only a simple HTTP request.\n</div>\n\n<h2>Credits and notes</h2>\n\n<p>\n    storethat.online is by <a href=\"https://www.linkedin.com/in/bjspeterson/\">Ben Peterson</a> of <a href=\"http://datasmith.org\">DataSmith.org</a>.\n    The back end is on <a href=\"https://www.netlify.com/\">Netlify</a>.\n</p>\n<p>\n    As well as being useful for tiny projects, storethat.online is an experiment in how minimalistic online storage can possibly be.\n    It's hard to see how to extend storethat.online without losing the point of the project...\n    but could it somehow be made <i>more</i> minimalistic?\n</p>\n\n</body>\n</html>\n";

    return {
        body: helpString,
            statusCode: 200
    }
}