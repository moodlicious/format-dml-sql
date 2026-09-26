import { describe, expect, it } from "bun:test";
import { denormaliseTableNames, format, normaliseTableNames } from "./format";

describe("normaliseTableNames", () => {
    it("should normalise one table name", () => {
        expect(normaliseTableNames("{foo}")).toEqual(
            "__MDL_PREFIX__foo__MDL_SUFFIX__",
        );
    });

    it("should normalise multiple table names", () => {
        expect(normaliseTableNames("{foo} {bar}")).toEqual(
            "__MDL_PREFIX__foo__MDL_SUFFIX__ __MDL_PREFIX__bar__MDL_SUFFIX__",
        );
    });

    it("should do nothing to strings without table names", () => {
        expect(normaliseTableNames("foo bar")).toEqual("foo bar");
    });

    it("should work with multiline strings", () => {
        expect(
            normaliseTableNames(`
                {foo}
                {bar}`),
        ).toEqual(`
                __MDL_PREFIX__foo__MDL_SUFFIX__
                __MDL_PREFIX__bar__MDL_SUFFIX__`);
    });
});

describe("denormaliseTableNames", () => {
    it("should denormalise prefixed and suffixed tablenames back to {name}", () => {
        expect(
            denormaliseTableNames("__MDL_PREFIX__foo__MDL_SUFFIX__"),
        ).toEqual("{foo}");
    });

    it("should denormalise multiple table names", () => {
        expect(
            denormaliseTableNames(
                "__MDL_PREFIX__foo__MDL_SUFFIX__ __MDL_PREFIX__bar__MDL_SUFFIX__",
            ),
        ).toEqual("{foo} {bar}");
    });

    it("should do nothing to strings without table names", () => {
        expect(denormaliseTableNames("foo bar")).toEqual("foo bar");
    });

    it("should work with multiline strings", () => {
        expect(
            denormaliseTableNames(`
                __MDL_PREFIX__foo__MDL_SUFFIX__
                __MDL_PREFIX__bar__MDL_SUFFIX__`),
        ).toEqual(`
                {foo}
                {bar}`);
    });
});

describe("denormaliseTableNames(normaliseTableNames())", () => {
    // it("should return the same string", () => {
    //     expect(fn('{abc}'))
    // });
    it.each([
        { value: "{abc}" },
        { value: "{abc} {foo}" },
        { value: "{abc}\n{foo}" },
        { value: "test{abc}ing" },
    ])(
        "denormaliseTableNames(normaliseTableNames('$value')) should return the same string",
        ({ value }) => {
            expect(denormaliseTableNames(normaliseTableNames(value))).toEqual(
                value,
            );
        },
    );
});

describe("format", async () => {
    it.each([
        {
            original: "SELECT * from {user}",
            formatted: `
   SELECT *
     FROM {user}
    `,
        },
    ])(
        "should correct format SQLs into Moodle coding style format",
        async ({ original, formatted }) => {
            expect(await format(original).then((f) => f.trim())).toEqual(
                formatted.trim(),
            );
        },
    );
});
