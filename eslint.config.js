import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
    js.configs.recommended,
    prettier,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "off"
        }
    }
];
