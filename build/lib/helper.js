"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncForEach = void 0;
exports.asyncForEach = (fns, callback) => {
    let digest = () => {
        let fn = fns.shift();
        if (!fn)
            return callback();
        fn(() => setTimeout(digest, 0));
    };
    digest();
};
