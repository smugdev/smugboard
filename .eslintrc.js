module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "eqeqeq": [
            "warn",
            "smart"
        ],
        "no-console": [
            "off"
        ],
        "brace-style": [
            "error",
            "1tbs"
        ],
        "curly": [
            "error",
            "all"
        ]
    }
};
