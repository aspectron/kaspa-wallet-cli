"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.asyncForEach = void 0;
exports.asyncForEach = (fns, callback) => {
    let digest = () => {
        let fn = fns.shift();
        if (!fn)
            return callback();
        fn(() => setTimeout(digest, 0));
    };
    digest();
};
exports.log = (label, text, deco1 = "-", deco2 = "=") => {
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`);
};
