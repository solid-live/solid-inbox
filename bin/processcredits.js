#!/usr/bin/env node

// set CERT to be the user CERT
// set CREDIT_CERT to be the cert paying, if different

var debug = require('debug')('sl-inbox:processcredits')
var exec = require('child_process').exec
var shell = require('rdf-shell')
$rdf = require('rdflib')
var path = require('path')
var util = shell.util

/**
 * list the contents of a directory
 * @param  {Array} argv Arguments takes inbox
 */
function bin (argv) {
  var uri = argv[2] || 'https://melvin.solid.live/inbox/'
  if (!uri) {
    console.error('uri is required')
  }
  //processCredits(uri, function(err, res) {
  //  if (err) {
  //    console.error(err)
  //  } else {
  //    console.log(res)
  //  }
  //})
  shell.sub(uri, function(err, res) {
    if (err) {
      console.error(err)
    } else {
      console.log('res', res)
      processCredits(uri, function(err, res) {
        if (err) {
          console.error(err)
        } else {
          console.log(res)
        }
      })
    }
  })
}

/**
 * process credits from an inbox
 * @param  {[type]}   uri      inbox uri
 * @param  {Function} callback callback function
 */
function processCredits(uri, callback) {
  console.log('Scanning inbox:', uri)
  shell.ls(uri, function (err, arr) {
    if (!err) {
      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        shell.cat(file, processResult(file))
      }
    } else {
      callback(err)
    }
  })
}

/**
 * process result per inbox item
 * @param  {string} file uri to process
 * @return {object} a function that processes results
 */
function processResult (file) {
  return function (err, res) {
    if (!err) {
      var store = $rdf.graph()

      $rdf.parse(res, store, file, 'text/turtle')

      var pt = util.primaryTopic(store, file)
      var CURR = $rdf.Namespace('https://w3id.org/cc#')
      var isPost = util.is(store, pt, CURR('Credit').uri)

      if (isPost) {
        processCredit(store, pt)
      }
    } else {
      console.error(err)
    }
  }
}

/**
 * process a post
 * @param  {object} store rdflib store
 * @param  {[type]} uri   uri of the post
 */
function processCredit (store, uri) {
  console.log('Web Credit found!', uri)
  var v = validateCredit(store, uri)
  if (v) {
    console.log('credit valid')
    var SOLID = $rdf.Namespace('http://www.w3.org/ns/solid/terms#')
    var CURR = $rdf.Namespace('https://w3id.org/cc#')
    var api = store.any($rdf.sym(uri), CURR('api'))
    var wallet = store.any($rdf.sym(uri), CURR('wallet'))
    console.log('api', api)
    console.log('wallet', wallet)
    if (wallet) {
      sendToAPI(store, uri)
    }
  } else {
    debug('post invalid')
  }
}

/**
 * validate a post
 * @param  {object} store rdflib store
 * @param  {[type]} uri   uri of the post
 * @return true if post is valid
 */
function validateCredit (store, uri) {
  var ret = true

  return ret
}

/**
 * Send credit to API
 * @param  {object} store rdflib store
 * @param  {[type]} uri   uri of the post
 */
function sendToAPI (store, uri) {

  console.log('sending to API')
  var SOLID = $rdf.Namespace('http://www.w3.org/ns/solid/terms#')
  var CURR = $rdf.Namespace('https://w3id.org/cc#')
  var wallet = store.any($rdf.sym(uri), CURR('wallet'))
  var amount = store.any($rdf.sym(uri), CURR('amount'))
  var source = store.any($rdf.sym(uri), CURR('source'))
  var destination = store.any($rdf.sym(uri), CURR('destination'))
  var description = store.any($rdf.sym(uri), CURR('description'))
  console.log('wallet', wallet)
  var fetcher = new $rdf.Fetcher(store, 2000)

  if (wallet) {
    fetcher.nowOrWhenFetched($rdf.sym(wallet.uri.split('#')[0]), null, function() {
      var api = store.any(wallet, CURR('api'))
      console.log('api', api)
      var timestamp = new Date().toISOString()
      if (api) {
        var cert = process.env['CREDIT_CERT'] || process.env['CERT']
        var cmd = 'curl --key ' + cert + ' --cert ' + cert + ' --data "source=' + source.uri + '&destination=' + destination.uri + '&description=' + description + '&amount=' + amount + '&timestamp=' + timestamp + '" ' + api.uri + 'insert'
        console.log('cmd', cmd)

        exec(cmd, function(err, stdout, stderr){
          if (err) {
            console.error(err)
          } else {
            console.log('stderr', stderr)
            console.log('stdout', stdout)
            console.log('Removing uri', uri.split('#')[0])
            shell.rm(uri.split('#')[0], function(err, ret) {
              if (!err) {
                debug(ret)
              } else {
                debug(err)
              }
            })
          }
        })

      }
    })
  }

}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
