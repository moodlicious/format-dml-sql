import { format as prettier } from "prettier/standalone";
import SqlPlugin from "prettier-plugin-sql";

const MDL_TABLE_PREFIX = "__MDL_PREFIX__";
const MDL_TABLE_SUFFIX = "__MDL_SUFFIX__";

export const normaliseTableNames = (value: string) => {
    return value.replace(
        /\{([0-9A-Za-z_]+)\}/g,
        `${MDL_TABLE_PREFIX}$1${MDL_TABLE_SUFFIX}`,
    );
};

export const denormaliseTableNames = (value: string) => {
    return value
        .replaceAll(MDL_TABLE_PREFIX, "{")
        .replaceAll(MDL_TABLE_SUFFIX, "}");
};

export const format = async (value: string) => {
    value = normaliseTableNames(value);
    value = await prettier(value, {
        parser: "sql",
        plugins: [SqlPlugin],
        dataTypeCase: "upper",
        functionCase: "upper",
        indentStyle: "tabularRight",
        keywordCase: "upper",
        linesBetweenQueries: 3,
        newlineBeforeSemicolon: true,
        paramTypes: '{ named: [":"] }',
    }).catch((error) =>
        error instanceof Error ? error.message : "Something went wrong",
    );
    value = denormaliseTableNames(value);
    return value;
};
