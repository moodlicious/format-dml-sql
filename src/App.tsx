import { useEffect, useState } from "react";
import "./index.css";
import Editor, { DiffEditor, type EditorProps } from "@monaco-editor/react";
import { useDebounce, useLocalStorage } from "@uidotdev/usehooks";
import prettier from "prettier/standalone";
import SqlPlugin from "prettier-plugin-sql";
import { twMerge } from "tailwind-merge";

const MDL_TABLE_PREFIX = "__MDL_PREFIX__";
const MDL_TABLE_SUFFIX = "__MDL_SUFFIX__";

const normaliseTableNames = (value: string) => {
    return value.replace(
        /\{([0-9A-Za-z_]+)\}/g,
        `${MDL_TABLE_PREFIX}$1${MDL_TABLE_SUFFIX}`,
    );
};

const denormaliseTableNames = (value: string) => {
    return value
        .replaceAll(MDL_TABLE_PREFIX, "{")
        .replaceAll(MDL_TABLE_SUFFIX, "}");
};

const format = async (value: string) => {
    value = normaliseTableNames(value);
    value = await prettier
        .format(value, {
            parser: "sql",
            plugins: [SqlPlugin],
            dataTypeCase: "upper",
            functionCase: "upper",
            indentStyle: "tabularRight",
            keywordCase: "upper",
            linesBetweenQueries: 3,
            newlineBeforeSemicolon: true,
            paramTypes: '{ named: [":"] }',
        })
        .catch((error) =>
            error instanceof Error ? error.message : "Something went wrong",
        );
    value = denormaliseTableNames(value);
    return value;
};

const EDITOR_OPTIONS: EditorProps["options"] = {
    renderLineHighlight: "all",
    renderWhitespace: "all",
    fontSize: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
    fontLigatures: true,
    scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        useShadows: false,
    },
    cursorSmoothCaretAnimation: "on",
    cursorBlinking: "smooth",
    minimap: {
        enabled: true,
        showSlider: "mouseover",
        renderCharacters: false,
    },
};

export function App() {
    const [sql, setSQL] = useLocalStorage("sql", "");
    const [formatted, setFormatted] = useState("");
    const [formatting, setFormatting] = useState(false);
    const [diff, setDiff] = useState(false);

    const debouncedSQL = useDebounce(sql, 10);

    const onChange = async (value: string | undefined) => {
        value = value || "";
        setSQL(value);
    };

    useEffect(() => {
        setFormatting(true);
        format(debouncedSQL)
            .then(setFormatted)
            .finally(() => setFormatting(false));
    }, [debouncedSQL]);

    return (
        <div className="grid h-screen max-h-screen grid-rows-[auto_1fr] gap-2 p-2">
            <div className="flex items-center justify-between rounded bg-base-200 px-2 py-1">
                <div className="flex items-center gap-3">
                    <h1 className="font-semibold">DML SQL Formatter</h1>
                    <span
                        className={twMerge(
                            "loading loading-spinner loading-sm transition-opacity",
                            formatting ? "opacity-100" : "opacity-0",
                        )}
                    ></span>
                </div>

                <label className="label">
                    <input
                        checked={diff}
                        onChange={(e) => setDiff(e.target.checked)}
                        type="checkbox"
                        className="toggle"
                    />
                    Show Diff
                </label>
            </div>
            <div className="h-full">
                {!diff ? (
                    <div className="grid h-full grid-cols-2 gap-2">
                        <Editor
                            className="overflow-hidden rounded"
                            language="sql"
                            theme="vs-dark"
                            value={sql}
                            onChange={onChange}
                            options={EDITOR_OPTIONS}
                        />
                        <Editor
                            className="overflow-hidden rounded"
                            language="sql"
                            theme="vs-dark"
                            value={formatted}
                            options={{ readOnly: true, ...EDITOR_OPTIONS }}
                        />
                    </div>
                ) : (
                    <DiffEditor
                        className="overflow-hidden rounded"
                        language="sql"
                        theme="vs-dark"
                        original={sql}
                        modified={formatted}
                        keepCurrentOriginalModel
                        keepCurrentModifiedModel
                        options={EDITOR_OPTIONS}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
