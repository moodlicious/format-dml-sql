export type IntersectionOfTypes<T, U> = {
    [K in keyof T as K extends keyof U
        ? T[K] extends U[K]
            ? U[K] extends T[K]
                ? K
                : never
            : never
        : never]: T[K];
};
