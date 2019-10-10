'use strict';

/**
 * try split the line from last ': ', 
 * @param {*} line 
 * @param {*} trimKey if the key need to be trimmed
 */
const splitYamlHeaderLineKeyValue = function ({line, trimKeyValue = true} = {}) {
  if (typeof line !== 'string' || !line) {
      return [null, null];
  }
  let keyEndIndex = line.lastIndexOf(':');
  let key = trimKeyValue ? line.substr(0, keyEndIndex).trim() : line.substr(0, keyEndIndex);
  let value = trimKeyValue ? line.substr(keyEndIndex + 2).trim() : line.substr(keyEndIndex + 2);
  return [key, value];
}

module.exports.splitYamlHeaderLineKeyValue = splitYamlHeaderLineKeyValue;