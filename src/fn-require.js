
/**
 * @fileoverview The factory for "require".
 */

(function(util, data, fn) {

  var slice = Array.prototype.slice;


  /**
   * the require constructor function
   * @param {string} id The module id.
   */
  function Require(id) {
    var context = this.context;
    var uri, mod;

    // require(mod) ** inner use ONLY.
    if (util.isObject(id)) {
      mod = id;
      uri = mod.id;
    }
    // NOTICE: id maybe undefined in 404 etc cases.
    else if (util.isString(id)) {
      uri = Require.prototype.resolve(id, context);
      mod = data.memoizedMods[uri];
    }

    // Just return null when:
    //  1. the module file is 404.
    //  2. the module file is not written with valid module format.
    //  3. other error cases.
    if (!mod) {
      return null;
    }

    // Checks cyclic dependencies.
    if (isCyclic(context, uri)) {
      util.error({
        message: 'found cyclic dependencies',
        from: 'require',
        uri: uri,
        type: 'warn'
      });

      return mod.exports;
    }

    // Initializes module exports.
    if (!mod.exports) {
      initExports(mod, {
        uri: uri,
        parent: context
      });
    }

    return mod.exports;
  }


  /**
   * Use the internal require() machinery to look up the location of a module,
   * but rather than loading the module, just return the resolved filepath.
   *
   * @param {string} id The module id to be resolved.
   * @param {Object=} context The context of require function.
   */
  Require.prototype.resolve = function(id, context) {
    return util.id2Uri(id, (context || this.context).uri);
  };


  Require.prototype._batchResolve = function(ids, context) {
    return util.map(ids, function(id) {
      return Require.prototype.resolve(id, context || {});
    });
  };


  /**
   * Loads the specified modules asynchronously and execute the optional
   * callback when complete.
   * @param {Array.<string>} ids The specified modules.
   * @param {function(*)=} callback The optional callback function.
   */
  Require.prototype.async = function(ids, callback) {
    fn.load(ids, callback, this.context);
  };


  /**
   * The factory of "require" function.
   * @param {Object} context The data related to "require" instance.
   */
  function createRequire(context) {
    // context: {
    //   uri: '',
    //   deps: [],
    //   parent: context
    // }
    var that = { context: context || {} };

    function require(id) {
      return Require.call(that, id);
    }

    require.constructor = Require;
    var proto = Require.prototype;

    for (var p in proto) {
      if (proto.hasOwnProperty(p) && p.charAt(0) !== '_') {
        (function(name) {
          require[name] = function() {
            return proto[name].apply(that, slice.call(arguments));
          };
        })(p);
      }
    }

    return require;
  }


  function initExports(mod, context) {
    var ret;
    var factory = mod.factory;

    mod.exports = {};
    delete mod.factory;
    delete mod.ready;

    if (util.isFunction(factory)) {
      checkPotentialErrors(factory, mod.id);
      ret = factory(createRequire(context), mod.exports, mod);
      if (ret !== undefined) {
        mod.exports = ret;
      }
    }
    else if (factory !== undefined) {
      mod.exports = factory;
    }
  }


  function isCyclic(context, uri) {
    if (context.uri === uri) {
      return true;
    }
    if (context.parent) {
      return isCyclic(context.parent, uri);
    }
    return false;
  }


  function checkPotentialErrors(factory, uri) {
    if (~factory.toString().search(/\sexports\s*=\s*[^=]/)) {
      util.error({
        message: 'found invalid setter: exports = {...}',
        from: 'require',
        uri: uri,
        type: 'warn'
      });
    }
  }


  fn.Require = Require;
  fn.createRequire = createRequire;

})(seajs._util, seajs._data, seajs._fn);
