#!/usr/bin/env node

var debug = require('debug')('sl-inbox:checkinbox')
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
  debug('processing', file)
  return function (err, res) {
    if (!err) {
      var store = $rdf.graph()

      $rdf.parse(res, store, file, 'text/turtle')

      var pt = util.primaryTopic(store, file)
      var SIOC = $rdf.Namespace('http://rdfs.org/sioc/ns#')
      if (pt) {        
        var isPost = util.is(store, pt, SIOC('Post').uri)
      }

      if (isPost) {
        processPost(store, pt)
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
function processPost (store, uri) {
  console.log('SIOC Post found!', uri)
  var v = validatePost(store, uri)
  if (v) {
    console.log('post valid')
    var SOLID = $rdf.Namespace('http://www.w3.org/ns/solid/terms#')
    var timeline = store.any($rdf.sym(uri), SOLID('timeline'))
    if (timeline) {
      moveToTimeline(store, uri)
    }
  } else {
    console.log('post invalid')
  }
}

/**
 * validate a post
 * @param  {object} store rdflib store
 * @param  {[type]} uri   uri of the post
 * @return true if post is valid
 */
function validatePost (store, uri) {
  var ret = true

  return ret
}

/**
 * move a post to timeline
 * @param  {object} store rdflib store
 * @param  {[type]} uri   uri of the post
 */
function moveToTimeline (store, uri) {
  var SOLID = $rdf.Namespace('http://www.w3.org/ns/solid/terms#')
  var DCT = $rdf.Namespace('http://purl.org/dc/terms/')

  var timeline = store.any($rdf.sym(uri), SOLID('timeline'))
  var created = store.any($rdf.sym(uri), DCT('created'))

  debug('timeline', timeline)
  debug('created', created)
  debug('source', uri)
  debug('basename', path.basename(uri))

  if (timeline) {
    shell.mv(uri.split('#')[0], timeline.uri + '/' + path.basename(uri), function (err, ret) {
      if (!err) {
        debug(ret)
      } else {
        debug(err)
      }
    })
  }
}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}

module.exports = bin
