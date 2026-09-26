import { useEffect, useState } from "react";
import "./index.css";
import Editor, {
    type BeforeMount,
    DiffEditor,
    type DiffEditorProps,
    type EditorProps,
} from "@monaco-editor/react";
import { useDebounce, useLocalStorage } from "@uidotdev/usehooks";
import type { editor } from "monaco-editor/editor";
import prettier from "prettier/standalone";
import SqlPlugin from "prettier-plugin-sql";
import { twMerge } from "tailwind-merge";
import type { IntersectionOfTypes } from "./types";

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

const TRANSPARENT_THEME = "transparent";

type MonacoEditor = typeof editor;
const handleBeforeMount: BeforeMount = (monaco) => {
    const editor: MonacoEditor = monaco.editor;
    editor.defineTheme(TRANSPARENT_THEME, {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
            "editor.background": "#00000000",
            "editorGutter.background": "#00000000",
            "minimap.background": "#00000000",
        },
    });
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

const EDITOR_PROPS: IntersectionOfTypes<EditorProps, DiffEditorProps> = {
    className: "overflow-hidden rounded bg-base-200/50",
    language: "sql",
    theme: TRANSPARENT_THEME,
    options: EDITOR_OPTIONS,
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
        <div className="grid h-screen max-h-screen grid-rows-[auto_1fr] gap-2 bg-base-100 p-2">
            <div className="flex items-center justify-between rounded bg-base-200/50 px-2 py-1">
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
                            {...EDITOR_PROPS}
                            value={sql}
                            onChange={onChange}
                            beforeMount={handleBeforeMount}
                        />
                        <Editor
                            {...EDITOR_PROPS}
                            value={formatted}
                            options={{ readOnly: true, ...EDITOR_OPTIONS }}
                        />
                    </div>
                ) : (
                    <DiffEditor
                        {...EDITOR_PROPS}
                        original={sql}
                        modified={formatted}
                        keepCurrentOriginalModel
                        keepCurrentModifiedModel
                    />
                )}
            </div>
        </div>
    );
}

export default App;
