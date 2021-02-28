// functions/hello.js
const faunadb = require('faunadb')
const q = faunadb.query

exports.handler = async event => {

    let s = event.path.replace(/^\/+/, '');

    let tokens = s.split("/");

    let op = "unknown_op";
    let varname = "unknown_var";
    let value = "unknown_value";

    if (tokens.length == 0) {
        return {
            body: 'Welcome to the world\'s most minimal serverless storage!<\/br>Try /set/varname, /get/varname/, or /del/varname and enjoy!',
            statusCode: 200
        }
    }
    if (tokens.length == 1) {
        op = "get";
        varname = tokens[0];
    } else if (tokens[0] == "set") {
        op = "set";
        varname = tokens[1];
        tokens.shift();
        tokens.shift();
        value = tokens.join("/");  //the point of this is to reassemble values that had slashes in.
    } else if (tokens[0] == "del") {
        op = "del";
        varname = tokens[1];
    } else if (tokens[0] == "get") {
        op = "get";
        varname = tokens[1];
    }

    value = decodeURIComponent(value);
    varname = decodeURIComponent(varname);

    console.log('info', "Doing " + op + " " + varname + " " + value);

    // visitors fnAEA6eDIiACATItAAdaba7rKq7kOmeCxu0M7AOg
    // vars fnAEBLDVCEACAa5Db3UUIu5EVFRu6dliySa2YKCn

    var q = faunadb.query
    var client = new faunadb.Client({
        secret: 'fnAEBLDVCEACAa5Db3UUIu5EVFRu6dliySa2YKCn', // please do not use this to mess up our fauna database kind people
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
        return buildError ({message:"No instruction given.  Usage: /get/varname, /set/varname, /del/varname."},'');
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