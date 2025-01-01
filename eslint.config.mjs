import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";
import eslint from '@eslint/js';


export default tseslint.config(
    {
        files: ["**/src/**/*.ts"],
        
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
        ],
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            
        }
    },
    {
      files: ["test/**"], // or any other pattern
      plugins: {
        vitest
      },
      rules: {
        ...vitest.configs.recommended.rules, // you can also use vitest.configs.all.rules to enable all rules
        "vitest/max-nested-describe": ["error", { "max": 3 }] // you can also modify rules' behavior using option like this
      },
    },
);