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
    SUM(r.likes) AS total_likes,
    CASE
        WHEN AVG(r.rating) >= 8 THEN 'Excellent'
        WHEN AVG(r.rating) >= 6 THEN 'Good'
        ELSE 'Average'
    END AS reviewer_category
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
          SUM(r.likes) AS total_likes,
          CASE WHEN AVG(r.rating) >= 8 THEN 'Excellent'
               WHEN AVG(r.rating) >= 6 THEN 'Good'
               ELSE 'Average'
          END AS reviewer_category
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
