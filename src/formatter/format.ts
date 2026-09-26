import { format as prettier } from "prettier/standalone";
import SqlPlugin from "prettier-plugin-sql";

const MDL_TABLE_PREFIX = "__MDL_PREFIX__";
const MDL_TABLE_SUFFIX = "__MDL_SUFFIX__";
const LINES_BETWEEN_STATEMENTS = 2;
export const STATEMENT_SEPARATOR = `;${"\n".repeat(LINES_BETWEEN_STATEMENTS + 1)}`;

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

export const indentKeywords = (value: string, keywords: string[]) => {
    keywords = keywords.map((keyword) => `${keyword} `);
    return value
        .split("\n")
        .map((line) => {
            const trimmed = line.trimStart();
            for (const keyword of keywords) {
                if (!trimmed.startsWith(keyword)) continue;
                line = `${" ".repeat(keyword.length)}${line}`;
                break;
            }
            return line;
        })
        .join("\n");
};

export const dedentStatements = (value: string) => {
    const statements = value.trimEnd().split(STATEMENT_SEPARATOR);
    return statements
        .map((statement) => {
            const spaces = Math.min(
                ...statement.split("\n").map((line) => line.search(/\S|$/)),
            );
            return statement
                .split("\n")
                .map((line) => line.slice(spaces))
                .join("\n");
        })
        .join(STATEMENT_SEPARATOR);
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
        linesBetweenQueries: LINES_BETWEEN_STATEMENTS,
        paramTypes: '{ named: [":", "$"] }',
    }).catch((error) =>
        error instanceof Error ? error.message : "Something went wrong",
    );
    value = denormaliseTableNames(value);
    value = indentKeywords(value, ["AND", "OR"]);
    value = dedentStatements(value);
    return value;
};
