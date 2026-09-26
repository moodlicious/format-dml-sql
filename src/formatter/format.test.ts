import { describe, expect, it } from "bun:test";
import {
    dedentStatements,
    denormaliseTableNames,
    format,
    indentKeywords,
    normaliseTableNames,
    STATEMENT_SEPARATOR,
} from "./format";

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

describe("indentKeywords", () => {
    it("should prepend spaces equal to keyword length (plus 1 space) for lines starting with a keyword", () => {
        const input = "SELECT * FROM users;\nWHERE id = 1;";
        const keywords = ["SELECT", "WHERE"];
        // "SELECT " length is 7, "WHERE " length is 6
        const expected = "       SELECT * FROM users;\n      WHERE id = 1;";

        expect(indentKeywords(input, keywords)).toBe(expected);
    });

    it("should respect leading whitespace when checking for keywords and preserve it", () => {
        const input = "  SELECT * FROM users;";
        const keywords = ["SELECT"];
        // Prepends 7 spaces before the original 2 spaces
        const expected = "         SELECT * FROM users;";

        expect(indentKeywords(input, keywords)).toBe(expected);
    });

    it("should ignore lines that do not start with any specified keyword", () => {
        const input = "FROM users\nORDER BY id;";
        const keywords = ["SELECT", "WHERE"];

        expect(indentKeywords(input, keywords)).toBe(input);
    });

    it("should match only the first matching keyword per line", () => {
        const input = "SELECT WHERE 1=1;";
        const keywords = ["SELECT", "WHERE"];
        // Only "SELECT " (length 7) triggers
        const expected = "       SELECT WHERE 1=1;";

        expect(indentKeywords(input, keywords)).toBe(expected);
    });

    it("should not match if the keyword is not followed by a space", () => {
        const input = "SELECTION * FROM users;";
        const keywords = ["SELECT"];

        expect(indentKeywords(input, keywords)).toBe(input);
    });

    it("should return empty string unmodified when given empty input", () => {
        expect(indentKeywords("", ["SELECT"])).toBe("");
    });
});

describe("dedentStatements", () => {
    it("should dedent multi-line queries relative to the minimum common indentation", () => {
        const input = `    SELECT *\n    FROM users\n      WHERE id = 1;`;
        const expected = `SELECT *\nFROM users\n  WHERE id = 1;`;

        expect(dedentStatements(input)).toBe(expected);
    });

    it("should treat queries separated by ';\\n\\n\\n' independently", () => {
        const input = [
            "    SELECT * FROM table1;",
            "        SELECT * FROM table2;",
        ].join(STATEMENT_SEPARATOR);

        const expected = [
            "SELECT * FROM table1;",
            "SELECT * FROM table2;",
        ].join(STATEMENT_SEPARATOR);

        expect(dedentStatements(input)).toBe(expected);
    });

    it("should handle empty lines within a query without breaking min space calculation", () => {
        const input = `    SELECT *\n\n    FROM users;`;
        // Line 2 is empty, so line.search(/\S|$/) returns 0, resulting in 0 dedent
        const expected = `    SELECT *\n\n    FROM users;`;

        expect(dedentStatements(input)).toBe(expected);
    });

    it("should handle single-line queries without modification", () => {
        const input = "SELECT * FROM users;";
        expect(dedentStatements(input)).toBe(input);
    });
});

describe("format", async () => {
    it.each([
        {
            complexity: "low",
            original: "SELECT * from {user}",
            formatted: `
SELECT *
  FROM {user}
    `,
        },
        {
            complexity: "medium",
            original: `SELECT u.firstname, u.lastname, u.username from {user} u
                            JOIN {course_completions} cc on cc.userid = u.id
                            join {course} c on cc.course = c.id`,
            formatted: `
SELECT u.firstname,
       u.lastname,
       u.username
  FROM {user} u
  JOIN {course_completions} cc ON cc.userid = u.id
  JOIN {course} c ON cc.course = c.id
    `,
        },
        {
            complexity: "high",
            original: `SELECT
    u.id AS user_id,
    u.username,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT r.id) AS review_count,
    COUNT(DISTINCT m.id) AS movie_count,
    ROUND(AVG(r.rating), 2) AS average_rating,
    SUM(r.likes) AS total_likes
FROM {users} u
JOIN {reviews} r
      ON r.user_id = u.id
JOIN {movies} m
      ON m.id = r.movie_id
LEFT JOIN {genres} g
      ON g.id = m.genre_id
             JOIN {fake123_table} ft ON u.id = ft.userid AND m.id = ft.movieid
WHERE
    u.status = 'active'
    AND u.deleted_at IS NULL
GROUP BY
    u.id,
    u.username,
    u.first_name,
    u.last_name
HAVING
    COUNT(DISTINCT r.id) >= 3
    AND AVG(r.rating) >= 6
ORDER BY
    average_rating DESC,
    total_likes DESC,
    u.username ASC`,
            formatted: `
   SELECT u.id AS user_id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(DISTINCT r.id) AS review_count,
          COUNT(DISTINCT m.id) AS movie_count,
          ROUND(AVG(r.rating), 2) AS average_rating,
          SUM(r.likes) AS total_likes
     FROM {users} u
     JOIN {reviews} r ON r.user_id = u.id
     JOIN {movies} m ON m.id = r.movie_id
LEFT JOIN {genres} g ON g.id = m.genre_id
     JOIN {fake123_table} ft ON u.id = ft.userid
          AND m.id = ft.movieid
    WHERE u.status = 'active'
          AND u.deleted_at IS NULL
 GROUP BY u.id,
          u.username,
          u.first_name,
          u.last_name
   HAVING COUNT(DISTINCT r.id) >= 3
          AND AVG(r.rating) >= 6
 ORDER BY average_rating DESC,
          total_likes DESC,
          u.username ASC
`,
        },
    ])(
        "should correct format SQLs into Moodle coding style format (complexity $complexity)",
        async ({ original, formatted }) => {
            expect(await format(original).then((f) => f.trim())).toEqual(
                formatted.trim(),
            );
        },
    );
});
