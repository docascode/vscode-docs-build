'use strict';

Object.prototype.getPropertyCaseInsensitive = function (prop) {
    if (!prop || typeof prop !== 'string')
        return null;
    for (let key in this) {
        if (key.toLowerCase() === prop.toLowerCase()) {
            return this[key];
        }
    }
};