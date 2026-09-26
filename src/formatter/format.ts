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

/**
 * A hacky fix to align case when statements.
 * AND and OR conditions are known to break formatting.
 * @todo support AND and OR keywords
 */
const fixCaseWhen = (value: string) => {
    const lines = value.split("\n");

    let fixing = false;
    let currentIndent = 0;
    let skipFirstWhenIndent = false;
    const fixKeywords = ["WHEN", "ELSE"];

    lines.forEach((line, i, lines) => {
        if (line.trimStart() === "CASE") {
            fixing = true;
            currentIndent = line.indexOf("CASE") + "CASE ".length;
            skipFirstWhenIndent = true;
            return;
        }

        if (line.trimStart().startsWith("END")) {
            fixing = false;
            return;
        }

        if (!fixing) return;

        const currentKeyword = fixKeywords.find((keyword) =>
            line.trimStart().startsWith(keyword),
        );
        if (!currentKeyword) return;

        if (skipFirstWhenIndent) {
            line = line.trimStart();
            skipFirstWhenIndent = false;
        } else {
            line = " ".repeat(currentIndent) + line.trimStart();
        }
        lines[i] = line;
        return;
    });

    return lines.join("\n").replaceAll("CASE\nWHEN", "CASE WHEN");
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
    value = fixCaseWhen(value);
    value = indentKeywords(value, ["AND", "OR"]);
    value = dedentStatements(value);
    return value;
};
